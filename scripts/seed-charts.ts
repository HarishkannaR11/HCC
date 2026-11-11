/**
 * Load the hand-written synthetic seed charts (scripts/seed/charts.ts).
 *
 *   npm run db:seed-charts
 *
 * Needs the chart's payment year of reference data loaded first. Idempotent:
 * each chart has a fixed id; its sections, key and distractors are replaced,
 * then it is published through the same DB trigger the admin editor uses.
 */
import { Client } from "pg";
import { SECTION_ORDER } from "../src/lib/charts/constants";
import { ageOn, primaryMapping } from "../src/lib/hcc/resolve";
import { databaseUrl } from "./lib/env";
import { SEED_CHARTS, type SeedChart } from "./seed/charts";

interface MappingRow {
  hcc_category_id: string;
  hcc_code: string;
  age_edit: string | null;
  sex_edit: string | null;
  mce_age_condition: string | null;
}

function assertExcerptsAreVerbatim(chart: SeedChart): void {
  const text = Object.values(chart.sections).join("\n");
  for (const item of chart.key) {
    if (!text.includes(item.excerpt)) {
      throw new Error(`${chart.title}: excerpt for ${item.code} is not in the chart text: "${item.excerpt}"`);
    }
  }
}

async function seedChart(db: Client, chart: SeedChart): Promise<void> {
  assertExcerptsAreVerbatim(chart);
  const patient = { age: ageOn(chart.patient.dob, chart.encounterDate), sex: chart.patient.sex };

  const attempts = await db.query("select 1 from public.attempts where chart_id = $1 limit 1", [chart.id]);
  if (attempts.rowCount) {
    console.log(`  skip  ${chart.title} (has learner attempts; edit it in /admin instead)`);
    return;
  }

  await db.query(
    `insert into public.charts
       (id, title, specialty, difficulty, payment_year, encounter_date, is_synthetic, status,
        patient_name, patient_dob, patient_sex, patient_mrn, provider_name, facility_name)
     values ($1, $2, $3, $4, $5, $6, true, 'draft', $7, $8, $9, $10, $11, $12)
     on conflict (id) do update set
       title = excluded.title, specialty = excluded.specialty, difficulty = excluded.difficulty,
       payment_year = excluded.payment_year, encounter_date = excluded.encounter_date, status = 'draft',
       patient_name = excluded.patient_name, patient_dob = excluded.patient_dob, patient_sex = excluded.patient_sex,
       patient_mrn = excluded.patient_mrn, provider_name = excluded.provider_name, facility_name = excluded.facility_name`,
    [
      chart.id,
      chart.title,
      chart.specialty,
      chart.difficulty,
      chart.paymentYear,
      chart.encounterDate,
      chart.patient.name,
      chart.patient.dob,
      chart.patient.sex,
      chart.patient.mrn,
      chart.provider,
      chart.facility,
    ],
  );

  for (const table of ["chart_sections", "answer_key_items", "distractors"]) {
    await db.query(`delete from public.${table} where chart_id = $1`, [chart.id]);
  }

  for (const [sortOrder, type] of SECTION_ORDER.entries()) {
    const content = chart.sections[type];
    if (!content) continue;
    await db.query(
      "insert into public.chart_sections (chart_id, section_type, content, sort_order) values ($1, $2, $3, $4)",
      [chart.id, type, content, sortOrder],
    );
  }

  const hccs: string[] = [];
  for (const item of chart.key) {
    const mappings = await db.query<MappingRow>(
      `select m.hcc_category_id, h.hcc_code, m.age_edit, m.sex_edit, m.mce_age_condition
       from public.icd_hcc_map m
       join public.icd10_codes i on i.id = m.icd10_code_id
       join public.hcc_categories h on h.id = m.hcc_category_id
       where i.payment_year = $1 and i.code = $2`,
      [chart.paymentYear, item.code],
    );
    const primary = primaryMapping(
      mappings.rows.map((r) => ({
        ...r,
        hccCode: r.hcc_code,
        ageEdit: r.age_edit,
        sexEdit: r.sex_edit,
        mceAgeCondition: r.mce_age_condition,
      })),
      patient,
    );
    hccs.push(primary ? `${item.code}->${primary.hcc_code}` : `${item.code}->none`);

    // The validate_chart_code trigger rejects codes missing from the year.
    await db.query(
      `insert into public.answer_key_items
         (chart_id, icd10_code, hcc_category_id, is_required, supporting_excerpt, rationale, trap_type)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [chart.id, item.code, primary?.hcc_category_id ?? null, item.required, item.excerpt, item.rationale, item.trap],
    );
  }

  for (const distractor of chart.distractors) {
    await db.query(
      "insert into public.distractors (chart_id, icd10_code, why_wrong, trap_type) values ($1, $2, $3, $4)",
      [chart.id, distractor.code, distractor.whyWrong, distractor.trap],
    );
  }

  // Publishing goes through the enforce_publishable trigger.
  await db.query("update public.charts set status = 'published' where id = $1", [chart.id]);
  console.log(`  ok    ${chart.title}  [${hccs.join(", ")}]`);
}

async function main(): Promise<void> {
  const db = new Client({ connectionString: databaseUrl() });
  await db.connect();
  console.log("Seeding synthetic charts\n");
  try {
    await db.query("begin");
    for (const chart of SEED_CHARTS) await seedChart(db, chart);
    await db.query("commit");
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    await db.end();
  }
}

main().catch((error: unknown) => {
  console.error("\n" + (error instanceof Error ? (error.stack ?? error.message) : String(error)));
  process.exit(1);
});
