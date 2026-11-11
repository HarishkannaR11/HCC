import { describe, expect, it } from "vitest";
import { answerKeyItemCreateSchema, chartDetailsSchema, icd10CodeInput } from "../schemas";

const chartId = "c4a17000-0000-4000-8000-000000000001";

const details = {
  chartId,
  title: "Follow-up",
  specialty: "Family Medicine",
  difficulty: "2",
  paymentYear: "2026",
  encounterDate: "2025-10-14",
  patientName: "Synthetic Patient",
  patientDob: "1950-01-01",
  patientSex: "female",
  patientMrn: "SYN-1",
  providerName: "Synthetic Provider, MD",
  facilityName: "Synthetic Clinic",
  isSynthetic: "on",
};

describe("icd10CodeInput", () => {
  it("normalises how coders type codes", () => {
    expect(icd10CodeInput.parse(" e1122 ")).toBe("E11.22");
    expect(icd10CodeInput.parse("e11.22")).toBe("E11.22");
    expect(icd10CodeInput.parse("Z89511")).toBe("Z89.511");
  });

  it("rejects junk", () => {
    expect(icd10CodeInput.safeParse("hello world").success).toBe(false);
    expect(icd10CodeInput.safeParse("").success).toBe(false);
  });
});

describe("chartDetailsSchema", () => {
  it("accepts a complete synthetic header and coerces numbers", () => {
    const parsed = chartDetailsSchema.parse(details);
    expect(parsed.difficulty).toBe(2);
    expect(parsed.paymentYear).toBe(2026);
  });

  it("refuses to save unless the chart is confirmed synthetic", () => {
    const result = chartDetailsSchema.safeParse({ ...details, isSynthetic: undefined });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["isSynthetic"]);
  });

  it("rejects a date of birth after the encounter", () => {
    expect(chartDetailsSchema.safeParse({ ...details, patientDob: "2025-11-01" }).success).toBe(false);
  });

  it("rejects difficulty outside 1-3", () => {
    expect(chartDetailsSchema.safeParse({ ...details, difficulty: "4" }).success).toBe(false);
  });
});

describe("answerKeyItemCreateSchema", () => {
  it("treats a missing checkbox as not required and blank text as null", () => {
    const parsed = answerKeyItemCreateSchema.parse({
      chartId,
      icd10Code: "n18.31",
      supportingExcerpt: "  ",
      rationale: "",
      trapType: "none",
    });
    expect(parsed).toMatchObject({ icd10Code: "N18.31", isRequired: false, supportingExcerpt: null, rationale: null });
  });

  it("rejects an unknown trap type", () => {
    expect(
      answerKeyItemCreateSchema.safeParse({ chartId, icd10Code: "E11.9", trapType: "made_up" }).success,
    ).toBe(false);
  });
});
