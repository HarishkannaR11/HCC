/**
 * CMS/CDC source files -> one payment year of reference data.
 *
 * Pure: takes file contents, returns rows. No filesystem, network or database,
 * so it runs the same in the CLI (scripts/build-reference-data.ts) and in the
 * unit tests against data/fixtures/.
 *
 * Every invariant is asserted. A silent shape change in a future CMS release
 * must fail the build, not quietly corrupt the crosswalk.
 */
import { parseCsv, parseCsvRecords } from "./csv";
import { formatIcd10, icd10Chapter } from "../../src/lib/icd10";

/** Raw text of each source file for one payment year. */
export interface SourceFiles {
  /** CDC ICD-10-CM order file (fixed width). */
  order: string;
  /** CMS model software: ICD10_CC_mappings_CMS_HCC_<year>_<model>.csv */
  mappings: string;
  /** CMS model software: <model>_CE_Relative_Factors.csv */
  factors: string;
  /** CMS model software: <model>_HCC_Hierarchies.csv */
  hierarchies: string;
  /** CMS model software: <model>_Diagnosis_Categories.csv (family naming only) */
  categories: string;
}

/** File names inside a source directory, by payment year and model. */
export function sourceFileNames(year: number, model: string): Record<keyof SourceFiles, string> {
  return {
    order: `icd10cm-order-${year}.txt`,
    mappings: `ICD10_CC_mappings_CMS_HCC_${year}_${model.toLowerCase()}.csv`,
    factors: `${model}_CE_Relative_Factors.csv`,
    hierarchies: `${model}_HCC_Hierarchies.csv`,
    categories: `${model}_Diagnosis_Categories.csv`,
  };
}

export interface Icd10CodeRow {
  code: string;
  description: string;
  is_billable: boolean;
}

export interface HccCategoryRow {
  hcc_code: string;
  label: string;
  raf_community_nondual: number;
  hierarchy_group: string;
  hierarchy_rank: number;
}

export interface HierarchyRow {
  parent: string;
  child: string;
}

export interface MapRow {
  code: string;
  hcc_code: string;
  age_edit: string | null;
  sex_edit: string | null;
  mce_age_condition: string | null;
}

export interface ReferenceRelease {
  payment_year: number;
  hcc_model_version: string;
  icd10_codes: Icd10CodeRow[];
  hcc_categories: HccCategoryRow[];
  hcc_hierarchy: HierarchyRow[];
  icd_hcc_map: MapRow[];
}

export interface BuildOptions {
  paymentYear: number;
  model: string;
  /**
   * Assert release-wide counts (every V28 HCC present and reachable). Off for
   * the small fixture subset, on for the real CMS files.
   */
  expectFullRelease: boolean;
  log?: (line: string) => void;
}

