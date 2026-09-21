/**
 * Phase 0 parser: CMS/CDC source files -> data/processed/*.json
 *
 * Pure transformation. Nothing here touches the network or the database; the
 * loader is a separate step, so the parse can be re-run and diffed offline.
 * Every invariant is asserted -- a silent shape change in a future CMS release
 * should fail the build, not quietly corrupt the crosswalk.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { parseCsvRecords, parseCsv } from "./lib/csv";
import { formatIcd10, icd10Chapter } from "../src/lib/icd10";

const RAW = join(process.cwd(), "data", "raw");
const OUT = join(process.cwd(), "data", "processed");

const SOURCES = {
  order: "icd10cm-order-2026.txt",
  mappings: "ICD10_CC_mappings_CMS_HCC_2026_v28.csv",
  factors: "V28_CE_Relative_Factors.csv",
  hierarchies: "V28_HCC_Hierarchies.csv",
  categories: "V28_Diagnosis_Categories.csv",
} as const;

function read(name: string): string {
  try {
    return readFileSync(join(RAW, name), "utf8");
  } catch {
    throw new Error(`Missing source file data/raw/${name} - see data/README.md`);
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invariant failed: ${message}`);
}

// --- codes ------------------------------------------------------------------

type CodeRow = {
  icd10_code: string;
  description: string;
  chapter: string | null;
  is_billable: boolean;
};

/**
 * The order file is fixed-width, not delimited:
 *   [0,5) order number  [6,13) code  [14,15) billable flag
 *   [16,76) short description  [77,) long description
 */
function buildCodes(): CodeRow[] {
  const lines = read(SOURCES.order).split(/\r?\n/).filter((l) => l.trim() !== "");
  const rows = lines.map((line) => {
    const flag = line.slice(14, 15);
    assert(flag === "0" || flag === "1", `unexpected billable flag "${flag}" in order file`);
    const raw = line.slice(6, 13).trim();
    return {
      icd10_code: formatIcd10(raw),
      description: line.slice(77).trim(),
      chapter: icd10Chapter(raw),
      is_billable: flag === "1",
    };
  });

  const seen = new Set<string>();
  for (const r of rows) {
    assert(!seen.has(r.icd10_code), `duplicate ICD-10 code ${r.icd10_code}`);
    assert(r.description.length > 0, `empty description for ${r.icd10_code}`);
    seen.add(r.icd10_code);
  }
  return rows;
}

// --- hcc_weights ------------------------------------------------------------

const SEGMENTS = [
  ["COMMUNITY_NA", "coef_community_na"],
  ["COMMUNITY_PBA", "coef_community_pba"],
  ["COMMUNITY_FBA", "coef_community_fba"],
  ["COMMUNITY_ND", "coef_community_nd"],
  ["COMMUNITY_PBD", "coef_community_pbd"],
  ["COMMUNITY_FBD", "coef_community_fbd"],
  ["INSTITUTIONAL", "coef_institutional"],
] as const;

type WeightRow = {
  hcc_category: number;
  label: string;
  disease_family: string;
  coef_community_na: number | null;
  coef_community_pba: number | null;
  coef_community_fba: number | null;
  coef_community_nd: number | null;
  coef_community_pbd: number | null;
  coef_community_fbd: number | null;
  coef_institutional: number | null;
};

function buildWeights(families: Map<number, string>): WeightRow[] {
  const records = parseCsvRecords(read(SOURCES.factors));
  const hccRows = records.filter((r) => /^HCC\d+$/.test(r["Variable"] ?? ""));

  return hccRows.map((r) => {
    const hcc = Number(r["Variable"].slice(3));
    const family = families.get(hcc);
    assert(family, `HCC${hcc} has no derived disease family`);

    const coefficients = {} as Record<string, number | null>;
    for (const [source, column] of SEGMENTS) {
      const value = r[source];
      const parsed = value === "" || value === undefined ? null : Number(value);
      assert(parsed === null || Number.isFinite(parsed), `bad ${column} for HCC${hcc}`);
      coefficients[column] = parsed;
    }
    assert(
      coefficients["coef_community_na"] !== null,
      `HCC${hcc} has no community non-dual aged coefficient`,
    );

    return {
      hcc_category: hcc,
      label: (r["Label"] ?? "").trim(),
      disease_family: family,
      ...coefficients,
    } as WeightRow;
  });
}

// --- hcc_hierarchy ----------------------------------------------------------

type HierarchyRow = { hcc_category: number; suppressed_hcc: number };

function hierarchyRows(): string[][] {
  return parseCsv(read(SOURCES.hierarchies))
    .slice(1)
    .filter((r) => r[0]?.trim());
}

