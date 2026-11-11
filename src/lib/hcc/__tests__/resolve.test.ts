import { describe, expect, it } from "vitest";
import { ageOn, applicableMappings, primaryMapping, type EditedMapping } from "../resolve";

const row = (hccCode: string, edits: Partial<EditedMapping> = {}): EditedMapping => ({
  hccCode,
  ageEdit: null,
  sexEdit: null,
  mceAgeCondition: null,
  ...edits,
});

describe("ageOn", () => {
  it("counts whole years, not crossing the birthday early", () => {
    expect(ageOn("1953-03-14", "2025-09-12")).toBe(72);
    expect(ageOn("1953-09-13", "2025-09-12")).toBe(71);
    expect(ageOn("1953-09-12", "2025-09-12")).toBe(72);
  });

  it("rejects malformed dates and a birth after the encounter", () => {
    expect(() => ageOn("03/14/1953", "2025-09-12")).toThrow();
    expect(() => ageOn("2026-01-01", "2025-09-12")).toThrow();
  });
});

describe("primaryMapping", () => {
  // C50.912: CMS splits the breast cancer HCC on age 50.
  const breast = [row("HCC22", { ageEdit: "age < 50" }), row("HCC23", { ageEdit: "age >= 50" })];

  it("resolves an age-split code to the HCC the patient's age selects", () => {
    expect(primaryMapping(breast, { age: 42, sex: "female" })?.hccCode).toBe("HCC22");
    expect(primaryMapping(breast, { age: 80, sex: "female" })?.hccCode).toBe("HCC23");
  });

  it("returns null when no mapping applies or the code has none", () => {
    expect(primaryMapping([row("HCC280", { ageEdit: "age >= 18" })], { age: 12, sex: "male" })).toBeNull();
    expect(primaryMapping([], { age: 72, sex: "male" })).toBeNull();
  });

  it("orders by HCC number, not by string", () => {
    const both = [row("HCC6"), row("HCC2")];
    expect(primaryMapping(both, { age: 70, sex: "female" })?.hccCode).toBe("HCC2");
    const wide = [row("HCC155"), row("HCC37")];
    expect(primaryMapping(wide, { age: 70, sex: "female" })?.hccCode).toBe("HCC37");
  });

  it("applies sex and MCE edits", () => {
    expect(applicableMappings([row("HCC48", { mceAgeCondition: "age >= 15" })], { age: 14, sex: "male" })).toEqual([]);
    expect(applicableMappings([row("HCC112", { sexEdit: "2.0" })], { age: 70, sex: "male" })).toEqual([]);
    expect(applicableMappings([row("HCC112", { sexEdit: "2.0" })], { age: 70, sex: "female" })).toHaveLength(1);
  });
});