/** HCC counts per model in a complete CMS release. */
const FULL_RELEASE_HCC_COUNT: Record<string, number> = { V28: 115 };

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invariant failed: ${message}`);
}

const hccCode = (n: number): string => `HCC${n}`;
const hccNumber = (cell: string): number => {
  const value = cell.trim();
  assert(/^HCC\d+$/.test(value), `expected an HCC label like "HCC37", got "${value}"`);
  return Number(value.slice(3));
};

// --- icd10_codes ------------------------------------------------------------

/**
 * The order file is fixed-width, not delimited:
 *   [0,5) order number  [6,13) code  [14,15) billable flag
 *   [16,76) short description  [77,) long description
 */
function buildCodes(order: string): Icd10CodeRow[] {
  const lines = order.split(/\r?\n/).filter((l) => l.trim() !== "");
  const rows = lines.map((line) => {
    const flag = line.slice(14, 15);
    assert(flag === "0" || flag === "1", `unexpected billable flag "${flag}" in order file`);
    const raw = line.slice(6, 13).trim();
    assert(icd10Chapter(raw) !== null, `code ${raw} falls outside every ICD-10-CM chapter`);
    return {
      code: formatIcd10(raw),
      description: line.slice(77).trim(),
      is_billable: flag === "1",
    };
  });

  const seen = new Set<string>();
  for (const r of rows) {
    assert(!seen.has(r.code), `duplicate ICD-10 code ${r.code}`);
    assert(r.description.length > 0, `empty description for ${r.code}`);
    seen.add(r.code);
  }
  return rows;
}

// --- hierarchy --------------------------------------------------------------

/** Rows of the hierarchy file: [parent, ...children], header dropped. */
function hierarchyRows(hierarchies: string): string[][] {
  return parseCsv(hierarchies)
    .slice(1)
    .filter((r) => r[0]?.trim());
}

function buildHierarchy(hierarchies: string): Array<{ parent: number; child: number }> {
  const pairs: Array<{ parent: number; child: number }> = [];
  for (const row of hierarchyRows(hierarchies)) {
    const parent = hccNumber(row[0]);
    for (const cell of row.slice(1)) {
      if (!cell.trim()) continue;
      const child = hccNumber(cell);
      assert(parent !== child, `HCC${parent} suppresses itself`);
      pairs.push({ parent, child });
    }
  }
  return pairs;
}

/**
 * hierarchy_rank: 1 for an HCC nothing suppresses, otherwise one more than its
 * highest-ranked suppressor. In a linear chain (diabetes 35 > 36 > 37 > 38)
 * this is simply the position. In a partial order it is the depth, which is
 * why rank is for display only and trimming uses the pairs.
 */
function rankHccs(nodes: number[], pairs: Array<{ parent: number; child: number }>): Map<number, number> {
  const parentsOf = new Map<number, number[]>();
  for (const { parent, child } of pairs) {
    parentsOf.set(child, [...(parentsOf.get(child) ?? []), parent]);
  }

  const rank = new Map<number, number>();
  const visiting = new Set<number>();
  const visit = (node: number): number => {
    const known = rank.get(node);
    if (known !== undefined) return known;
    assert(!visiting.has(node), `the hierarchy has a cycle through HCC${node}`);
    visiting.add(node);
    const parents = parentsOf.get(node) ?? [];
    const value = parents.length === 0 ? 1 : 1 + Math.max(...parents.map(visit));
    visiting.delete(node);
    rank.set(node, value);
    return value;
  };
  for (const node of nodes) visit(node);
  return rank;
}

// --- hierarchy groups -------------------------------------------------------

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
 * Hierarchy groups are the connected components of the suppression graph: two
 * HCCs share a group exactly when one can knock the other out.
 *
 * Naming: CMS's own diagnosis-category token wins when exactly one category
 * fits inside a component (cancer, diabetes, hf, kidney ...). Otherwise the
 * component takes the label of its root -- the lowest-numbered HCC, which V28
 * numbering makes the most severe member.
 */
function deriveGroups(
  nodes: number[],
  pairs: Array<{ parent: number; child: number }>,
  labels: Map<number, string>,
  categoriesText: string,
  log: (line: string) => void,
): Map<number, string> {
  const adjacency = new Map<number, Set<number>>();
  for (const n of nodes) adjacency.set(n, new Set());
  for (const { parent, child } of pairs) {
    adjacency.get(parent)!.add(child);
    adjacency.get(child)!.add(parent);
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

  const categories = parseCsv(categoriesText)
    .slice(1)
    .filter((r) => r[0]?.trim())
    .map((r) => ({
      name: r[0].trim(),
      hccs: new Set(r.slice(1).filter((c) => c.trim()).map(hccNumber)),
    }));

  const groups = new Map<number, string>();
  const used = new Set<string>();

  for (const component of components) {
    const members = new Set(component);
    const fits = categories.filter((c) => [...c.hccs].every((h) => members.has(h)));
    const root = component[0];
    let name =
      fits.length === 1
        ? slugify(fits[0].name.replace(/_V\d+$/, "").replace(/^g(?=[A-Z])/, ""))
        : slugify(labels.get(root) ?? `hcc-${root}`);

    // Slugs are an analytics join key; a collision would silently merge two
    // unrelated groups, so disambiguate with the root and then insist.
    if (used.has(name)) name = `${name}-${root}`;
    assert(!used.has(name), `duplicate hierarchy group slug ${name}`);
    used.add(name);

    for (const hcc of component) groups.set(hcc, name);
  }

  const multi = components.filter((c) => c.length > 1).length;
  log(`  hierarchy groups: ${components.length} (${multi} multi-HCC, ${components.length - multi} singleton)`);
  return groups;
}

// --- icd_hcc_map ------------------------------------------------------------

/** Threshold of an "age < 12" / "age >= 12" edit, or null if it is some other shape. */
function ageBand(edit: string | null): { operator: string; threshold: number } | null {
  const match = /^age\s*(<|>=)\s*(\d+)$/.exec(edit ?? "");
  return match ? { operator: match[1], threshold: Number(match[2]) } : null;
}

/**
 * CMS emits some (code, HCC) pairs twice, split across complementary age bands
 * -- "age < 2" and "age >= 2" both landing on the same HCC. The two rows
 * together cover every age, so the mapping is unconditional and collapses to
 * one row with no age edit.
 *
 * The collapse is asserted, not assumed: a genuinely conflicting duplicate in a
 * future release fails loudly instead of silently dropping half a mapping.
 */
function buildMap(
  mappings: string,
  validCodes: Map<string, Icd10CodeRow>,
  validHccs: Set<number>,
  log: (line: string) => void,
): MapRow[] {
  const records = parseCsvRecords(mappings);
  const groups = new Map<string, MapRow[]>();

  for (const r of records) {
    const code = formatIcd10(r["ICD10"]);
    const hcc = Number(r["CC"]); // CMS writes these as "92.0"
    assert(Number.isInteger(hcc), `non-integer CC "${r["CC"]}" for ${code}`);
    const known = validCodes.get(code);
    assert(known, `crosswalk references unknown code ${code}`);
    assert(known.is_billable, `crosswalk maps non-billable header ${code}`);
    assert(validHccs.has(hcc), `crosswalk references unknown HCC ${hcc}`);

    const key = `${code}|${hcc}`;
    const row: MapRow = {
      code,
      hcc_code: hccCode(hcc),
      age_edit: r["AGE_EDIT_CONDITION"] || null,
      sex_edit: r["SEX_EDIT_CONDITION"] || null,
      mce_age_condition: r["MCE_AGE_CONDITION"] || null,
    };
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  let collapsed = 0;
  const rows: MapRow[] = [];

  for (const [key, group] of groups) {
    if (group.length === 1) {
      rows.push(group[0]);
      continue;
    }

    assert(group.length === 2, `${key} appears ${group.length} times; expected at most 2`);
    const [a, b] = group;
    assert(a.sex_edit === b.sex_edit, `${key} duplicated with conflicting sex edits`);
    assert(a.mce_age_condition === b.mce_age_condition, `${key} duplicated with conflicting MCE age conditions`);

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

  log(`  icd_hcc_map: collapsed ${collapsed} exhaustive age-band duplicates`);
  return rows;
}

// --- release ----------------------------------------------------------------

export function buildReference(files: SourceFiles, options: BuildOptions): ReferenceRelease {
  const log = options.log ?? (() => {});
  assert(/^V\d{2}$/.test(options.model), `model must look like "V28", got "${options.model}"`);

  const icd10Codes = buildCodes(files.order);
  log(`  icd10_codes: ${icd10Codes.length} (${icd10Codes.filter((c) => c.is_billable).length} billable)`);

  const factorRows = parseCsvRecords(files.factors).filter((r) => /^HCC\d+$/.test(r["Variable"] ?? ""));
  const labels = new Map(factorRows.map((r) => [hccNumber(r["Variable"]), (r["Label"] ?? "").trim()] as const));
  const coefficients = new Map<number, number>();
  for (const r of factorRows) {
    const hcc = hccNumber(r["Variable"]);
    assert(!coefficients.has(hcc), `HCC${hcc} appears twice in the relative factors`);
    const value = Number(r["COMMUNITY_NA"]);
    assert(r["COMMUNITY_NA"] !== "" && Number.isFinite(value), `HCC${hcc} has no community non-dual aged coefficient`);
    assert(labels.get(hcc), `HCC${hcc} has no label`);
    coefficients.set(hcc, value);
  }
  const hccs = [...coefficients.keys()].sort((a, b) => a - b);
  const validHccs = new Set(hccs);

  const pairs = buildHierarchy(files.hierarchies);
  for (const { parent, child } of pairs) {
    assert(validHccs.has(parent), `hierarchy references unknown HCC ${parent}`);
    assert(validHccs.has(child), `hierarchy references unknown HCC ${child}`);
  }
  log(`  hcc_hierarchy: ${pairs.length} suppression pairs`);

  const groups = deriveGroups(hccs, pairs, labels, files.categories, log);
  const ranks = rankHccs(hccs, pairs);

  const hccCategories: HccCategoryRow[] = hccs.map((hcc) => ({
    hcc_code: hccCode(hcc),
    label: labels.get(hcc)!,
    raf_community_nondual: coefficients.get(hcc)!,
    hierarchy_group: groups.get(hcc)!,
    hierarchy_rank: ranks.get(hcc)!,
  }));
  log(`  hcc_categories: ${hccCategories.length}`);

  const map = buildMap(files.mappings, new Map(icd10Codes.map((c) => [c.code, c])), validHccs, log);
  log(`  icd_hcc_map: ${map.length} rows over ${new Set(map.map((m) => m.code)).size} distinct codes`);

  if (options.expectFullRelease) {
    const expected = FULL_RELEASE_HCC_COUNT[options.model];
    assert(expected !== undefined, `no full-release HCC count recorded for model ${options.model}`);
    assert(hccs.length === expected, `expected ${expected} ${options.model} HCCs, got ${hccs.length}`);
    const reachable = new Set(map.map((m) => m.hcc_code));
    assert(reachable.size === expected, `expected all ${expected} HCCs to be reachable, got ${reachable.size}`);
  }

  return {
    payment_year: options.paymentYear,
    hcc_model_version: options.model,
    icd10_codes: icd10Codes,
    hcc_categories: hccCategories,
    hcc_hierarchy: pairs.map(({ parent, child }) => ({ parent: hccCode(parent), child: hccCode(child) })),
    icd_hcc_map: map,
  };
}
