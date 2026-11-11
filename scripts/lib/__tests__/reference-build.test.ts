import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildReference, sourceFileNames, type SourceFiles } from "../reference-build";

const FIXTURE = join(__dirname, "..", "..", "..", "data", "fixtures", "py2026");

function fixtureFiles(): SourceFiles {
  const names = sourceFileNames(2026, "V28");
  return Object.fromEntries(
    Object.entries(names).map(([key, name]) => [key, readFileSync(join(FIXTURE, name), "utf8")]),
  ) as unknown as SourceFiles;
}

const release = buildReference(fixtureFiles(), { paymentYear: 2026, model: "V28", expectFullRelease: false });
const category = (hcc: string) => release.hcc_categories.find((c) => c.hcc_code === hcc);

describe("buildReference (PY2026 V28 fixture)", () => {
  it("dots codes and keeps category headers as non-billable", () => {
    expect(release.icd10_codes.find((c) => c.code === "E11.22")).toMatchObject({ is_billable: true });
    expect(release.icd10_codes.find((c) => c.code === "E11")).toMatchObject({ is_billable: false });
  });

  it("reads the community non-dual aged coefficient", () => {
    expect(category("HCC38")?.raf_community_nondual).toBe(0.166);
    expect(category("HCC327")?.raf_community_nondual).toBe(0.514);
    expect(category("HCC226")?.raf_community_nondual).toBe(0.36);
  });

  it("names hierarchy groups from CMS categories, falling back to the root label", () => {
    expect(category("HCC37")?.hierarchy_group).toBe("diabetes");
    expect(category("HCC327")?.hierarchy_group).toBe("kidney");
    expect(category("HCC224")?.hierarchy_group).toBe("hf");
    expect(category("HCC253")?.hierarchy_group).toBe("quadriplegia");
  });

  it("ranks a linear chain by position", () => {
    expect(["HCC35", "HCC36", "HCC37", "HCC38"].map((h) => category(h)?.hierarchy_rank)).toEqual([1, 2, 3, 4]);
  });

  it("keeps partial orders as explicit pairs: HCC180 suppresses 182 and 253, which do not suppress each other", () => {
    const children = (parent: string) =>
      release.hcc_hierarchy.filter((p) => p.parent === parent).map((p) => p.child).sort();
    expect(children("HCC180")).toEqual(["HCC181", "HCC182", "HCC253", "HCC254"]);
    expect(children("HCC182")).toEqual([]);
    expect(children("HCC253")).toEqual(["HCC254"]);
    // Same rank, different branches: rank alone cannot express this.
    expect(category("HCC181")?.hierarchy_rank).toBe(category("HCC253")?.hierarchy_rank);
  });

  it("keeps CMS age edits for age-split codes", () => {
    const split = release.icd_hcc_map.filter((m) => m.code === "C50.912").sort((a, b) => a.hcc_code.localeCompare(b.hcc_code));
    expect(split).toEqual([
      { code: "C50.912", hcc_code: "HCC22", age_edit: "age < 50", sex_edit: null, mce_age_condition: null },
      { code: "C50.912", hcc_code: "HCC23", age_edit: "age >= 50", sex_edit: null, mce_age_condition: null },
    ]);
  });

  it("maps V28-specific codes as CMS does", () => {
    const hccOf = (code: string) => release.icd_hcc_map.filter((m) => m.code === code).map((m) => m.hcc_code);
    expect(hccOf("Z79.4")).toEqual(["HCC38"]);
    expect(hccOf("F32.A")).toEqual([]);
    expect(hccOf("F33.1")).toEqual(["HCC155"]);
    expect(hccOf("I10")).toEqual([]);
  });

  it("refuses the fixture as a full release", () => {
    expect(() => buildReference(fixtureFiles(), { paymentYear: 2026, model: "V28", expectFullRelease: true })).toThrow(
      /expected 115 V28 HCCs/,
    );
  });

  it("fails loudly on a crosswalk code missing from the order file", () => {
    const files = fixtureFiles();
    files.mappings += "Z9999,38.0,,,\n";
    expect(() => buildReference(files, { paymentYear: 2026, model: "V28", expectFullRelease: false })).toThrow(
      /unknown code Z99.99/,
    );
  });
});
