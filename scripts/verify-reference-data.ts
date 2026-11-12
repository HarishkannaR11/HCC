/**
 * Walk known codes from ICD-10 through the map to a RAF weight and check the
 * answers against hand-verified CMS PY2026 V28 values.
 *
 *   npm run data:verify                 # the loaded database (DATABASE_URL)
 *   npm run data:verify -- --offline    # data/processed/py2026.json
 *   npm run data:verify -- --fixture    # skip release-wide counts (fixture subset)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { Client } from "pg";
import { databaseUrl } from "./lib/env";
import type { ReferenceRelease } from "./lib/reference-build";

const YEAR = 2026;

interface Mapping {
  hcc_code: string;
  age_edit: string | null;
}
interface Category {
  hcc_code: string;
  raf_community_nondual: number;
  hierarchy_group: string;
}

interface Source {
  label: string;
  billable(code: string): Promise<boolean | null>;
  mappings(code: string): Promise<Mapping[]>;
  category(hcc: string): Promise<Category | null>;
  suppresses(hcc: string): Promise<string[]>;
  counts(): Promise<Record<string, number>>;
  close(): Promise<void>;
}

/** Expected values, read off the CMS PY2026 V28 files by hand. */
const EXPECT = {
  counts: { icd10_codes: 98186, hcc_categories: 115, hcc_hierarchy: 149 },
  diabetes: { code: "E11.9", hcc: "HCC38", raf: 0.166, group: "diabetes" },
  heartFailure: { code: "I50.32", hcc: "HCC226", raf: 0.36, group: "hf" },
  unmapped: "I10",
  ageSplit: { code: "C50.912", under: { hcc: "HCC22", edit: "age < 50" }, over: { hcc: "HCC23", edit: "age >= 50" } },
  suppression: { severe: "HCC37", suppressed: "HCC38" },
};

function offlineSource(): Source {
  const release: ReferenceRelease = JSON.parse(
    readFileSync(join(process.cwd(), "data", "processed", `py${YEAR}.json`), "utf8"),
  );
  return {
    label: `data/processed/py${YEAR}.json`,
    async billable(code) {
      return release.icd10_codes.find((c) => c.code === code)?.is_billable ?? null;
    },
    async mappings(code) {
      return release.icd_hcc_map.filter((m) => m.code === code);
    },
    async category(hcc) {
      return release.hcc_categories.find((c) => c.hcc_code === hcc) ?? null;
    },
    async suppresses(hcc) {
      return release.hcc_hierarchy.filter((p) => p.parent === hcc).map((p) => p.child);
    },
    async counts() {
      return {
        icd10_codes: release.icd10_codes.length,
        hcc_categories: release.hcc_categories.length,
        hcc_hierarchy: release.hcc_hierarchy.length,
      };
    },
    async close() {},
  };
}

async function databaseSource(): Promise<Source> {
  const db = new Client({ connectionString: databaseUrl() });
  await db.connect();
  return {
    label: "database",
    async billable(code) {
      const r = await db.query("select is_billable from icd10_codes where payment_year = $1 and code = $2", [YEAR, code]);
      return r.rows[0]?.is_billable ?? null;
    },
    async mappings(code) {
      const r = await db.query<Mapping>(
        `select h.hcc_code, m.age_edit
         from icd_hcc_map m
         join icd10_codes i on i.id = m.icd10_code_id
         join hcc_categories h on h.id = m.hcc_category_id
         where i.payment_year = $1 and i.code = $2
         order by h.hcc_code`,
        [YEAR, code],
      );
      return r.rows;
    },
    async category(hcc) {
      const r = await db.query(
        "select hcc_code, raf_community_nondual::float8 as raf_community_nondual, hierarchy_group from hcc_categories where payment_year = $1 and hcc_code = $2",
        [YEAR, hcc],
      );
      return r.rows[0] ?? null;
    },
    async suppresses(hcc) {
      const r = await db.query<{ hcc_code: string }>(
        `select c.hcc_code from hcc_hierarchy x
         join hcc_categories p on p.id = x.parent_hcc_id
         join hcc_categories c on c.id = x.child_hcc_id
         where x.payment_year = $1 and p.hcc_code = $2`,
        [YEAR, hcc],
      );
      return r.rows.map((row) => row.hcc_code);
    },
    async counts() {
      const out: Record<string, number> = {};
      for (const table of ["icd10_codes", "hcc_categories", "hcc_hierarchy"]) {
        const r = await db.query(`select count(*)::int as n from ${table} where payment_year = $1`, [YEAR]);
        out[table] = r.rows[0].n;
      }
      return out;
    },
    close: () => db.end(),
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
  const { values } = parseArgs({
    options: { offline: { type: "boolean", default: false }, fixture: { type: "boolean", default: false } },
  });
  const source = values.offline ? offlineSource() : await databaseSource();
  console.log(`Verifying PY${YEAR} reference data in ${source.label}\n`);

  try {
    if (!values.fixture) {
      console.log("Release-wide counts");
      const counts = await source.counts();
      for (const [table, expected] of Object.entries(EXPECT.counts)) check(table, counts[table], expected);
    }

    for (const [name, x] of [["Diabetes", EXPECT.diabetes], ["Heart failure", EXPECT.heartFailure]] as const) {
      console.log(`\n${name}: ${x.code} -> ${x.hcc} -> RAF`);
      check(`${x.code} is billable`, await source.billable(x.code), true);
      const maps = await source.mappings(x.code);
      check(`${x.code} maps to exactly ${x.hcc}`, maps.map((m) => m.hcc_code), [x.hcc]);
      const category = await source.category(x.hcc);
      check(`${x.hcc} community non-dual aged weight`, Number(category?.raf_community_nondual), x.raf);
      check(`${x.hcc} hierarchy group`, category?.hierarchy_group, x.group);
    }

    console.log("\nUnmapped code (hypertension does not risk-adjust)");
    check(`${EXPECT.unmapped} is billable`, await source.billable(EXPECT.unmapped), true);
    check(`${EXPECT.unmapped} maps to no HCC`, (await source.mappings(EXPECT.unmapped)).length, 0);

    console.log("\nAge-split code");
    const { ageSplit } = EXPECT;
    const splits = await source.mappings(ageSplit.code);
    for (const side of [ageSplit.under, ageSplit.over]) {
      check(`${ageSplit.code} -> ${side.hcc} when "${side.edit}"`, splits.find((m) => m.hcc_code === side.hcc)?.age_edit, side.edit);
    }

    console.log("\nV28 hierarchy");
    const { suppression } = EXPECT;
    check(
      `${suppression.severe} suppresses ${suppression.suppressed}`,
      (await source.suppresses(suppression.severe)).includes(suppression.suppressed),
      true,
    );
  } finally {
    await source.close();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  if (failures > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error("\n" + (error instanceof Error ? (error.stack ?? error.message) : String(error)));
  process.exit(1);
});
