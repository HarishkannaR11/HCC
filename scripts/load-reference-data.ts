/**
 * Phase 0 loader: data/processed/*.json -> Supabase.
 *
 * Runs against the Data API with the service-role key, so it needs the tables
 * to exist already (apply supabase/migrations/0001_reference_tables.sql first).
 * Insert order respects the foreign keys: weights, then codes, then the two
 * tables that reference them.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./lib/env";
import { retryFetch } from "./lib/retry-fetch";

const PROCESSED = join(process.cwd(), "data", "processed");
const CHUNK_SIZE = 1000;

/**
 * Parents before children; hcc_hierarchy points at hcc_weights twice.
 * Children are cleared first, in reverse, so the deletes do not trip the FKs.
 *
 * PostgREST refuses an unfiltered DELETE, so each table carries a predicate
 * that every row satisfies.
 */
const LOAD_ORDER = [
  { name: "hcc_weights", clearColumn: "hcc_category" },
  { name: "codes", clearColumn: "icd10_code" },
  { name: "crosswalk", clearColumn: "hcc_category" },
  { name: "hcc_hierarchy", clearColumn: "hcc_category" },
] as const;

function readTable(name: string): Record<string, unknown>[] {
  try {
    return JSON.parse(readFileSync(join(PROCESSED, `${name}.json`), "utf8"));
  } catch {
    throw new Error(`Missing data/processed/${name}.json — run: npm run data:build`);
  }
}

async function clearTable(db: SupabaseClient, name: string, column: string): Promise<void> {
  const { error } = await db.from(name).delete().not(column, "is", null);
  if (error) throw new Error(`Clearing ${name} failed: ${error.message}`);
}

async function loadTable(db: SupabaseClient, name: string): Promise<void> {
  const rows = readTable(name);
  process.stdout.write(`  ${name}: ${rows.length} rows `);

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await db.from(name).insert(chunk);
    if (error) throw new Error(`Inserting into ${name} failed at row ${i}: ${error.message}`);
    process.stdout.write(".");
  }
  process.stdout.write(" done\n");
}

async function main(): Promise<void> {
  const { url, key } = supabaseConfig();
  const db = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: retryFetch },
  });

  console.log(`Loading reference data into ${url}\n`);

  console.log("  clearing existing rows...");
  for (const { name, clearColumn } of [...LOAD_ORDER].reverse()) {
    await clearTable(db, name, clearColumn);
  }

  for (const { name } of LOAD_ORDER) await loadTable(db, name);

  console.log("\nRow counts in Supabase:");
  for (const { name } of LOAD_ORDER) {
    const { count, error } = await db.from(name).select("*", { count: "exact", head: true });
    if (error) throw new Error(`Counting ${name} failed: ${error.message}`);
    console.log(`  ${name.padEnd(16)} ${count}`);
  }
}

main().catch((error: unknown) => {
  // Print the whole error: a bare `.message` hides non-Error throws and the
  // stack, which is exactly when you most need them.
  console.error("\n" + (error instanceof Error ? (error.stack ?? error.message) : String(error)));
  process.exit(1);
});
