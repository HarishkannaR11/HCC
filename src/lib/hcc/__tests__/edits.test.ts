import { describe, expect, it } from "vitest";
import { satisfiesAgeCondition, satisfiesSexEdit } from "../edits";

describe("satisfiesAgeCondition", () => {
  it("treats a missing condition as unconditional", () => {
    expect(satisfiesAgeCondition(null, 5)).toBe(true);
    expect(satisfiesAgeCondition(undefined, 5)).toBe(true);
    expect(satisfiesAgeCondition("", 5)).toBe(true);
  });

  it("evaluates simple comparisons", () => {
    expect(satisfiesAgeCondition("age < 50", 49)).toBe(true);
    expect(satisfiesAgeCondition("age < 50", 50)).toBe(false);
    expect(satisfiesAgeCondition("age >= 50", 50)).toBe(true);
    expect(satisfiesAgeCondition("age >= 50", 49)).toBe(false);
    expect(satisfiesAgeCondition("age >= 18", 72)).toBe(true);
  });

  it("evaluates the MCE band form", () => {
    expect(satisfiesAgeCondition("0 <= age <= 17", 17)).toBe(true);
    expect(satisfiesAgeCondition("0 <= age <= 17", 18)).toBe(false);
  });

  it("is case-insensitive and tolerates whitespace", () => {
    expect(satisfiesAgeCondition(" AGE >= 18 ", 72)).toBe(true);
  });

  it("throws on an unrecognised shape rather than silently passing", () => {
    expect(() => satisfiesAgeCondition("between 1 and 2", 5)).toThrow();
  });
});

describe("satisfiesSexEdit", () => {
  it("treats a missing edit as unconditional", () => {
    expect(satisfiesSexEdit(null, "male")).toBe(true);
    expect(satisfiesSexEdit(undefined, "female")).toBe(true);
  });

  it("maps CMS sex codes as published ('1.0' male, '2.0' female)", () => {
    expect(satisfiesSexEdit("1.0", "male")).toBe(true);
    expect(satisfiesSexEdit("1.0", "female")).toBe(false);
    expect(satisfiesSexEdit("2.0", "female")).toBe(true);
    expect(satisfiesSexEdit("2.0", "male")).toBe(false);
  });

  it("throws on an unrecognised code", () => {
    expect(() => satisfiesSexEdit("X", "male")).toThrow();
  });
});
