/**
 * Code-level review: the teaching layer under the HCC score. Pure.
 *
 * The score compares HCCs; this compares codes, so a learner sees that I10
 * should have been I12.9 even though neither carries an HCC, and which planted
 * trap each mistake fell into.
 */
import { scoreSubmission } from "@/lib/hcc/score";
import type { TrapType } from "@/lib/charts/constants";

export type CodeVerdict =
  | "correct" // on the key, required, submitted
  | "optional" // on the key as acceptable-but-optional, submitted
  | "distractor" // a planted wrong code, submitted
  | "unlisted" // submitted, on neither list
  | "missed"; // required on the key, not submitted

export interface ReviewKeyItem {
  code: string;
  required: boolean;
  trap: TrapType;
}

export interface ReviewDistractor {
  code: string;
  trap: TrapType;
}

export interface CodeReviewLine {
  code: string;
  verdict: CodeVerdict;
  trap: TrapType | null;
}

export interface CodeReview {
  /** Submitted codes in submission order, then missed codes in key order. */
  lines: CodeReviewLine[];
  /** One entry per trap the learner fell into: a missed trap code or a submitted distractor. */
  trapsHit: TrapType[];
  /** One entry per trap the learner got past: a trap code they coded, or a distractor they left out. */
  trapsAvoided: TrapType[];
}

export function reviewCodes(
  submittedCodes: readonly string[],
  key: readonly ReviewKeyItem[],
  distractors: readonly ReviewDistractor[],
): CodeReview {
  const submitted = [...new Set(submittedCodes)];
  const keyByCode = new Map(key.map((k) => [k.code, k]));
  const distractorByCode = new Map(distractors.map((d) => [d.code, d]));
  const required = key.filter((k) => k.required).map((k) => k.code);

  const base = scoreSubmission(submitted, required);
  const missed = base.codes.filter((c) => c.verdict === "missed").map((c) => c.icd10Code);

  const lines: CodeReviewLine[] = submitted.map((code) => {
    const item = keyByCode.get(code);
    if (item) return { code, verdict: item.required ? "correct" : "optional", trap: item.trap };
    const distractor = distractorByCode.get(code);
    if (distractor) return { code, verdict: "distractor", trap: distractor.trap };
    return { code, verdict: "unlisted", trap: null };
  });
  for (const code of missed) lines.push({ code, verdict: "missed", trap: keyByCode.get(code)?.trap ?? null });

  const isTrap = (trap: TrapType | null): trap is TrapType => trap !== null && trap !== "none";
  const submittedSet = new Set(submitted);
  const trapsHit: TrapType[] = [];
  const trapsAvoided: TrapType[] = [];

  for (const item of key) {
    if (!item.required || !isTrap(item.trap)) continue;
    (submittedSet.has(item.code) ? trapsAvoided : trapsHit).push(item.trap);
  }
  for (const d of distractors) {
    if (!isTrap(d.trap)) continue;
    (submittedSet.has(d.code) ? trapsHit : trapsAvoided).push(d.trap);
  }

  return { lines, trapsHit, trapsAvoided };
}
