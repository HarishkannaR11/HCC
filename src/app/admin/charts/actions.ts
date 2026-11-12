"use server";

/**
 * Admin chart editor mutations.
 *
 * Every action: (1) re-checks the admin role (layouts are not a security
 * boundary for actions), (2) parses its input with zod, (3) writes through the
 * user's own Supabase client so RLS enforces admin-only access a second time.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth/session";
import { describeDbError, loadChartPatient, refreshKeyHccs, resolveCodeForChart } from "@/lib/charts/admin-data";
import { SECTION_ORDER } from "@/lib/charts/constants";
import {
  chartMetaSchema,
  chartRow,
  distractorSchema,
  excerptsNotInChart,
  fieldErrors,
  formFields,
  keyItemSchema,
  sectionsSchema,
  uuid,
} from "@/lib/charts/schemas";
import { createClient } from "@/lib/supabase/server";

export interface ActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Changes on every successful save so forms can reset. */
  savedAt?: number;
}

const NOT_AUTHORIZED: ActionState = { error: "You are not allowed to do that." };
const INVALID: ActionState = { error: "That request was malformed. Reload the page and try again." };

async function adminContext() {
  const admin = await getAdminOrNull();
  if (!admin) return null;
  return { admin, supabase: await createClient() };
}

function chartPaths(chartId: string): void {
  revalidatePath("/admin/charts");
  revalidatePath(`/admin/charts/${chartId}`);
  revalidatePath("/practice");
}

async function isActiveYear(supabase: Awaited<ReturnType<typeof createClient>>, year: number): Promise<boolean> {
  const { data } = await supabase.from("payment_years").select("year").eq("year", year).eq("is_active", true).maybeSingle();
  return Boolean(data);
}

// --- chart metadata ---------------------------------------------------------

export async function createChart(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx) return NOT_AUTHORIZED;

  const parsed = chartMetaSchema.safeParse(formFields(formData));
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  if (!(await isActiveYear(ctx.supabase, parsed.data.payment_year))) {
    return { error: "Choose an active payment year.", fieldErrors: { payment_year: "Not an active payment year." } };
  }

  const row = chartRow(parsed.data);
  const { data, error } = await ctx.supabase
    .from("charts")
    .insert({ ...row, is_synthetic: true, status: "draft", created_by: ctx.admin.id })
    .select("id")
    .single();
  if (error) return { error: describeDbError(error) };

  revalidatePath("/admin/charts");
  redirect(`/admin/charts/${data.id}`);
}

export async function updateChart(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx) return NOT_AUTHORIZED;

  const chartId = uuid.safeParse(formData.get("chart_id"));
  if (!chartId.success) return INVALID;
  const parsed = chartMetaSchema.safeParse(formFields(formData));
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const current = await loadChartPatient(ctx.supabase, chartId.data);
  if (!current) return { error: "That chart no longer exists." };

  if (parsed.data.payment_year !== current.payment_year) {
    if (!(await isActiveYear(ctx.supabase, parsed.data.payment_year))) {
      return { error: "Choose an active payment year.", fieldErrors: { payment_year: "Not an active payment year." } };
    }
    const { count } = await ctx.supabase
      .from("answer_key_items")
      .select("id", { count: "exact", head: true })
      .eq("chart_id", chartId.data);
    if (count) {
      return {
        error: "Codes are validated against the chart's payment year. Remove the answer key codes before changing it.",
        fieldErrors: { payment_year: "Locked while the chart has answer key codes." },
      };
    }
  }

  const row = chartRow(parsed.data);
  const { error } = await ctx.supabase.from("charts").update({ ...row, is_synthetic: true }).eq("id", chartId.data);
  if (error) return { error: describeDbError(error) };

  // A new date of birth or sex can move an age/sex-split code to another HCC.
  const refreshError = await refreshKeyHccs(ctx.supabase, { ...current, ...row, id: chartId.data });
  if (refreshError) return { error: refreshError };

  chartPaths(chartId.data);
  return { ok: true, savedAt: Date.now() };
}

