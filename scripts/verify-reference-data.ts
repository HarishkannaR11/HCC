/**
 * Phase 0 verification: walk a handful of known codes from ICD-10 through the
 * crosswalk to a RAF weight and check the answer against hand-verified CMS
 * values.
 *
 * Runs against Supabase by default. Pass --offline to check data/processed
 * instead, which is useful before the migration has been applied.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./lib/env";
import { retryFetch } from "./lib/retry-fetch";

type CodeRow = { icd10_code: string; description: string; is_billable: boolean };
type CrosswalkRow = { icd10_code: string; hcc_category: number; age_edit: string | null; sex_edit: string | null };
type WeightRow = { hcc_category: number; label: string; disease_family: string; raf_weight: number };
type HierarchyRow = { hcc_category: number; suppressed_hcc: number };

interface Source {
  label: string;
  code(icd10: string): Promise<CodeRow | null>;
  mappings(icd10: string): Promise<CrosswalkRow[]>;
  weight(hcc: number): Promise<WeightRow | null>;
  suppresses(hcc: number): Promise<number[]>;
  count(table: string): Promise<number>;
}

/** Expected values, read off the CMS PY2026 V28 files by hand. */
const EXPECTATIONS = {
  counts: { codes: 98186, hcc_weights: 115, crosswalk: 8358, hcc_hierarchy: 149 },
  diabetes: { code: "E11.9", hcc: 38, raf: 0.166, family: "diabetes" },
  heartFailure: { code: "I50.32", hcc: 226, raf: 0.36, family: "hf" },
  unmapped: "I10",
  ageSplit: {
    code: "C50.011",
    under: { hcc: 22, raf: 0.363, edit: "age < 50" },
    over: { hcc: 23, raf: 0.186, edit: "age >= 50" },
  },
  suppression: { severe: 37, suppressed: 38 },
  /**
   * A live-data baseline for the Phase 2 RAF engine. One patient, both diabetes
   * codes on the chart: E11.22 captures HCC37, E11.9 captures HCC38, and HCC37
   * suppresses HCC38 -- so the family scores once, not twice.
   */
  suppressedRaf: {
    codes: ["E11.22", "E11.9"],
    capturedHccs: [37, 38],
    survivingHccs: [37],
    naiveRaf: 0.332,
    correctRaf: 0.166,
  },
};

function offlineSource(): Source {
  const load = <T,>(name: string): T[] =>
    JSON.parse(readFileSync(join(process.cwd(), "data", "processed", `${name}.json`), "utf8"));

  const codes = load<CodeRow>("codes");
  const crosswalk = load<CrosswalkRow>("crosswalk");
  const weights = load<WeightRow & { coef_community_na: number }>("hcc_weights");
  const hierarchy = load<HierarchyRow>("hcc_hierarchy");
  const tables: Record<string, unknown[]> = { codes, crosswalk, hcc_weights: weights, hcc_hierarchy: hierarchy };

  return {
    label: "data/processed (offline)",
    async code(icd10) {
      return codes.find((c) => c.icd10_code === icd10) ?? null;
    },
    async mappings(icd10) {
      return crosswalk.filter((c) => c.icd10_code === icd10);
    },
    async weight(hcc) {
      const row = weights.find((w) => w.hcc_category === hcc);
      // raf_weight is a generated column in Postgres; mirror it here.
      return row ? { ...row, raf_weight: row.coef_community_na } : null;
    },
    async suppresses(hcc) {
      return hierarchy.filter((h) => h.hcc_category === hcc).map((h) => h.suppressed_hcc);
    },
    async count(table) {
      return tables[table].length;
    },
  };
}

function supabaseSource(): Source {
  const { url, key } = supabaseConfig();
  const db = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: retryFetch },
  });

  const unwrap = <T,>(result: { data: T | null; error: { message: string } | null }): T => {
    if (result.error) throw new Error(result.error.message);
    return result.data as T;
  };

  return {
    label: url,
    async code(icd10) {
      return unwrap(await db.from("codes").select("icd10_code,description,is_billable").eq("icd10_code", icd10).maybeSingle());
    },
    async mappings(icd10) {
      return unwrap(await db.from("crosswalk").select("icd10_code,hcc_category,age_edit,sex_edit").eq("icd10_code", icd10).order("hcc_category"));
    },
    async weight(hcc) {
      return unwrap(await db.from("hcc_weights").select("hcc_category,label,disease_family,raf_weight").eq("hcc_category", hcc).maybeSingle());
    },
    async suppresses(hcc) {
      const rows = unwrap<HierarchyRow[]>(await db.from("hcc_hierarchy").select("hcc_category,suppressed_hcc").eq("hcc_category", hcc));
      return rows.map((r) => r.suppressed_hcc);
    },
    async count(table) {
      const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  };
}

let failures = 0;

