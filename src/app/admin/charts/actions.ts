"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { authorizeAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ageForPaymentYear, serviceYearFor } from "@/lib/hcc/age";
import { primaryHccCategoryId } from "@/lib/charts/derive-hcc";
import { lookupCodes } from "@/lib/charts/code-lookup";
import { chartReadiness, isPublishable } from "@/lib/charts/readiness";
import {
  answerKeyItemCreateSchema,
  answerKeyItemUpdateSchema,
  chartDetailsSchema,
  chartIdInput,
  chartStatusSchema,
  distractorCreateSchema,
  distractorUpdateSchema,
  rowDeleteSchema,
  sectionCreateSchema,
  sectionMoveSchema,
  sectionUpdateSchema,
} from "@/lib/charts/schemas";
import type { PatientSex, SectionType, TrapType } from "@/lib/charts/constants";
import { errorState, formObject, successState, validationError, type ActionState } from "@/lib/forms";

/**
 * Chart-admin mutations. Each one is a public POST endpoint, so each one:
 *   1. re-checks the admin role (render-time gating is not a boundary),
 *   2. validates its input with zod,
 *   3. writes through the admin's own session, so RLS enforces the role a
 *      second time even if step 1 were ever wrong.
 */

const NOT_ADMIN = errorState("Only admins can edit charts.");

type Db = Awaited<ReturnType<typeof createClient>>;

/** Postgres errors -> messages an editor can act on. Trigger messages are already written for humans. */
function dbError(error: PostgrestError): ActionState {
  if (error.code === "23505") {
    if (error.message.includes("answer_key_items_code_unique")) return errorState("That code is already on the answer key.");
    if (error.message.includes("distractors_code_unique")) return errorState("That code is already a distractor.");
    return errorState(error.message);
  }
  if (error.code === "23514" || error.code === "P0001") return errorState(error.message);
  if (error.code === "42501") return NOT_ADMIN;
  return errorState(`Could not save: ${error.message}`);
}

function refresh(chartId: string): void {
  revalidatePath(`/admin/charts/${chartId}`);
  revalidatePath("/admin/charts");
  revalidatePath("/practice");
}

async function chartPatient(db: Db, chartId: string) {
  const { data } = await db
    .from("charts")
    .select("payment_year, patient_dob, patient_sex")
    .eq("id", chartId)
    .maybeSingle();
  if (!data) return null;
  return {
    paymentYear: data.payment_year,
    patient: { age: ageForPaymentYear(data.patient_dob, data.payment_year), sex: data.patient_sex },
  };
}

/** The HCC to label a key code with, for this chart's patient. */
async function hccFor(db: Db, paymentYear: number, patient: { age: number; sex: PatientSex }, code: string) {
  const info = (await lookupCodes(db, paymentYear, [code])).get(code);
  return info ? primaryHccCategoryId(info.mappings, patient) : null;
}

// --- charts -----------------------------------------------------------------

