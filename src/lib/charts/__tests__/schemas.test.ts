import { describe, expect, it } from "vitest";
import { chartMetaSchema, excerptsNotInChart, keyItemSchema } from "../schemas";

const validChart = {
  title: "Diabetes follow-up",
  specialty: "Family Medicine",
  difficulty: "2",
  payment_year: "2026",
  encounter_date: "2025-09-12",
  patient_name: "Walter Brennick",
  patient_dob: "1953-03-14",
  patient_sex: "male",
  patient_mrn: "syn-100142",
  provider_name: "Priya Raman, MD",
  facility_name: "Riverbend Family Practice",
  confirm_synthetic: "on",
};

describe("chartMetaSchema", () => {
  it("accepts a valid synthetic chart and normalises the MRN", () => {
    const parsed = chartMetaSchema.parse(validChart);
    expect(parsed.patient_mrn).toBe("SYN-100142");
    expect(parsed.difficulty).toBe(2);
  });

  it("requires the synthetic confirmation", () => {
    const rest = Object.fromEntries(Object.entries(validChart).filter(([key]) => key !== "confirm_synthetic"));
    expect(chartMetaSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an MRN that is not marked synthetic", () => {
    expect(chartMetaSchema.safeParse({ ...validChart, patient_mrn: "00482913" }).success).toBe(false);
  });

  it("rejects a date of service outside the payment year's service year", () => {
    const result = chartMetaSchema.safeParse({ ...validChart, encounter_date: "2026-01-05" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/PY2026 uses 2025/);
  });

  it("rejects a date of birth after the encounter", () => {
    expect(chartMetaSchema.safeParse({ ...validChart, patient_dob: "2025-10-01" }).success).toBe(false);
  });
});

describe("keyItemSchema", () => {
  it("normalises the code to its dotted form and reads the checkbox", () => {
    const parsed = keyItemSchema.parse({ icd10_code: " e1122 ", is_required: "on", supporting_excerpt: "", rationale: "x", trap_type: "none" });
    expect(parsed).toMatchObject({ icd10_code: "E11.22", is_required: true, supporting_excerpt: null });
    expect(keyItemSchema.parse({ icd10_code: "J44.9", trap_type: "none", supporting_excerpt: "", rationale: "" }).is_required).toBe(false);
  });

  it("rejects junk codes and unknown trap types", () => {
    expect(keyItemSchema.safeParse({ icd10_code: "hello", trap_type: "none", supporting_excerpt: "", rationale: "" }).success).toBe(false);
    expect(keyItemSchema.safeParse({ icd10_code: "E11.9", trap_type: "nope", supporting_excerpt: "", rationale: "" }).success).toBe(false);
  });
});

describe("excerptsNotInChart", () => {
  it("lists excerpts that are not verbatim chart text", () => {
    const sections = ["1. Type 2 diabetes with diabetic CKD, stage 3a.", "COPD, stable."];
    expect(excerptsNotInChart(["stage 3a", null, "COPD, stable", "stage 3b"], sections)).toEqual(["stage 3b"]);
  });
});
