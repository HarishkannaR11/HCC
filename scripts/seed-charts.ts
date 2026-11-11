/**
 * Loads the hand-written charts in supabase/seed/charts.ts.
 *
 *   npm run seed:charts               insert any seed chart that is not there yet
 *   npm run seed:charts -- --force    replace seed charts that already exist
 *   npm run seed:charts -- --publish  publish them too (only after the answer keys are reviewed)
 *
 * Every chart is validated before anything is written: each code must be a
 * billable code in the chart's payment year, and the chart must pass the same
 * publish checklist the editor enforces. Charts arrive as drafts by default.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { lookupCodes } from "../src/lib/charts/code-lookup";
import { applicableMappings, primaryHccCategoryId } from "../src/lib/charts/derive-hcc";
import { chartReadiness, isPublishable } from "../src/lib/charts/readiness";
import { ageForPaymentYear } from "../src/lib/hcc/age";
import { SEED_CHARTS, type SeedChart } from "../supabase/seed/charts";
import { supabaseConfig } from "./lib/env";
import { retryFetch } from "./lib/retry-fetch";

const force = process.argv.includes("--force");
const publish = process.argv.includes("--publish");

type Db = ReturnType<typeof createClient<Database>>;

function must<T>(result: { data: T; error: { message: string } | null }, step: string): T {
  if (result.error) throw new Error(`${step}: ${result.error.message}`);
  return result.data;
}

async function validate(db: Db, chart: SeedChart) {
  const codes = [...chart.answerKey.map((k) => k.code), ...chart.distractors.map((d) => d.code)];
  const info = await lookupCodes(db, chart.paymentYear, codes);
  const problems: string[] = [];

  for (const code of codes) {
    const row = info.get(code);
    if (!row) problems.push(`${code} is not in the PY${chart.paymentYear} code set`);
    else if (!row.isBillable) problems.push(`${code} is a header, not a billable code`);
  }

  const checks = chartReadiness({
    isSynthetic: true,
    paymentYear: chart.paymentYear,
    encounterDate: chart.encounterDate,
    sections: chart.sections.map((s) => ({ sectionType: s.type, content: s.content })),
    answerKey: chart.answerKey.map((k) => ({
      icd10Code: k.code,
      isRequired: k.required,
      supportingExcerpt: k.excerpt,
    })),
    distractors: chart.distractors.map((d) => ({ icd10Code: d.code })),
  });
  if (!isPublishable(checks)) {
    for (const c of checks.filter((c) => c.blocking && !c.ok)) problems.push(`${c.label}${c.detail ? ` — ${c.detail}` : ""}`);
  }

  return { info, problems };
}

async function seed(db: Db, chart: SeedChart): Promise<void> {
  console.log(`\n${chart.title}`);

  const existing = must(await db.from("charts").select("id, status").eq("id", chart.id).maybeSingle(), "Lookup");
  if (existing && !force) {
    console.log(`  exists (${existing.status}) — skipped. Use --force to replace it.`);
    return;
  }

  const { info, problems } = await validate(db, chart);
  if (problems.length > 0) {
    throw new Error(`"${chart.title}" failed validation:\n    ${problems.join("\n    ")}`);
  }

  if (existing) must(await db.from("charts").delete().eq("id", chart.id), "Delete existing");

  must(
    await db.from("charts").insert({
      id: chart.id,
      title: chart.title,
      specialty: chart.specialty,
      difficulty: chart.difficulty,
      payment_year: chart.paymentYear,
      encounter_date: chart.encounterDate,
      patient_name: chart.patient.name,
      patient_dob: chart.patient.dob,
      patient_sex: chart.patient.sex,
      patient_mrn: chart.patient.mrn,
      provider_name: chart.providerName,
      facility_name: chart.facilityName,
      is_synthetic: true,
      status: "draft",
    }),
    "Insert chart",
  );

  must(
    await db.from("chart_sections").insert(
      chart.sections.map((s, i) => ({ chart_id: chart.id, section_type: s.type, content: s.content, sort_order: i })),
    ),
    "Insert sections",
  );

  const patient = { age: ageForPaymentYear(chart.patient.dob, chart.paymentYear), sex: chart.patient.sex };
  must(
    await db.from("answer_key_items").insert(
      chart.answerKey.map((k) => ({
        chart_id: chart.id,
        icd10_code: k.code,
        hcc_category_id: primaryHccCategoryId(info.get(k.code)?.mappings ?? [], patient),
        is_required: k.required,
        supporting_excerpt: k.excerpt,
        rationale: k.rationale,
        trap_type: k.trap,
      })),
    ),
    "Insert answer key",
  );

  must(
    await db.from("distractors").insert(
      chart.distractors.map((d) => ({ chart_id: chart.id, icd10_code: d.code, why_wrong: d.whyWrong, trap_type: d.trap })),
    ),
    "Insert distractors",
  );

  if (publish) must(await db.from("charts").update({ status: "published" }).eq("id", chart.id), "Publish");

  for (const k of chart.answerKey) {
    const hccs = applicableMappings(info.get(k.code)?.mappings ?? [], patient)
      .map((m) => `${m.hccCode} ${m.raf.toFixed(3)}`)
      .join(", ");
    console.log(`  key  ${k.code.padEnd(8)} ${hccs || "no HCC"}`);
  }
  console.log(`  ${chart.distractors.length} distractors · ${publish ? "published" : "draft"}`);
  console.log(`  expected after hierarchy: ${chart.expected.scoringHccs.join(" + ")} = RAF ${chart.expected.raf.toFixed(3)}`);
}

async function main(): Promise<void> {
  const { url, key } = supabaseConfig();
  const db = createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: { fetch: retryFetch },
  });
  console.log(`Seeding ${SEED_CHARTS.length} synthetic charts into ${url}`);
  for (const chart of SEED_CHARTS) await seed(db, chart);
}

main().catch((error: unknown) => {
  console.error("\n" + (error instanceof Error ? (error.stack ?? error.message) : String(error)));
  process.exit(1);
});