// --- sections ---------------------------------------------------------------

export async function saveSections(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx) return NOT_AUTHORIZED;

  const chartId = uuid.safeParse(formData.get("chart_id"));
  if (!chartId.success) return INVALID;
  const parsed = sectionsSchema.safeParse(formFields(formData));
  if (!parsed.success) return { error: "A section is too long.", fieldErrors: fieldErrors(parsed.error) };

  const chart = await loadChartPatient(ctx.supabase, chartId.data);
  if (!chart) return { error: "That chart no longer exists." };
  if (chart.status === "published" && !parsed.data.assessment_plan) {
    return {
      error: "A published chart needs its Assessment & plan. Unpublish it first to remove that section.",
      fieldErrors: { assessment_plan: "Required while published." },
    };
  }

  const keep = SECTION_ORDER.flatMap((type, sortOrder) => {
    const content = parsed.data[type];
    return content ? [{ chart_id: chartId.data, section_type: type, content, sort_order: sortOrder }] : [];
  });
  const remove = SECTION_ORDER.filter((type) => !parsed.data[type]);

  if (keep.length > 0) {
    const { error } = await ctx.supabase.from("chart_sections").upsert(keep, { onConflict: "chart_id,section_type" });
    if (error) return { error: describeDbError(error) };
  }
  if (remove.length > 0) {
    const { error } = await ctx.supabase
      .from("chart_sections")
      .delete()
      .eq("chart_id", chartId.data)
      .in("section_type", remove);
    if (error) return { error: describeDbError(error) };
  }

  chartPaths(chartId.data);
  return { ok: true, savedAt: Date.now() };
}

// --- answer key -------------------------------------------------------------

export async function saveKeyItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx) return NOT_AUTHORIZED;

  const chartId = uuid.safeParse(formData.get("chart_id"));
  const itemId = formData.get("item_id") ? uuid.safeParse(formData.get("item_id")) : null;
  if (!chartId.success || (itemId && !itemId.success)) return INVALID;

  const parsed = keyItemSchema.safeParse(formFields(formData));
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const chart = await loadChartPatient(ctx.supabase, chartId.data);
  if (!chart) return { error: "That chart no longer exists." };

  const resolved = await resolveCodeForChart(ctx.supabase, chart, parsed.data.icd10_code);
  if (!resolved.ok) return { error: resolved.error, fieldErrors: { icd10_code: "Check this code." } };

  if (itemId && chart.status === "published" && !parsed.data.is_required) {
    const blocked = await wouldLeaveNoRequiredCode(ctx.supabase, chart.id, itemId.data);
    if (blocked) return { error: blocked };
  }

  const row = { ...parsed.data, chart_id: chart.id, hcc_category_id: resolved.value.hccCategoryId };
  const { error } = itemId
    ? await ctx.supabase.from("answer_key_items").update(row).eq("id", itemId.data).eq("chart_id", chart.id)
    : await ctx.supabase.from("answer_key_items").insert(row);
  if (error) return { error: describeDbError(error) };

  chartPaths(chart.id);
  return { ok: true, savedAt: Date.now() };
}

export async function deleteKeyItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx) return NOT_AUTHORIZED;

  const chartId = uuid.safeParse(formData.get("chart_id"));
  const itemId = uuid.safeParse(formData.get("item_id"));
  if (!chartId.success || !itemId.success) return INVALID;

  const chart = await loadChartPatient(ctx.supabase, chartId.data);
  if (!chart) return { error: "That chart no longer exists." };
  if (chart.status === "published") {
    const blocked = await wouldLeaveNoRequiredCode(ctx.supabase, chart.id, itemId.data);
    if (blocked) return { error: blocked };
  }

  const { error } = await ctx.supabase.from("answer_key_items").delete().eq("id", itemId.data).eq("chart_id", chart.id);
  if (error) return { error: describeDbError(error) };

  chartPaths(chart.id);
  return { ok: true, savedAt: Date.now() };
}

async function wouldLeaveNoRequiredCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chartId: string,
  changingItemId: string,
): Promise<string | null> {
  const { count } = await supabase
    .from("answer_key_items")
    .select("id", { count: "exact", head: true })
    .eq("chart_id", chartId)
    .eq("is_required", true)
    .neq("id", changingItemId);
  return count ? null : "A published chart needs at least one required code. Unpublish it first.";
}

// --- distractors ------------------------------------------------------------

export async function saveDistractor(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx) return NOT_AUTHORIZED;

  const chartId = uuid.safeParse(formData.get("chart_id"));
  const itemId = formData.get("item_id") ? uuid.safeParse(formData.get("item_id")) : null;
  if (!chartId.success || (itemId && !itemId.success)) return INVALID;

  const parsed = distractorSchema.safeParse(formFields(formData));
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const chart = await loadChartPatient(ctx.supabase, chartId.data);
  if (!chart) return { error: "That chart no longer exists." };
  const resolved = await resolveCodeForChart(ctx.supabase, chart, parsed.data.icd10_code);
  if (!resolved.ok) return { error: resolved.error, fieldErrors: { icd10_code: "Check this code." } };

  const row = { ...parsed.data, chart_id: chart.id };
  const { error } = itemId
    ? await ctx.supabase.from("distractors").update(row).eq("id", itemId.data).eq("chart_id", chart.id)
    : await ctx.supabase.from("distractors").insert(row);
  if (error) return { error: describeDbError(error) };

  chartPaths(chart.id);
  return { ok: true, savedAt: Date.now() };
}

export async function deleteDistractor(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx) return NOT_AUTHORIZED;

  const chartId = uuid.safeParse(formData.get("chart_id"));
  const itemId = uuid.safeParse(formData.get("item_id"));
  if (!chartId.success || !itemId.success) return INVALID;

  const { error } = await ctx.supabase.from("distractors").delete().eq("id", itemId.data).eq("chart_id", chartId.data);
  if (error) return { error: describeDbError(error) };

  chartPaths(chartId.data);
  return { ok: true, savedAt: Date.now() };
}

// --- lifecycle --------------------------------------------------------------

const statusSchema = z.enum(["draft", "published"]);

export async function setChartStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx) return NOT_AUTHORIZED;

  const chartId = uuid.safeParse(formData.get("chart_id"));
  const status = statusSchema.safeParse(formData.get("status"));
  if (!chartId.success || !status.success) return INVALID;

  if (status.data === "published") {
    // The enforce_publishable trigger checks for a required code and an
    // Assessment & plan. Excerpts must also be verbatim chart text, because
    // Phase 2 compares them with what the learner highlights.
    const [{ data: sections }, { data: items }] = await Promise.all([
      ctx.supabase.from("chart_sections").select("content").eq("chart_id", chartId.data),
      ctx.supabase.from("answer_key_items").select("icd10_code, supporting_excerpt").eq("chart_id", chartId.data),
    ]);
    const missing = excerptsNotInChart(
      (items ?? []).map((i) => i.supporting_excerpt),
      (sections ?? []).map((s) => s.content),
    );
    if (missing.length > 0) {
      const codes = (items ?? []).filter((i) => i.supporting_excerpt && missing.includes(i.supporting_excerpt));
      return {
        error: `Supporting excerpts must be copied exactly from the chart. Check: ${codes.map((c) => c.icd10_code).join(", ")}.`,
      };
    }
  }

  const { error } = await ctx.supabase.from("charts").update({ status: status.data }).eq("id", chartId.data);
  if (error) return { error: describeDbError(error) };

  chartPaths(chartId.data);
  return { ok: true, savedAt: Date.now() };
}

export async function deleteChart(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx) return NOT_AUTHORIZED;

  const chartId = uuid.safeParse(formData.get("chart_id"));
  if (!chartId.success) return INVALID;

  const { error } = await ctx.supabase.from("charts").delete().eq("id", chartId.data);
  if (error) return { error: describeDbError(error) };

  revalidatePath("/admin/charts");
  revalidatePath("/practice");
  redirect("/admin/charts");
}
