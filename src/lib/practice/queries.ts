import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { SECTION_LABELS, SECTION_ORDER } from "@/lib/charts/constants";
import { ageOn } from "@/lib/hcc/resolve";
import type { CodeMappingRef, HierarchyRef } from "@/lib/scoring/reference";
import type { CodeOption, EncoderChart } from "./types";

type Db = SupabaseClient<Database>;

const hccNumber = (hccCode: string) => Number(hccCode.replace(/^HCC/, ""));

/**
 * A published chart shaped for the encoder. Reads through the learner's own
 * session, so RLS decides visibility; columns are listed explicitly and the
 * answer key is never touched.
 */
export async function loadEncoderChart(db: Db, chartId: string): Promise<EncoderChart | null> {
  const [{ data: chart }, { data: sections }] = await Promise.all([
    db
      .from("charts")
      .select(
        "id, title, specialty, difficulty, payment_year, encounter_date, patient_name, patient_dob, patient_sex, patient_mrn, provider_name, facility_name",
      )
      .eq("id", chartId)
      .eq("status", "published")
      .maybeSingle(),
    db.from("chart_sections").select("id, section_type, content, sort_order").eq("chart_id", chartId).order("sort_order"),
  ]);
  if (!chart) return null;

  const order = (type: string) => SECTION_ORDER.indexOf(type as (typeof SECTION_ORDER)[number]);
  return {
    id: chart.id,
    title: chart.title,
    specialty: chart.specialty,
    difficulty: chart.difficulty,
    paymentYear: chart.payment_year,
    encounterDate: chart.encounter_date,
    patient: {
      name: chart.patient_name,
      dob: chart.patient_dob,
      sex: chart.patient_sex,
      mrn: chart.patient_mrn,
      age: ageOn(chart.patient_dob, chart.encounter_date),
    },
    providerName: chart.provider_name,
    facilityName: chart.facility_name,
    sections: (sections ?? [])
      .sort((a, b) => a.sort_order - b.sort_order || order(a.section_type) - order(b.section_type))
      .map((s) => ({
        id: s.id,
        type: s.section_type,
        label: SECTION_LABELS[s.section_type],
        paragraphs: s.content
          .split(/\n+/)
          .map((text) => text.trim())
          .filter(Boolean)
          .map((text, index) => ({ id: `${s.id}.${index}`, text })),
      })),
  };
}

/** Every HCC and suppression pair for a payment year — public reference data. */
export async function loadHierarchy(db: Db, paymentYear: number): Promise<HierarchyRef> {
  const [{ data: year }, { data: categories, error: catError }, { data: pairs, error: pairError }] = await Promise.all([
    db.from("payment_years").select("hcc_model_version").eq("year", paymentYear).maybeSingle(),
    db
      .from("hcc_categories")
      .select("id, hcc_code, label, hierarchy_group, raf_community_nondual")
      .eq("payment_year", paymentYear),
    db.from("hcc_hierarchy").select("parent_hcc_id, child_hcc_id").eq("payment_year", paymentYear),
  ]);
  if (catError) throw new Error(`Loading HCC categories failed: ${catError.message}`);
  if (pairError) throw new Error(`Loading the HCC hierarchy failed: ${pairError.message}`);

  const numberById = new Map(categories.map((c) => [c.id, hccNumber(c.hcc_code)]));
  if (!year) throw new Error(`Payment year ${paymentYear} is not loaded.`);
  return {
    paymentYear,
    modelVersion: year.hcc_model_version,
    hccs: categories
      .map((c) => ({
        number: hccNumber(c.hcc_code),
        code: c.hcc_code,
        label: c.label,
        group: c.hierarchy_group,
        raf: Number(c.raf_community_nondual),
      }))
      .sort((a, b) => a.number - b.number),
    suppressions: pairs.map((p) => [numberById.get(p.parent_hcc_id)!, numberById.get(p.child_hcc_id)!]),
  };
}

/** Descriptions, billability and HCC mappings (with CMS edits) for a set of codes in one year. */
export async function lookupCodes(
  db: Db,
  paymentYear: number,
  codes: readonly string[],
): Promise<Map<string, CodeOption & { isBillable: boolean }>> {
  const unique = [...new Set(codes)];
  const out = new Map<string, CodeOption & { isBillable: boolean }>();
  if (unique.length === 0) return out;

  const { data, error } = await db
    .from("icd10_codes")
    .select("code, description, is_billable, icd_hcc_map(age_edit, sex_edit, mce_age_condition, hcc_categories(hcc_code, label))")
    .eq("payment_year", paymentYear)
    .in("code", unique);
  if (error) throw new Error(`Code lookup failed: ${error.message}`);

  for (const row of data) {
    out.set(row.code, {
      code: row.code,
      description: row.description,
      isBillable: row.is_billable,
      hccs: row.icd_hcc_map
        .map((m) => ({
          hcc: hccNumber(m.hcc_categories.hcc_code),
          code: m.hcc_categories.hcc_code,
          label: m.hcc_categories.label,
          ageEdit: m.age_edit,
          sexEdit: m.sex_edit,
          mceAgeCondition: m.mce_age_condition,
        }))
        .sort((a, b) => a.hcc - b.hcc),
    });
  }
  return out;
}

export function mappingsFor(codes: Map<string, CodeOption>): Map<string, CodeMappingRef[]> {
  return new Map([...codes].map(([code, option]) => [code, option.hccs]));
}

export interface OpenAttempt {
  id: string;
  startedAt: string;
  codes: { code: string; excerpt: string; rationale: string }[];
}

/** The learner's unsubmitted attempt on this chart, with its saved draft codes. */
export async function loadOpenAttempt(db: Db, userId: string, chartId: string): Promise<OpenAttempt | null> {
  const { data } = await db
    .from("attempts")
    .select("id, started_at, attempt_codes(icd10_code, supporting_excerpt, user_rationale)")
    .eq("user_id", userId)
    .eq("chart_id", chartId)
    .is("submitted_at", null)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    startedAt: data.started_at,
    codes: data.attempt_codes.map((c) => ({
      code: c.icd10_code,
      excerpt: c.supporting_excerpt ?? "",
      rationale: c.user_rationale ?? "",
    })),
  };
}

/** The published chart after this one in the practice list, wrapping around. */
export async function nextPublishedChartId(db: Db, chartId: string): Promise<string | null> {
  const { data } = await db.from("charts").select("id").eq("status", "published").order("difficulty").order("title");
  if (!data || data.length < 2) return null;
  const index = data.findIndex((c) => c.id === chartId);
  return data[(index + 1) % data.length].id;
}
