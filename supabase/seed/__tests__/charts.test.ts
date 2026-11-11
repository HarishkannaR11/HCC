import { describe, expect, it } from "vitest";
import { computeCapturedRaf } from "@/lib/hcc/raf";
import type { ReferenceSlice } from "@/lib/hcc/types";
import { ageForPaymentYear, serviceYearFor } from "@/lib/hcc/age";
import { chartReadiness, isPublishable } from "@/lib/charts/readiness";
import { SEED_CHARTS } from "../charts";

/**
 * PY2026 V28 values for every HCC-mapped code the seed charts use, as listed
 * in the CMS model software (mapping, community non-dual aged coefficient,
 * hierarchy). A reviewer can check each line against the CMS files; the seed
 * script re-derives them from the loaded database when it runs.
 */
const V28_SLICE: ReferenceSlice = {
  mappings: [
    ["E11.22", 37], ["E11.42", 37], ["E11.9", 38], ["E11.65", 38], ["Z79.4", 38],
    ["N18.30", 329], ["N18.31", 329], ["N18.4", 327], ["N18.5", 326],
    ["J44.9", 280], ["J44.1", 280],
    ["I11.0", 226], ["I50.22", 226], ["I50.23", 224], ["I42.0", 227],
    ["I48.19", 238], ["I48.91", 238],
    ["C50.912", 23], ["M06.9", 93], ["Z89.511", 409], ["F33.1", 155],
  ].map(([icd10Code, hccCategory]) => ({
    icd10Code: icd10Code as string,
    hccCategory: hccCategory as number,
    ageEdit: null,
    sexEdit: null,
    mceAgeCondition: null,
  })),
  weights: new Map(
    (
      [
        [23, 0.186], [37, 0.166], [38, 0.166], [93, 0.617], [155, 0.299], [224, 0.36], [226, 0.36], [227, 0.189],
        [238, 0.299], [280, 0.319], [326, 0.815], [327, 0.514], [329, 0.127], [409, 0.598],
      ] as const
    ).map(([category, rafWeight]) => [category, { category, label: `HCC${category}`, family: "", rafWeight }]),
  ),
  suppressions: [
    [37, 38], [224, 226], [224, 227], [226, 227], [326, 327], [326, 329], [327, 329],
  ].map(([category, suppressed]) => ({ category, suppressed })),
};

const CPT_LIKE = /\b\d{4}[0-9FTU]\b/;

describe.each(SEED_CHARTS)("seed chart: $title", (chart) => {
  const patient = { age: ageForPaymentYear(chart.patient.dob, chart.paymentYear), sex: chart.patient.sex };
  const text = chart.sections.map((s) => s.content).join("\n");

  it("scores exactly the documented RAF after hierarchy trimming", () => {
    const required = chart.answerKey.filter((k) => k.required).map((k) => k.code);
    const result = computeCapturedRaf(required, patient, V28_SLICE);

    expect(result.totalRaf).toBe(chart.expected.raf);
    expect(result.capturedHccs.map((h) => `HCC${h}`)).toEqual(
      [...chart.expected.scoringHccs].sort((a, b) => Number(a.slice(3)) - Number(b.slice(3))),
    );

    const trimmed = result.codes
      .flatMap((c) => c.mappings)
      .filter((m) => m.suppressedBy !== null)
      .map((m) => `HCC${m.hccCategory}`);
    expect([...new Set(trimmed)]).toEqual(chart.expected.trimmedHccs);
  });

  it("optional codes carry no HCC, so leaving them out never costs RAF", () => {
    const optional = chart.answerKey.filter((k) => !k.required).map((k) => k.code);
    expect(computeCapturedRaf(optional, patient, V28_SLICE).totalRaf).toBe(0);
  });

  it("passes every blocking publish check", () => {
    const checks = chartReadiness({
      isSynthetic: true,
      paymentYear: chart.paymentYear,
      encounterDate: chart.encounterDate,
      sections: chart.sections.map((s) => ({ sectionType: s.type, content: s.content })),
      answerKey: chart.answerKey.map((k) => ({ icd10Code: k.code, isRequired: k.required, supportingExcerpt: k.excerpt })),
      distractors: chart.distractors.map((d) => ({ icd10Code: d.code })),
    });
    expect(checks.filter((c) => !c.ok).map((c) => c.id)).toEqual([]);
    expect(isPublishable(checks)).toBe(true);
  });

  it("is dated in the dates-of-service year for its payment year", () => {
    expect(Number(chart.encounterDate.slice(0, 4))).toBe(serviceYearFor(chart.paymentYear));
  });

  it("uses a synthetic MRN and contains nothing that looks like a CPT code", () => {
    expect(chart.patient.mrn).toMatch(/^SYN-\d+$/);
    expect(text).not.toMatch(CPT_LIKE);
    expect(chart.answerKey.map((k) => k.rationale).join(" ")).not.toMatch(CPT_LIKE);
  });

  it("never lists a code as both right and wrong", () => {
    const key = new Set(chart.answerKey.map((k) => k.code));
    expect(chart.distractors.filter((d) => key.has(d.code))).toEqual([]);
  });

  it("explains every distractor and plants at least one trap", () => {
    expect(chart.distractors.length).toBeGreaterThan(0);
    expect(chart.distractors.every((d) => d.whyWrong.length > 40)).toBe(true);
    expect([...chart.answerKey, ...chart.distractors].some((x) => x.trap !== "none")).toBe(true);
  });
});

it("has unique, stable chart ids", () => {
  expect(new Set(SEED_CHARTS.map((c) => c.id)).size).toBe(SEED_CHARTS.length);
});
