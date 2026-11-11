import { describe, expect, it } from "vitest";
import { applicableMappings, primaryHccCategoryId, type CodeMapping } from "../derive-hcc";

const mapping = (overrides: Partial<CodeMapping>): CodeMapping => ({
  hccCategoryId: 1,
  hccNumber: 1,
  hccCode: "HCC1",
  label: "",
  raf: 0,
  ageEdit: null,
  sexEdit: null,
  mceAgeCondition: null,
  ...overrides,
});

// C50.011 splits on age: HCC22 under 50, HCC23 at 50 or over.
const breast = [
  mapping({ hccCategoryId: 122, hccNumber: 22, hccCode: "HCC22", ageEdit: "age < 50" }),
  mapping({ hccCategoryId: 123, hccNumber: 23, hccCode: "HCC23", ageEdit: "age >= 50" }),
];

describe("applicableMappings", () => {
  it("applies the CMS age edit", () => {
    expect(applicableMappings(breast, { age: 49, sex: "female" }).map((m) => m.hccCode)).toEqual(["HCC22"]);
    expect(applicableMappings(breast, { age: 50, sex: "female" }).map((m) => m.hccCode)).toEqual(["HCC23"]);
  });

  it("applies the CMS sex edit", () => {
    const femaleOnly = [mapping({ hccNumber: 112, sexEdit: "2.0" })];
    expect(applicableMappings(femaleOnly, { age: 70, sex: "male" })).toEqual([]);
    expect(applicableMappings(femaleOnly, { age: 70, sex: "female" })).toHaveLength(1);
  });
});

describe("primaryHccCategoryId", () => {
  it("is null for a code with no HCC", () => {
    expect(primaryHccCategoryId([], { age: 70, sex: "male" })).toBeNull();
  });

  it("picks the lower-numbered HCC when a code captures two", () => {
    const dual = [mapping({ hccCategoryId: 900, hccNumber: 115 }), mapping({ hccCategoryId: 800, hccNumber: 2 })];
    expect(primaryHccCategoryId(dual, { age: 70, sex: "male" })).toBe(800);
  });

  it("follows the edit, not the list order", () => {
    expect(primaryHccCategoryId(breast, { age: 72, sex: "female" })).toBe(123);
  });
});
