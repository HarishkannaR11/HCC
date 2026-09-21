import { describe, expect, it } from "vitest";
import { computeCapturedRaf } from "../raf";
import type { ReferenceSlice } from "../types";

/**
 * A small slice of real V28 data, hand-copied from the CMS PY2026 model
 * software package (the same numbers scripts/verify-reference-data.ts checks
 * the loaded database against). Diabetes (HCC35/36/37/38) and kidney disease
 * (HCC326-329) both carry real hierarchy suppression; COPD (HCC280) carries a
 * real age edit; breast cancer (HCC22/23) carries a real age-split edit.
 */
function referenceFixture(): ReferenceSlice {
  return {
    mappings: [
      { icd10Code: "E11.22", hccCategory: 37, ageEdit: null, sexEdit: null, mceAgeCondition: null },
      { icd10Code: "E11.9", hccCategory: 38, ageEdit: null, sexEdit: null, mceAgeCondition: null },
      { icd10Code: "N18.31", hccCategory: 329, ageEdit: null, sexEdit: null, mceAgeCondition: null },
      { icd10Code: "N18.4", hccCategory: 327, ageEdit: null, sexEdit: null, mceAgeCondition: null },
      { icd10Code: "J44.9", hccCategory: 280, ageEdit: "age >= 18", sexEdit: null, mceAgeCondition: null },
      { icd10Code: "E78.5", hccCategory: -1, ageEdit: null, sexEdit: null, mceAgeCondition: null }, // never reached; E78.5 has no HCC in reality
      { icd10Code: "C50.011", hccCategory: 22, ageEdit: "age < 50", sexEdit: null, mceAgeCondition: null },
      { icd10Code: "C50.011", hccCategory: 23, ageEdit: "age >= 50", sexEdit: null, mceAgeCondition: null },
    ].filter((m) => m.icd10Code !== "E78.5"), // E78.5 maps to no HCC; keep it out of the crosswalk fixture entirely
    weights: new Map([
      [37, { category: 37, label: "Diabetes with Chronic Complications", family: "diabetes", rafWeight: 0.166 }],
      [38, { category: 38, label: "Diabetes with No, Glycemic, or Unspecified Complications", family: "diabetes", rafWeight: 0.166 }],
      [329, { category: 329, label: "Chronic Kidney Disease, Moderate (Stage 3, Except 3B)", family: "kidney", rafWeight: 0.127 }],
      [327, { category: 327, label: "Chronic Kidney Disease, Severe (Stage 4)", family: "kidney", rafWeight: 0.237 }],
      [280, { category: 280, label: "Chronic Obstructive Pulmonary Disease...", family: "chr-lung", rafWeight: 0.319 }],
      [22, { category: 22, label: "Breast, Prostate, and Other Cancers and Tumors (under 50)", family: "cancer", rafWeight: 0.363 }],
      [23, { category: 23, label: "Breast, Prostate, and Other Cancers and Tumors (50+)", family: "cancer", rafWeight: 0.186 }],
    ]),
    suppressions: [
      { category: 37, suppressed: 38 },
      { category: 327, suppressed: 329 },
    ],
  };
}

describe("computeCapturedRaf", () => {
  it("sums the coefficients for the seed chart (T2DM+CKD, CKD3a, COPD, no HCC for hyperlipidemia)", () => {
    const result = computeCapturedRaf(
      ["E11.22", "N18.31", "J44.9", "E78.5"],
      { age: 72, sex: "male" },
      referenceFixture(),
    );

    expect(result.totalRaf).toBeCloseTo(0.612, 3);
    expect(result.capturedHccs).toEqual([37, 280, 329]);

    const hyperlipidemia = result.codes.find((c) => c.icd10Code === "E78.5");
    expect(hyperlipidemia?.mapsToHcc).toBe(false);
    expect(hyperlipidemia?.scoredWeight).toBe(0);
  });

  it("suppresses a milder HCC in the same family (HCC37 knocks out HCC38)", () => {
    const result = computeCapturedRaf(["E11.22", "E11.9"], { age: 72, sex: "male" }, referenceFixture());

    const severe = result.codes.find((c) => c.icd10Code === "E11.22")!.mappings[0];
    const milder = result.codes.find((c) => c.icd10Code === "E11.9")!.mappings[0];

    expect(severe.counted).toBe(true);
    expect(milder.counted).toBe(false);
    expect(milder.suppressedBy).toBe(37);
    expect(milder.scoredWeight).toBe(0);
    expect(result.totalRaf).toBeCloseTo(0.166, 3);
    expect(result.capturedHccs).toEqual([37]);
  });

  it("suppresses regardless of claim order (severe HCC added after the milder one)", () => {
    const result = computeCapturedRaf(["N18.31", "N18.4"], { age: 72, sex: "male" }, referenceFixture());
    // N18.4 -> HCC327 (severe) suppresses N18.31 -> HCC329 (milder), even
    // though the milder code was claimed first.
    const stage3 = result.codes.find((c) => c.icd10Code === "N18.31")!.mappings[0];
    expect(stage3.counted).toBe(false);
    expect(stage3.suppressedBy).toBe(327);
    expect(result.totalRaf).toBeCloseTo(0.237, 3);
  });

  it("excludes a mapping whose age edit the patient fails, and reports why", () => {
    const child = computeCapturedRaf(["J44.9"], { age: 10, sex: "male" }, referenceFixture());
    const mapping = child.codes[0].mappings[0];
    expect(mapping.counted).toBe(false);
    expect(mapping.excludedByEdit).toBe("age >= 18");
    expect(child.totalRaf).toBe(0);

    const adult = computeCapturedRaf(["J44.9"], { age: 72, sex: "male" }, referenceFixture());
    expect(adult.totalRaf).toBeCloseTo(0.319, 3);
  });

  it("resolves an age-split code to exactly one HCC per patient", () => {
    const under50 = computeCapturedRaf(["C50.011"], { age: 42, sex: "female" }, referenceFixture());
    expect(under50.capturedHccs).toEqual([22]);
    expect(under50.totalRaf).toBeCloseTo(0.363, 3);

    const over50 = computeCapturedRaf(["C50.011"], { age: 61, sex: "female" }, referenceFixture());
    expect(over50.capturedHccs).toEqual([23]);
    expect(over50.totalRaf).toBeCloseTo(0.186, 3);
  });

  it("counts a shared HCC only once when two codes both map to it", () => {
    // E11.22 and a second chronic-complication diabetes code both map to
    // HCC37; claiming both must not double the weight.
    const reference = referenceFixture();
    reference.mappings.push({
      icd10Code: "E11.21",
      hccCategory: 37,
      ageEdit: null,
      sexEdit: null,
      mceAgeCondition: null,
    });

    const result = computeCapturedRaf(["E11.22", "E11.21"], { age: 72, sex: "male" }, reference);
    expect(result.totalRaf).toBeCloseTo(0.166, 3);
    expect(result.capturedHccs).toEqual([37]);

    const second = result.codes.find((c) => c.icd10Code === "E11.21")!.mappings[0];
    expect(second.duplicateOf).toBe("E11.22");
    expect(second.counted).toBe(false);
  });

  it("avoids floating point drift when summing several coefficients", () => {
    const result = computeCapturedRaf(["E11.22", "N18.31", "J44.9"], { age: 72, sex: "male" }, referenceFixture());
    expect(result.totalRaf).toBe(0.612);
  });
});
