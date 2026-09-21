import { describe, expect, it } from "vitest";
import { scoreSubmission } from "../score";

describe("scoreSubmission", () => {
  it("scores an exact match as all correct", () => {
    const result = scoreSubmission(["E11.22", "N18.31"], ["E11.22", "N18.31"]);
    expect(result.codes).toEqual([
      { icd10Code: "E11.22", verdict: "correct" },
      { icd10Code: "N18.31", verdict: "correct" },
    ]);
    expect(result.correctCount).toBe(2);
    expect(result.missedCount).toBe(0);
    expect(result.extraCount).toBe(0);
    expect(result.accuracy).toBe(1);
  });

  it("flags an expected code the coder never submitted as missed", () => {
    const result = scoreSubmission(["E11.22"], ["E11.22", "N18.31"]);
    expect(result.codes).toContainEqual({ icd10Code: "N18.31", verdict: "missed" });
    expect(result.missedCount).toBe(1);
    expect(result.accuracy).toBe(0.5);
  });

  it("flags a submitted code not on the answer key as extra", () => {
    const result = scoreSubmission(["E11.22", "E78.5"], ["E11.22"]);
    expect(result.codes).toContainEqual({ icd10Code: "E78.5", verdict: "extra" });
    expect(result.extraCount).toBe(1);
    // Accuracy is measured against the key, not diluted by an overcode.
    expect(result.accuracy).toBe(1);
  });

  it("handles a chart with no expected codes without dividing by zero", () => {
    const result = scoreSubmission(["E78.5"], []);
    expect(result.accuracy).toBe(1);
    expect(result.extraCount).toBe(1);
  });

  it("does not double-count a duplicated submission", () => {
    const result = scoreSubmission(["E11.22", "E11.22"], ["E11.22"]);
    expect(result.codes).toEqual([{ icd10Code: "E11.22", verdict: "correct" }]);
  });
});