function buildHierarchy(): HierarchyRow[] {
  const pairs: HierarchyRow[] = [];
  for (const row of hierarchyRows()) {
    const parent = Number(row[0].trim().slice(3));
    for (const cell of row.slice(1)) {
      const value = cell.trim();
      if (!value) continue;
      const child = Number(value.slice(3));
      assert(parent !== child, `HCC${parent} suppresses itself`);
      pairs.push({ hcc_category: parent, suppressed_hcc: child });
    }
  }
  return pairs;
}

// --- disease families -------------------------------------------------------

function slugify(text: string, maxLength = 48): string {
  const slug = text
    .split(";")[0]
    // CMS category tokens are camelCase ("gSubUseDisorder"); keep the word breaks.
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= maxLength) return slug;
  return slug.slice(0, maxLength).replace(/-[^-]*$/, "");
}

/**
 * Disease families are the connected components of the suppression graph: two
 * HCCs share a family exactly when one can knock the other out. That is the
 * grouping the RAF engine and the "weak families" dashboard actually care
 * about, and it is derived rather than hand-authored.
 *
 * Naming: CMS's own diagnosis-category token wins when exactly one category
 * fits inside a component (cancer, diabetes, hf, kidney ...). Otherwise the
 * component takes the label of its root -- the lowest-numbered HCC, which V28
 * numbering makes the most severe member.
 */
function deriveFamilies(labels: Map<number, string>): Map<number, string> {
  const nodes = hierarchyRows().map((r) => Number(r[0].trim().slice(3)));
  const adjacency = new Map<number, Set<number>>();
  for (const n of nodes) adjacency.set(n, new Set());
  for (const { hcc_category, suppressed_hcc } of buildHierarchy()) {
    adjacency.get(hcc_category)!.add(suppressed_hcc);
    adjacency.get(suppressed_hcc)!.add(hcc_category);
  }

  const components: number[][] = [];
  const seen = new Set<number>();
  for (const start of [...nodes].sort((a, b) => a - b)) {
    if (seen.has(start)) continue;
    const stack = [start];
    const component: number[] = [];
    while (stack.length) {
      const node = stack.pop()!;
      if (seen.has(node)) continue;
      seen.add(node);
      component.push(node);
      stack.push(...adjacency.get(node)!);
    }
    components.push(component.sort((a, b) => a - b));
  }

  const categories = parseCsv(read(SOURCES.categories))
    .slice(1)
    .filter((r) => r[0]?.trim())
    .map((r) => ({
      name: r[0].trim(),
      hccs: new Set(
        r
          .slice(1)
          .filter((c) => c.trim())
          .map((c) => Number(c.trim().slice(3))),
      ),
    }));

  const families = new Map<number, string>();
  const used = new Set<string>();

  for (const component of components) {
    const members = new Set(component);
    const fits = categories.filter((c) => [...c.hccs].every((h) => members.has(h)));
    const root = component[0];
    let name =
      fits.length === 1
        ? slugify(fits[0].name.replace(/_V28$/, "").replace(/^g(?=[A-Z])/, ""))
        : slugify(labels.get(root) ?? `hcc-${root}`);

    // Slugs are the dashboard's join key; a collision would silently merge two
    // unrelated families, so disambiguate with the root and then insist.
    if (used.has(name)) name = `${name}-${root}`;
    assert(!used.has(name), `duplicate disease family slug ${name}`);
    used.add(name);

    for (const hcc of component) families.set(hcc, name);
  }

  const multi = components.filter((c) => c.length > 1).length;
  console.log(
    `  disease families: ${components.length} (${multi} multi-HCC, ${components.length - multi} singleton)`,
  );
  return families;
}

// --- crosswalk --------------------------------------------------------------

type CrosswalkRow = {
  icd10_code: string;
  hcc_category: number;
  age_edit: string | null;
  sex_edit: string | null;
  mce_age_condition: string | null;
};

/** Threshold of an "age < 12" / "age >= 12" edit, or null if it is some other shape. */
function ageBand(edit: string | null): { operator: string; threshold: number } | null {
  const match = /^age\s*(<|>=)\s*(\d+)$/.exec(edit ?? "");
  return match ? { operator: match[1], threshold: Number(match[2]) } : null;
}

/**
 * CMS emits 575 (code, HCC) pairs twice, split across complementary age bands
 * -- "age < 2" and "age >= 2" both landing on the same HCC. That is an artifact
 * of how their edit rules are enumerated: the two rows together cover every
 * age, so the mapping is in fact unconditional and collapses to one row with no
 * age edit.
 *
 * The collapse is asserted, not assumed. If CMS ever ships a genuinely
 * conflicting duplicate, this fails loudly instead of silently dropping half a
 * mapping.
 */
