import { describe, expect, it } from "vitest";
import { reviewCodes, type ReviewDistractor, type ReviewKeyItem } from "../review";

const key: ReviewKeyItem[] = [
  { code: "I50.22", required: true, trap: "unspecified_when_specific_exists" },
  { code: "I48.19", required: true, trap: "none" },
  { code: "Z85.3", required: true, trap: "status_vs_history" },
  { code: "Z79.01", required: false, trap: "none" },
];
const distractors: ReviewDistractor[] = [
  { code: "C50.912", trap: "status_vs_history" },
  { code: "I50.23", trap: "missing_acuity" },
  { code: "M06.9", trap: "no_treatment_documented" },
];

describe("reviewCodes", () => {
  it("labels every submitted and missed code", () => {
    const review = reviewCodes(["I50.22", "C50.912", "Z79.01", "I10"], key, distractors);
    expect(review.lines).toEqual([
      { code: "I50.22", verdict: "correct", trap: "unspecified_when_specific_exists" },
      { code: "C50.912", verdict: "distractor", trap: "status_vs_history" },
      { code: "Z79.01", verdict: "optional", trap: "none" },
      { code: "I10", verdict: "unlisted", trap: null },
      { code: "I48.19", verdict: "missed", trap: "none" },
      { code: "Z85.3", verdict: "missed", trap: "status_vs_history" },
    ]);
  });

  it("fires the status-vs-history trap twice: the active-cancer code coded, the history code missed", () => {
    const review = reviewCodes(["I50.22", "I48.19", "C50.912"], key, distractors);
    expect(review.trapsHit.sort()).toEqual(["status_vs_history", "status_vs_history"]);
    expect(review.trapsAvoided.sort()).toEqual([
      "missing_acuity",
      "no_treatment_documented",
      "unspecified_when_specific_exists",
    ]);
  });

  it("counts every trap as avoided on a clean submission", () => {
    const review = reviewCodes(["I50.22", "I48.19", "Z85.3"], key, distractors);
    expect(review.trapsHit).toEqual([]);
    expect(review.trapsAvoided).toHaveLength(5);
  });
});
