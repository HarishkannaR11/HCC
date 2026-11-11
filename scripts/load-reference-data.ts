/**
 * Load data/processed/py<year>.json into Postgres, in one transaction.
 *
 *   npm run data:load                # PY2026
 *   npm run data:load -- --year 2027
 *
 * Writes over a direct Postgres connection (DATABASE_URL) rather than the Data
 * API: the versioned tables are keyed by surrogate ids, so mappings are
 * inserted with joins on (payment_year, code), and the whole year either loads
 * or rolls back.
 *
 * Re-running is safe. Categories and codes are upserted (their ids, which
 * answer keys reference, stay stable); the hierarchy and the map are rebuilt
 * for that year only. Anything that would orphan an existing answer key fails
 * the load instead.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { Client } from "pg";
import { databaseUrl } from "./lib/env";
import type { ReferenceRelease } from "./lib/reference-build";

const CHUNK = 20_000;

function chunks<T>(rows: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

async function load(db: Client, release: ReferenceRelease): Promise<void> {
  const year = release.payment_year;

  await db.query(
    `insert into public.payment_years (year, hcc_model_version, is_active)
     values ($1, $2, true)
     on conflict (year) do update set hcc_model_version = excluded.hcc_model_version`,
    [year, release.hcc_model_version],
  );

  // --- hcc_categories ------------------------------------------------------
  const cats = release.hcc_categories;
  await db.query(
    `insert into public.hcc_categories
       (payment_year, hcc_code, label, raf_community_nondual, hierarchy_group, hierarchy_rank)
     select $1, * from unnest($2::text[], $3::text[], $4::numeric[], $5::text[], $6::smallint[])
     on conflict (payment_year, hcc_code) do update set
       label = excluded.label,
       raf_community_nondual = excluded.raf_community_nondual,
       hierarchy_group = excluded.hierarchy_group,
       hierarchy_rank = excluded.hierarchy_rank`,
    [
      year,
      cats.map((c) => c.hcc_code),
      cats.map((c) => c.label),
      cats.map((c) => c.raf_community_nondual),
      cats.map((c) => c.hierarchy_group),
      cats.map((c) => c.hierarchy_rank),
    ],
  );
  // Fails (FK restrict) if an answer key still points at a removed category.
  await db.query(`delete from public.hcc_categories where payment_year = $1 and hcc_code <> all($2::text[])`, [
    year,
    cats.map((c) => c.hcc_code),
  ]);
  console.log(`  hcc_categories   ${cats.length}`);

  // --- icd10_codes -------------------------------------------------------------
  for (const part of chunks(release.icd10_codes)) {
    await db.query(
      `insert into public.icd10_codes (payment_year, code, description, is_billable)
       select $1, * from unnest($2::text[], $3::text[], $4::boolean[])
       on conflict (payment_year, code) do update set
         description = excluded.description,
         is_billable = excluded.is_billable`,
      [year, part.map((c) => c.code), part.map((c) => c.description), part.map((c) => c.is_billable)],
    );
  }
  await db.query(`delete from public.icd10_codes where payment_year = $1 and code <> all($2::text[])`, [
    year,
    release.icd10_codes.map((c) => c.code),
  ]);
  console.log(`  icd10_codes      ${release.icd10_codes.length}`);

  // --- hcc_hierarchy (rebuilt for the year) ----------------------------------
  await db.query(`delete from public.hcc_hierarchy where payment_year = $1`, [year]);
  const pairs = release.hcc_hierarchy;
  const hierarchy = await db.query(
    `insert into public.hcc_hierarchy (payment_year, parent_hcc_id, child_hcc_id)
     select $1, p.id, c.id
     from unnest($2::text[], $3::text[]) as x(parent, child)
     join public.hcc_categories p on p.payment_year = $1 and p.hcc_code = x.parent
     join public.hcc_categories c on c.payment_year = $1 and c.hcc_code = x.child`,
    [year, pairs.map((p) => p.parent), pairs.map((p) => p.child)],
  );
  if (hierarchy.rowCount !== pairs.length) {
    throw new Error(`hcc_hierarchy: inserted ${hierarchy.rowCount} of ${pairs.length} pairs`);
  }
  console.log(`  hcc_hierarchy    ${pairs.length}`);

  // --- icd_hcc_map (rebuilt for the year) ------------------------------------
  await db.query(`delete from public.icd_hcc_map where payment_year = $1`, [year]);
  let mapped = 0;
  for (const part of chunks(release.icd_hcc_map)) {
    const result = await db.query(
      `insert into public.icd_hcc_map
         (icd10_code_id, hcc_category_id, payment_year, age_edit, sex_edit, mce_age_condition)
       select i.id, h.id, $1, x.age_edit, x.sex_edit, x.mce_age_condition
       from unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[])
         as x(code, hcc_code, age_edit, sex_edit, mce_age_condition)
       join public.icd10_codes i on i.payment_year = $1 and i.code = x.code
       join public.hcc_categories h on h.payment_year = $1 and h.hcc_code = x.hcc_code`,
      [
        year,
        part.map((m) => m.code),
        part.map((m) => m.hcc_code),
        part.map((m) => m.age_edit),
        part.map((m) => m.sex_edit),
        part.map((m) => m.mce_age_condition),
      ],
    );
    mapped += result.rowCount ?? 0;
  }
  if (mapped !== release.icd_hcc_map.length) {
    throw new Error(`icd_hcc_map: inserted ${mapped} of ${release.icd_hcc_map.length} rows`);
  }
  console.log(`  icd_hcc_map      ${mapped}`);

  // --- existing content must still resolve -----------------------------------
  const orphans = await db.query<{ icd10_code: string; title: string }>(
    `select k.icd10_code, c.title
     from (select chart_id, icd10_code from public.answer_key_items
           union all select chart_id, icd10_code from public.distractors) k
     join public.charts c on c.id = k.chart_id and c.payment_year = $1
     where not exists (
       select 1 from public.icd10_codes i where i.payment_year = $1 and i.code = k.icd10_code and i.is_billable
     )`,
    [year],
  );
  if (orphans.rows.length > 0) {
    const list = orphans.rows.map((r) => `${r.icd10_code} (${r.title})`).join(", ");
    throw new Error(`This release drops codes used by existing charts: ${list}`);
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { year: { type: "string", default: "2026" } } });
  const file = join(process.cwd(), "data", "processed", `py${values.year}.json`);

  let release: ReferenceRelease;
  try {
    release = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Error(`Missing ${file} - run: npm run data:build`);
  }

  const db = new Client({ connectionString: databaseUrl() });
  await db.connect();
  console.log(`Loading PY${release.payment_year} ${release.hcc_model_version} reference data\n`);
  try {
    await db.query("begin");
    await load(db, release);
    await db.query("commit");
    console.log("\nCommitted.");
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