function buildCrosswalk(validCodes: Set<string>, validHccs: Set<number>): CrosswalkRow[] {
  const records = parseCsvRecords(read(SOURCES.mappings));
  const groups = new Map<string, CrosswalkRow[]>();

  for (const r of records) {
    const icd10_code = formatIcd10(r["ICD10"]);
    const hcc_category = Number(r["CC"]); // CMS writes these as "92.0"
    assert(Number.isInteger(hcc_category), `non-integer CC "${r["CC"]}" for ${icd10_code}`);
    assert(validCodes.has(icd10_code), `crosswalk references unknown code ${icd10_code}`);
    assert(validHccs.has(hcc_category), `crosswalk references unknown HCC ${hcc_category}`);

    const key = `${icd10_code}|${hcc_category}`;
    const row: CrosswalkRow = {
      icd10_code,
      hcc_category,
      age_edit: r["AGE_EDIT_CONDITION"] || null,
      sex_edit: r["SEX_EDIT_CONDITION"] || null,
      mce_age_condition: r["MCE_AGE_CONDITION"] || null,
    };
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  let collapsed = 0;
  const rows: CrosswalkRow[] = [];

  for (const [key, group] of groups) {
    if (group.length === 1) {
      rows.push(group[0]);
      continue;
    }

    assert(group.length === 2, `${key} appears ${group.length} times; expected at most 2`);
    const [a, b] = group;
    assert(a.sex_edit === b.sex_edit, `${key} duplicated with conflicting sex edits`);
    assert(
      a.mce_age_condition === b.mce_age_condition,
      `${key} duplicated with conflicting MCE age conditions`,
    );

    const bandA = ageBand(a.age_edit);
    const bandB = ageBand(b.age_edit);
    assert(bandA && bandB, `${key} duplicated without a pair of age bands`);
    assert(
      bandA.threshold === bandB.threshold && bandA.operator !== bandB.operator,
      `${key} duplicated with age bands that do not cover every age`,
    );

    rows.push({ ...a, age_edit: null });
    collapsed++;
  }

  console.log(`  crosswalk: collapsed ${collapsed} exhaustive age-band duplicates`);
  return rows;
}

// --- main -------------------------------------------------------------------

function main() {
  console.log("Parsing CMS PY2026 V28 reference data...\n");

  const codes = buildCodes();
  console.log(`  codes: ${codes.length} (${codes.filter((c) => c.is_billable).length} billable)`);
  const uncharted = codes.filter((c) => c.chapter === null);
  assert(
    uncharted.length === 0,
    `codes outside every chapter range: ${uncharted.slice(0, 5).map((c) => c.icd10_code).join(", ")}`,
  );

  const labels = new Map(
    parseCsvRecords(read(SOURCES.factors))
      .filter((r) => /^HCC\d+$/.test(r["Variable"] ?? ""))
      .map((r) => [Number(r["Variable"].slice(3)), (r["Label"] ?? "").trim()] as const),
  );

  const families = deriveFamilies(labels);
  const weights = buildWeights(families);
  console.log(`  hcc_weights: ${weights.length}`);

  const hierarchy = buildHierarchy();
  console.log(`  hcc_hierarchy: ${hierarchy.length} suppression pairs`);

  const validHccs = new Set(weights.map((w) => w.hcc_category));
  for (const { hcc_category, suppressed_hcc } of hierarchy) {
    assert(validHccs.has(hcc_category), `hierarchy references unknown HCC ${hcc_category}`);
    assert(validHccs.has(suppressed_hcc), `hierarchy references unknown HCC ${suppressed_hcc}`);
  }

  const crosswalk = buildCrosswalk(new Set(codes.map((c) => c.icd10_code)), validHccs);
  const mappedCodes = new Set(crosswalk.map((c) => c.icd10_code));
  console.log(`  crosswalk: ${crosswalk.length} rows over ${mappedCodes.size} distinct codes`);

  assert(weights.length === 115, `expected 115 V28 HCCs, got ${weights.length}`);
  const mappedHccs = new Set(crosswalk.map((c) => c.hcc_category));
  assert(mappedHccs.size === 115, `expected all 115 HCCs to be reachable, got ${mappedHccs.size}`);

  mkdirSync(OUT, { recursive: true });
  const tables = { codes, hcc_weights: weights, crosswalk, hcc_hierarchy: hierarchy };
  for (const [name, rows] of Object.entries(tables)) {
    writeFileSync(join(OUT, `${name}.json`), JSON.stringify(rows), "utf8");
  }
  console.log(`\nWrote ${Object.keys(tables).length} tables to data/processed/`);
}

main();
