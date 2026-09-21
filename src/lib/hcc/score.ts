/**
 * Submission scoring: correct / missed / extra against the answer key.
 *
 * Deliberately separate from raf.ts — a code can be a scoring "extra" (not on
 * the key) while still capturing an HCC, and the two questions ("did the coder
 * get it right" and "what did they get paid") have different denominators.
 */

export type Verdict = "correct" | "missed" | "extra";

export interface ScoredCode {
  icd10Code: string;
  verdict: Verdict;
}

export interface ScoreResult {
  codes: ScoredCode[];
  correctCount: number;
  missedCount: number;
  extraCount: number;
  /** correctCount / expected.length, or 1 when the chart expects nothing. */
  accuracy: number;
}

export function scoreSubmission(
  submitted: readonly string[],
  expected: readonly string[],
): ScoreResult {
  const submittedSet = new Set(submitted);
  const expectedSet = new Set(expected);

  const codes: ScoredCode[] = [
    ...expected.map((icd10Code): ScoredCode => ({
      icd10Code,
      verdict: submittedSet.has(icd10Code) ? "correct" : "missed",
    })),
    ...submitted
      .filter((code) => !expectedSet.has(code))
      .map((icd10Code): ScoredCode => ({ icd10Code, verdict: "extra" as const })),
  ];

  const correctCount = codes.filter((c) => c.verdict === "correct").length;
  const missedCount = codes.filter((c) => c.verdict === "missed").length;
  const extraCount = codes.filter((c) => c.verdict === "extra").length;

  return {
    codes,
    correctCount,
    missedCount,
    extraCount,
    accuracy: expectedSet.size === 0 ? 1 : correctCount / expectedSet.size,
  };
}