function check(description: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${description}`);
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function main(): Promise<void> {
  const source = process.argv.includes("--offline") ? offlineSource() : supabaseSource();
  console.log(`Verifying reference data against ${source.label}\n`);

  console.log("Row counts");
  for (const [table, expected] of Object.entries(EXPECTATIONS.counts)) {
    check(table, await source.count(table), expected);
  }

  console.log("\nE11.9 -> HCC -> RAF");
  const { diabetes } = EXPECTATIONS;
  const e119 = await source.code(diabetes.code);
  check(`${diabetes.code} exists and is billable`, e119?.is_billable, true);
  console.log(`        "${e119?.description}"`);
  const e119Maps = await source.mappings(diabetes.code);
  check(`${diabetes.code} maps to exactly one HCC`, e119Maps.length, 1);
  check(`${diabetes.code} -> HCC${diabetes.hcc}`, e119Maps[0]?.hcc_category, diabetes.hcc);
  const dmWeight = await source.weight(diabetes.hcc);
  console.log(`        HCC${diabetes.hcc} "${dmWeight?.label}"`);
  check(`HCC${diabetes.hcc} RAF weight`, Number(dmWeight?.raf_weight), diabetes.raf);
  check(`HCC${diabetes.hcc} disease family`, dmWeight?.disease_family, diabetes.family);

  console.log("\nHeart failure");
  const { heartFailure: hf } = EXPECTATIONS;
  const hfMaps = await source.mappings(hf.code);
  check(`${hf.code} -> HCC${hf.hcc}`, hfMaps[0]?.hcc_category, hf.hcc);
  const hfWeight = await source.weight(hf.hcc);
  console.log(`        HCC${hf.hcc} "${hfWeight?.label}"`);
  check(`HCC${hf.hcc} RAF weight`, Number(hfWeight?.raf_weight), hf.raf);
  check(`HCC${hf.hcc} disease family`, hfWeight?.disease_family, hf.family);

  console.log("\nUnmapped code (hypertension does not risk-adjust)");
  const hypertension = await source.code(EXPECTATIONS.unmapped);
  check(`${EXPECTATIONS.unmapped} is a valid code`, hypertension !== null, true);
  check(`${EXPECTATIONS.unmapped} maps to no HCC`, (await source.mappings(EXPECTATIONS.unmapped)).length, 0);

  console.log("\nMulti-HCC code split by an age edit");
  const { ageSplit } = EXPECTATIONS;
  const breast = await source.code(ageSplit.code);
  console.log(`        "${breast?.description}"`);
  const splits = (await source.mappings(ageSplit.code)).sort((a, b) => a.hcc_category - b.hcc_category);
  check(`${ageSplit.code} maps to two HCCs`, splits.length, 2);
  for (const [position, expected] of [["under", ageSplit.under], ["over", ageSplit.over]] as const) {
    const row = splits.find((s) => s.hcc_category === expected.hcc);
    check(`  HCC${expected.hcc} guarded by "${expected.edit}"`, row?.age_edit, expected.edit);
    const weight = await source.weight(expected.hcc);
    check(`  HCC${expected.hcc} RAF weight (${position} threshold)`, Number(weight?.raf_weight), expected.raf);
  }

  console.log("\nV28 hierarchy");
  const { suppression } = EXPECTATIONS;
  const suppressed = await source.suppresses(suppression.severe);
  check(
    `HCC${suppression.severe} suppresses HCC${suppression.suppressed}`,
    suppressed.includes(suppression.suppressed),
    true,
  );
  console.log(`        HCC${suppression.severe} suppresses ${suppressed.sort((a, b) => a - b).join(", ")}`);

  console.log("\nSuppression applied to RAF (baseline for the Phase 2 engine)");
  const { suppressedRaf: scenario } = EXPECTATIONS;
  console.log(`        chart codes: ${scenario.codes.join(" + ")}`);

  // Resolve codes -> HCCs the way the engine will, ignoring age/sex edits:
  // neither diabetes code carries one.
  const captured = new Set<number>();
  for (const code of scenario.codes) {
    for (const mapping of await source.mappings(code)) captured.add(mapping.hcc_category);
  }
  check("captured HCCs before suppression", [...captured].sort((a, b) => a - b), scenario.capturedHccs);

  // Drop any captured HCC that a co-captured, more severe HCC suppresses.
  const surviving = new Set(captured);
  for (const hcc of captured) {
    for (const victim of await source.suppresses(hcc)) {
      if (captured.has(victim)) surviving.delete(victim);
    }
  }
  check("surviving HCCs after suppression", [...surviving].sort((a, b) => a - b), scenario.survivingHccs);

  const sum = async (hccs: Iterable<number>): Promise<number> => {
    let total = 0;
    for (const hcc of hccs) total += Number((await source.weight(hcc))?.raf_weight ?? 0);
    return Math.round(total * 1000) / 1000;
  };
  const naive = await sum(captured);
  const correct = await sum(surviving);
  console.log(`        double-counted RAF would be ${naive.toFixed(3)}`);
  check("naive RAF double-counts the family", naive, scenario.naiveRaf);
  check("suppressed RAF counts the family once", correct, scenario.correctRaf);

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  if (failures > 0) process.exit(1);
}

main().catch((error: unknown) => {
  // Print the whole error: a bare `.message` hides non-Error throws and the
  // stack, which is exactly when you most need them.
  console.error("\n" + (error instanceof Error ? (error.stack ?? error.message) : String(error)));
  process.exit(1);
});
