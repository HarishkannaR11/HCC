import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { ageOn, primaryMapping } from "@/lib/hcc/resolve";
import type { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Client = Awaited<ReturnType<typeof createClient>>;
export type ChartRow = Database["public"]["Tables"]["charts"]["Row"];

/** The chart fields that decide which HCC a code lands in. */
export type ChartPatient = Pick<ChartRow, "id" | "payment_year" | "patient_dob" | "patient_sex" | "encounter_date" | "status">;

export interface ResolvedCode {
  description: string;
  hccCategoryId: number | null;
}

/**
 * Look a code up in the chart's payment year and resolve its HCC for the
 * chart's synthetic patient (CMS age/sex edits applied). Returns a
 * human-readable error for codes that do not exist or are headers; the
 * validate_chart_code trigger enforces the same rule in Postgres.
 */
export async function resolveCodeForChart(
  supabase: Client,
  chart: ChartPatient,
  code: string,
): Promise<{ ok: true; value: ResolvedCode } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("icd10_codes")
    .select("description, is_billable, icd_hcc_map(age_edit, sex_edit, mce_age_condition, hcc_categories(id, hcc_code))")
    .eq("payment_year", chart.payment_year)
    .eq("code", code)
    .maybeSingle();

  if (error) return { ok: false, error: describeDbError(error) };
  if (!data) return { ok: false, error: `${code} is not an ICD-10-CM code in PY${chart.payment_year}.` };
  if (!data.is_billable) return { ok: false, error: `${code} is a category header. Choose a billable code.` };

  const patient = { age: ageOn(chart.patient_dob, chart.encounter_date), sex: chart.patient_sex };
  const primary = primaryMapping(
    data.icd_hcc_map.map((m) => ({
      hccCode: m.hcc_categories.hcc_code,
      hccCategoryId: m.hcc_categories.id,
      ageEdit: m.age_edit,
      sexEdit: m.sex_edit,
      mceAgeCondition: m.mce_age_condition,
    })),
    patient,
  );
  return { ok: true, value: { description: data.description, hccCategoryId: primary?.hccCategoryId ?? null } };
}

export async function loadChartPatient(supabase: Client, chartId: string): Promise<ChartPatient | null> {
  const { data } = await supabase
    .from("charts")
    .select("id, payment_year, patient_dob, patient_sex, encounter_date, status")
    .eq("id", chartId)
    .maybeSingle();
  return data;
}

/**
 * Re-resolve every answer key HCC after a change to the patient or the year
 * (an age-split code can move between HCCs when the date of birth changes).
 */
export async function refreshKeyHccs(supabase: Client, chart: ChartPatient): Promise<string | null> {
  const { data: items, error } = await supabase
    .from("answer_key_items")
    .select("id, icd10_code, hcc_category_id")
    .eq("chart_id", chart.id);
  if (error) return describeDbError(error);

  for (const item of items ?? []) {
    const resolved = await resolveCodeForChart(supabase, chart, item.icd10_code);
    if (!resolved.ok) return resolved.error;
    if (resolved.value.hccCategoryId === item.hcc_category_id) continue;
    const { error: updateError } = await supabase
      .from("answer_key_items")
      .update({ hcc_category_id: resolved.value.hccCategoryId })
      .eq("id", item.id);
    if (updateError) return describeDbError(updateError);
  }
  return null;
}

const CONSTRAINT_MESSAGES: Record<string, string> = {
  charts_synthetic_mrn: "MRNs are synthetic and must look like SYN-123456.",
  charts_must_be_synthetic: "Charts must be marked synthetic.",
  charts_dob_before_encounter: "Date of birth must be before the encounter.",
  answer_key_items_chart_id_icd10_code_key: "That code is already on the answer key.",
  distractors_chart_id_icd10_code_key: "That code is already a distractor.",
  chart_sections_chart_id_section_type_key: "That section already exists.",
};

/**
 * Database errors -> messages an author can act on. Messages raised by our
 * own triggers are written for humans and passed through; anything else is
 * logged server-side and replaced with a generic line.
 */
export function describeDbError(error: PostgrestError): string {
  for (const [constraint, message] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (error.message.includes(constraint)) return message;
  }
  if (error.code === "23503") {
    return "This chart has learner attempts, so it cannot be deleted. Unpublish it instead.";
  }
  if (error.code === "42501") return "You are not allowed to do that.";
  // check_violation / unique_violation raised by validate_chart_code or
  // enforce_publishable carry an author-facing message.
  if ((error.code === "23514" || error.code === "23505") && !/violates|duplicate key/.test(error.message)) {
    return error.message;
  }
  console.error("[admin] database error", error);
  return "Something went wrong saving that. Try again.";
}
