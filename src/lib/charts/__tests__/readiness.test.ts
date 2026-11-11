import { describe, expect, it } from "vitest";
import { chartReadiness, excerptAppearsInChart, isPublishable, type ReadinessInput } from "../readiness";

const base: ReadinessInput = {
  isSynthetic: true,
  paymentYear: 2026,
  encounterDate: "2025-10-14",
  sections: [
    { sectionType: "assessment_plan", content: "1. Type 2 diabetes mellitus with diabetic\nchronic kidney disease." },
    { sectionType: "signature", content: "Electronically signed." },
  ],
  answerKey: [{ icd10Code: "E11.22", isRequired: true, supportingExcerpt: "diabetic chronic kidney disease" }],
  distractors: [{ icd10Code: "E11.9" }],
};

const failing = (input: ReadinessInput) =>
  chartReadiness(input)
    .filter((c) => !c.ok)
    .map((c) => c.id);

describe("excerptAppearsInChart", () => {
  it("ignores line wrapping and case", () => {
    expect(excerptAppearsInChart("TYPE 2 diabetes mellitus with diabetic chronic", base.sections)).toBe(true);
  });

  it("rejects text that is not in the note", () => {
    expect(excerptAppearsInChart("diabetic retinopathy", base.sections)).toBe(false);
    expect(excerptAppearsInChart("   ", base.sections)).toBe(false);
  });
});

describe("chartReadiness", () => {
  it("passes a complete chart", () => {
    expect(failing(base)).toEqual([]);
    expect(isPublishable(chartReadiness(base))).toBe(true);
  });

  it("blocks a chart with no required answer-key code", () => {
    const checks = chartReadiness({ ...base, answerKey: [{ ...base.answerKey[0], isRequired: false }] });
    expect(isPublishable(checks)).toBe(false);
  });

  it("blocks an excerpt that does not appear in the chart", () => {
    const input = { ...base, answerKey: [{ ...base.answerKey[0], supportingExcerpt: "stage 4" }] };
    expect(failing(input)).toContain("excerpts-match");
    expect(isPublishable(chartReadiness(input))).toBe(false);
  });

  it("blocks a chart without an assessment and plan", () => {
    const input = { ...base, sections: [{ sectionType: "hpi" as const, content: "diabetic chronic kidney disease" }] };
    expect(isPublishable(chartReadiness(input))).toBe(false);
  });

  it("only advises on the date-of-service year", () => {
    const input = { ...base, encounterDate: "2026-03-01" };
    expect(failing(input)).toEqual(["service-year"]);
    expect(isPublishable(chartReadiness(input))).toBe(true);
  });

  it("blocks a chart not marked synthetic", () => {
    expect(isPublishable(chartReadiness({ ...base, isSynthetic: false }))).toBe(false);
  });
});