export async function createChart(): Promise<void> {
  if (!(await authorizeAdmin())) redirect("/login");
  const db = await createClient();

  const { data: year } = await db
    .from("payment_years")
    .select("year")
    .eq("is_active", true)
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!year) throw new Error("No active payment year. Load reference data first (npm run data:load).");

  // Obvious placeholders, all synthetic, so the editor opens on a valid row.
  const { data, error } = await db
    .from("charts")
    .insert({
      title: "Untitled chart",
      specialty: "Internal Medicine",
      difficulty: 1,
      payment_year: year.year,
      encounter_date: `${serviceYearFor(year.year)}-06-15`,
      patient_name: "Synthetic Patient",
      patient_dob: "1950-01-01",
      patient_sex: "female",
      patient_mrn: `SYN-${Math.floor(100000 + Math.random() * 900000)}`,
      provider_name: "Synthetic Provider, MD",
      facility_name: "Synthetic Clinic",
      is_synthetic: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not create chart: ${error.message}`);

  revalidatePath("/admin/charts");
  redirect(`/admin/charts/${data.id}`);
}

export async function updateChartDetails(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await authorizeAdmin())) return NOT_ADMIN;
  const parsed = chartDetailsSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const v = parsed.data;
  const db = await createClient();

  const { error } = await db
    .from("charts")
    .update({
      title: v.title,
      specialty: v.specialty,
      difficulty: v.difficulty,
      payment_year: v.paymentYear,
      encounter_date: v.encounterDate,
      patient_name: v.patientName,
      patient_dob: v.patientDob,
      patient_sex: v.patientSex,
      patient_mrn: v.patientMrn,
      provider_name: v.providerName,
      facility_name: v.facilityName,
      is_synthetic: true,
    })
    .eq("id", v.chartId);
  if (error) return dbError(error);

  // Age and sex decide which HCC an edited code lands in; relabel the key.
  const ctx = await chartPatient(db, v.chartId);
  const { data: items } = await db.from("answer_key_items").select("id, icd10_code").eq("chart_id", v.chartId);
  if (ctx && items?.length) {
    const info = await lookupCodes(db, ctx.paymentYear, items.map((i) => i.icd10_code));
    for (const item of items) {
      const mappings = info.get(item.icd10_code)?.mappings ?? [];
      const { error: relabelError } = await db
        .from("answer_key_items")
        .update({ hcc_category_id: primaryHccCategoryId(mappings, ctx.patient) })
        .eq("id", item.id);
      if (relabelError) return dbError(relabelError);
    }
  }

  refresh(v.chartId);
  return successState("Chart details saved.");
}

export async function setChartStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await authorizeAdmin())) return NOT_ADMIN;
  const parsed = chartStatusSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const { chartId, status } = parsed.data;
  const db = await createClient();

  if (status === "published") {
    const [{ data: chart }, { data: sections }, { data: key }, { data: distractors }] = await Promise.all([
      db.from("charts").select("is_synthetic, payment_year, encounter_date").eq("id", chartId).maybeSingle(),
      db.from("chart_sections").select("section_type, content").eq("chart_id", chartId),
      db.from("answer_key_items").select("icd10_code, is_required, supporting_excerpt").eq("chart_id", chartId),
      db.from("distractors").select("icd10_code").eq("chart_id", chartId),
    ]);
    if (!chart) return errorState("Chart not found.");

    const checks = chartReadiness({
      isSynthetic: chart.is_synthetic,
      paymentYear: chart.payment_year,
      encounterDate: chart.encounter_date,
      sections: (sections ?? []).map((s) => ({ sectionType: s.section_type, content: s.content })),
      answerKey: (key ?? []).map((k) => ({
        icd10Code: k.icd10_code,
        isRequired: k.is_required,
        supportingExcerpt: k.supporting_excerpt,
      })),
      distractors: (distractors ?? []).map((d) => ({ icd10Code: d.icd10_code })),
    });
    if (!isPublishable(checks)) {
      const failing = checks.filter((c) => c.blocking && !c.ok).map((c) => c.label.toLowerCase());
      return errorState(`Not ready to publish: ${failing.join("; ")}.`);
    }
  }

  const { error } = await db.from("charts").update({ status }).eq("id", chartId);
  if (error) return dbError(error);
  refresh(chartId);
  return successState(status === "published" ? "Published. Learners can see this chart." : "Moved back to draft.");
}

export async function deleteChart(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await authorizeAdmin())) return NOT_ADMIN;
  const parsed = chartIdInput.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const db = await createClient();

  const { error } = await db.from("charts").delete().eq("id", parsed.data.chartId);
  if (error) return dbError(error);
  revalidatePath("/admin/charts");
  revalidatePath("/practice");
  redirect("/admin/charts");
}

// --- sections ---------------------------------------------------------------

export async function addSection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await authorizeAdmin())) return NOT_ADMIN;
  const parsed = sectionCreateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const v = parsed.data;
  const db = await createClient();

  const { data: last } = await db
    .from("chart_sections")
    .select("sort_order")
    .eq("chart_id", v.chartId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await db.from("chart_sections").insert({
    chart_id: v.chartId,
    section_type: v.sectionType as SectionType,
    content: v.content,
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) return dbError(error);
  refresh(v.chartId);
  return successState("Section added.");
}

export async function updateSection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await authorizeAdmin())) return NOT_ADMIN;
  const parsed = sectionUpdateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const v = parsed.data;
  const db = await createClient();

  const { error } = await db
    .from("chart_sections")
    .update({ section_type: v.sectionType as SectionType, content: v.content })
    .eq("id", v.sectionId)
    .eq("chart_id", v.chartId);
  if (error) return dbError(error);
  refresh(v.chartId);
  return successState("Section saved.");
}

export async function moveSection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await authorizeAdmin())) return NOT_ADMIN;
  const parsed = sectionMoveSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const v = parsed.data;
  const db = await createClient();

  const { data: sections, error } = await db
    .from("chart_sections")
    .select("id, sort_order")
    .eq("chart_id", v.chartId)
    .order("sort_order");
  if (error) return dbError(error);

  const index = sections.findIndex((s) => s.id === v.sectionId);
  const swapWith = v.direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= sections.length) return successState("Already at the edge.");

  // Renumber the whole list so the swap never collides with the unique
  // (chart_id, sort_order) constraint mid-way: park every row at a high
  // offset, then write the final positions.
  const order = sections.map((s) => s.id);
  [order[index], order[swapWith]] = [order[swapWith], order[index]];
  const offset = sections.length + 1000;
  for (const [position, id] of order.entries()) {
    const { error: parkError } = await db.from("chart_sections").update({ sort_order: offset + position }).eq("id", id);
    if (parkError) return dbError(parkError);
  }
  for (const [position, id] of order.entries()) {
    const { error: placeError } = await db.from("chart_sections").update({ sort_order: position }).eq("id", id);
    if (placeError) return dbError(placeError);
  }

  refresh(v.chartId);
  return successState("Section moved.");
}

export async function deleteSection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await authorizeAdmin())) return NOT_ADMIN;
  const parsed = rowDeleteSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const db = await createClient();

  const { error } = await db
    .from("chart_sections")
    .delete()
    .eq("id", parsed.data.rowId)
    .eq("chart_id", parsed.data.chartId);
  if (error) return dbError(error);
  refresh(parsed.data.chartId);
  return successState("Section deleted.");
}

// --- answer key -------------------------------------------------------------

export async function addAnswerKeyItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await authorizeAdmin())) return NOT_ADMIN;
  const parsed = answerKeyItemCreateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const v = parsed.data;
  const db = await createClient();

  const ctx = await chartPatient(db, v.chartId);
  if (!ctx) return errorState("Chart not found.");

  const { error } = await db.from("answer_key_items").insert({
    chart_id: v.chartId,
    icd10_code: v.icd10Code,
    hcc_category_id: await hccFor(db, ctx.paymentYear, ctx.patient, v.icd10Code),
    is_required: v.isRequired,
    supporting_excerpt: v.supportingExcerpt,
    rationale: v.rationale,
    trap_type: v.trapType as TrapType,
  });
  if (error) return dbError(error);
  refresh(v.chartId);
  return successState(`${v.icd10Code} added to the answer key.`);
}

export async function updateAnswerKeyItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await authorizeAdmin())) return NOT_ADMIN;
  const parsed = answerKeyItemUpdateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const v = parsed.data;
  const db = await createClient();

  const { error } = await db
    .from("answer_key_items")
    .update({
      is_required: v.isRequired,
      supporting_excerpt: v.supportingExcerpt,
      rationale: v.rationale,
      trap_type: v.trapType as TrapType,
    })
    .eq("id", v.itemId)
    .eq("chart_id", v.chartId);
  if (error) return dbError(error);
  refresh(v.chartId);
  return successState("Answer key item saved.");
}

export async function deleteAnswerKeyItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await authorizeAdmin())) return NOT_ADMIN;
  const parsed = rowDeleteSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const db = await createClient();

  const { error } = await db
    .from("answer_key_items")
    .delete()
    .eq("id", parsed.data.rowId)
    .eq("chart_id", parsed.data.chartId);
  if (error) return dbError(error);
  refresh(parsed.data.chartId);
  return successState("Removed from the answer key.");
}

// --- distractors ------------------------------------------------------------

export async function addDistractor(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await authorizeAdmin())) return NOT_ADMIN;
  const parsed = distractorCreateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const v = parsed.data;
  const db = await createClient();

  const { error } = await db.from("distractors").insert({
    chart_id: v.chartId,
    icd10_code: v.icd10Code,
    why_wrong: v.whyWrong,
    trap_type: v.trapType as TrapType,
  });
  if (error) return dbError(error);
  refresh(v.chartId);
  return successState(`${v.icd10Code} added as a distractor.`);
}

export async function updateDistractor(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await authorizeAdmin())) return NOT_ADMIN;
  const parsed = distractorUpdateSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const v = parsed.data;
  const db = await createClient();

  const { error } = await db
    .from("distractors")
    .update({ why_wrong: v.whyWrong, trap_type: v.trapType as TrapType })
    .eq("id", v.distractorId)
    .eq("chart_id", v.chartId);
  if (error) return dbError(error);
  refresh(v.chartId);
  return successState("Distractor saved.");
}

export async function deleteDistractor(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await authorizeAdmin())) return NOT_ADMIN;
  const parsed = rowDeleteSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const db = await createClient();

  const { error } = await db
    .from("distractors")
    .delete()
    .eq("id", parsed.data.rowId)
    .eq("chart_id", parsed.data.chartId);
  if (error) return dbError(error);
  refresh(parsed.data.chartId);
  return successState("Distractor removed.");
}
