/**
 * Reference data loader: data/processed/*.json -> Supabase, for one payment year.
 *
 * Runs against the Data API with the service-role key, so the tables must
 * already exist (apply supabase/migrations first).
 *
 * Codes and HCC categories are upserted on their natural keys, so their ids are
 * stable across reloads: answer-key rows that point at an HCC keep pointing at
 * it. The map and the hierarchy reference nothing else and are replaced
 * wholesale for the year.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./lib/env";
import { retryFetch } from "./lib/retry-fetch";

const PROCESSED = join(process.cwd(), "data", "processed");
const CHUNK_SIZE = 1000;

type Meta = { payment_year: number; hcc_model_version: string };
type CodeRow = { icd10_code: string; description: string; chapter: string | null; is_billable: boolean };
type WeightRow = {
  hcc_category: number;
  label: string;
  disease_family: string;
  hierarchy_rank: number;
  coef_community_na: number;
  coef_community_pba: number | null;
  coef_community_fba: number | null;
  coef_community_nd: number | null;
  coef_community_pbd: number | null;
  coef_community_fbd: number | null;
  coef_institutional: number | null;
};
type CrosswalkRow = {
  icd10_code: string;
  hcc_category: number;
  age_edit: string | null;
  sex_edit: string | null;
  mce_age_condition: string | null;
};
type HierarchyRow = { hcc_category: number; suppressed_hcc: number };

function readJson<T>(name: string): T {
  try {
    return JSON.parse(readFileSync(join(PROCESSED, `${name}.json`), "utf8")) as T;
  } catch {
    throw new Error(`Missing data/processed/${name}.json — run: npm run data:build`);
  }
}

function chunks<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) out.push(rows.slice(i, i + CHUNK_SIZE));
  return out;
}

function fail(step: string, error: { message: string }): never {
  throw new Error(`${step} failed: ${error.message}`);
}

async function upsertCategories(db: SupabaseClient, year: number): Promise<Map<number, number>> {
  const weights = readJson<WeightRow[]>("hcc_weights");
  const rows = weights.map((w) => ({
    payment_year: year,
    hcc_code: `HCC${w.hcc_category}`,
    label: w.label,
    raf_community_nondual: w.coef_community_na,
    coef_community_pba: w.coef_community_pba,
    coef_community_fba: w.coef_community_fba,
    coef_community_nd: w.coef_community_nd,
    coef_community_pbd: w.coef_community_pbd,
    coef_community_fbd: w.coef_community_fbd,
    coef_institutional: w.coef_institutional,
    hierarchy_group: w.disease_family,
    hierarchy_rank: w.hierarchy_rank,
  }));

  const { data, error } = await db
    .from("hcc_categories")
    .upsert(rows, { onConflict: "payment_year,hcc_code" })
    .select("id, hcc_number");
  if (error) fail("Upserting hcc_categories", error);

  console.log(`  hcc_categories: ${data.length} rows`);
  return new Map(data.map((r: { id: number; hcc_number: number }) => [r.hcc_number, r.id]));
}

async function upsertCodes(db: SupabaseClient, year: number): Promise<Map<string, number>> {
  const codes = readJson<CodeRow[]>("codes");
  const ids = new Map<string, number>();
  process.stdout.write(`  icd10_codes: ${codes.length} rows `);

  for (const chunk of chunks(codes)) {
    const rows = chunk.map((c) => ({
      payment_year: year,
      code: c.icd10_code,
      description: c.description,
      chapter: c.chapter,
      is_billable: c.is_billable,
    }));
    const { data, error } = await db
      .from("icd10_codes")
      .upsert(rows, { onConflict: "payment_year,code" })
      .select("id, code");
    if (error) fail("Upserting icd10_codes", error);
    for (const r of data as { id: number; code: string }[]) ids.set(r.code, r.id);
    process.stdout.write(".");
  }
  process.stdout.write(" done\n");
  return ids;
}

async function replaceForYear(
  db: SupabaseClient,
  table: "icd_hcc_map" | "hcc_hierarchy",
  year: number,
  rows: Record<string, unknown>[],
): Promise<void> {
  const { error: clearError } = await db.from(table).delete().eq("payment_year", year);
  if (clearError) fail(`Clearing ${table}`, clearError);

  process.stdout.write(`  ${table}: ${rows.length} rows `);
  for (const chunk of chunks(rows)) {
    const { error } = await db.from(table).insert(chunk);
    if (error) fail(`Inserting into ${table}`, error);
    process.stdout.write(".");
  }
  process.stdout.write(" done\n");
}

function lookup<K, V>(map: Map<K, V>, key: K, what: string): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`${what} ${String(key)} was not loaded — processed data is inconsistent`);
  return value;
}

async function count(db: SupabaseClient, table: string, year: number): Promise<number> {
  const { count: n, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("payment_year", year);
  if (error) fail(`Counting ${table}`, error);
  return n ?? 0;
}

async function main(): Promise<void> {
  const { url, key } = supabaseConfig();
  const db = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: retryFetch },
  });
  const meta = readJson<Meta>("meta");
  const year = meta.payment_year;

  console.log(`Loading PY${year} ${meta.hcc_model_version} reference data into ${url}\n`);

  const { error: yearError } = await db
    .from("payment_years")
    .upsert({ year, hcc_model_version: meta.hcc_model_version, is_active: true }, { onConflict: "year" });
  if (yearError) fail("Upserting payment_years", yearError);

  const categoryIds = await upsertCategories(db, year);
  const codeIds = await upsertCodes(db, year);

  const crosswalk = readJson<CrosswalkRow[]>("crosswalk");
  await replaceForYear(
    db,
    "icd_hcc_map",
    year,
    crosswalk.map((x) => ({
      payment_year: year,
      icd10_code_id: lookup(codeIds, x.icd10_code, "Code"),
      hcc_category_id: lookup(categoryIds, x.hcc_category, "HCC"),
      age_edit: x.age_edit,
      sex_edit: x.sex_edit,
      mce_age_condition: x.mce_age_condition,
    })),
  );

  const hierarchy = readJson<HierarchyRow[]>("hcc_hierarchy");
  await replaceForYear(
    db,
    "hcc_hierarchy",
    year,
    hierarchy.map((h) => ({
      payment_year: year,
      hcc_category_id: lookup(categoryIds, h.hcc_category, "HCC"),
      suppressed_hcc_category_id: lookup(categoryIds, h.suppressed_hcc, "HCC"),
    })),
  );

  console.log(`\nRow counts in Supabase for PY${year}:`);
  const expected: Record<string, number> = {
    icd10_codes: codeIds.size,
    hcc_categories: categoryIds.size,
    icd_hcc_map: crosswalk.length,
    hcc_hierarchy: hierarchy.length,
  };
  let mismatches = 0;
  for (const [table, want] of Object.entries(expected)) {
    const got = await count(db, table, year);
    const note = got === want ? "" : `  (expected ${want})`;
    if (got !== want) mismatches++;
    console.log(`  ${table.padEnd(16)} ${got}${note}`);
  }
  if (mismatches > 0) {
    // Upserts never delete, so a code CMS withdrew from this year's file
    // lingers. Report it rather than guess whether a chart still uses it.
    console.log("\nCounts differ from the processed files: the database holds rows the new release no longer has.");
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  // Print the whole error: a bare `.message` hides non-Error throws and the
  // stack, which is exactly when you most need them.
  console.error("\n" + (error instanceof Error ? (error.stack ?? error.message) : String(error)));
  process.exit(1);
});
