import { describe, expect, it } from "vitest";
import { ageForPaymentYear, serviceYearFor } from "../age";

describe("ageForPaymentYear (CMS: completed years on Feb 1 of the payment year)", () => {
  it("counts a birthday in January as reached", () => {
    expect(ageForPaymentYear("1950-01-31", 2026)).toBe(76);
  });

  it("counts a birthday on Feb 1 as reached", () => {
    expect(ageForPaymentYear("1950-02-01", 2026)).toBe(76);
  });

  it("does not count a birthday from Feb 2 onward", () => {
    expect(ageForPaymentYear("1950-02-02", 2026)).toBe(75);
    expect(ageForPaymentYear("1950-12-31", 2026)).toBe(75);
  });

  it("handles the breast-cancer age-50 edit boundary", () => {
    expect(ageForPaymentYear("1976-01-15", 2026)).toBe(50);
    expect(ageForPaymentYear("1976-03-15", 2026)).toBe(49);
  });

  it("rejects anything that is not an ISO date", () => {
    expect(() => ageForPaymentYear("02/01/1950", 2026)).toThrow(/ISO date/);
  });

  it("maps a payment year to its dates-of-service year", () => {
    expect(serviceYearFor(2026)).toBe(2025);
  });
});
