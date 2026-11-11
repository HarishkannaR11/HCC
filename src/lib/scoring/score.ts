/**
 * Attempt scoring. Pure: everything comes in as arguments, nothing is fetched,
 * no LLM anywhere near it. The same inputs always give the same score.
 *
 *   1. Resolve each code to its HCCs for this patient (CMS age/sex edits).
 *   2. Trim each side with the V28 hierarchy (CMS suppression pairs).
 *   3. Compare the trimmed sets: captured / missed / over-coded.
 *   4. recall = captured / (captured + missed); precision = captured / (captured + over-coded);
 *      each is 1 when its denominator is 0.
 *   5. RAF = sum of community non-dual aged coefficients over each trimmed set.
 *   6. score = SCORE_WEIGHTS blend of recall, precision and RAF accuracy.
 *
 * Steps 1, 2 and 5 are computeCapturedRaf (src/lib/hcc/raf.ts), the engine the
 * encoder's running total also uses, so the tray and the result cannot disagree.
 */
import { computeCapturedRaf, type RafResult } from "@/lib/hcc/raf";
import type { Patient, ReferenceSlice } from "@/lib/hcc/types";
import { SCORE_WEIGHTS, type ScoreWeights } from "./weights";

export interface KeyCode {
  code: string;
  /** Optional ("acceptable") codes are set aside: never a miss, never an over-code. */
  required: boolean;
}

export interface MappingResolution {
  hcc: number;
  counted: boolean;
  /** A more severe HCC on the same side that knocked this one out. */
  suppressedBy: number | null;
  /** An earlier code on the same side that already captured this HCC. */
  duplicateOf: string | null;
  /** The CMS edit this patient fails, e.g. 'age >= 50'. */
  excludedByEdit: string | null;
}

export interface CodeResolution {
  code: string;
  mappings: MappingResolution[];
}

export interface SideScore {
  /** HCCs that score, after edits, de-duplication and hierarchy trimming. */
  hccs: number[];
  /** HCCs that were present but suppressed by a more severe HCC. */
  trimmed: { hcc: number; suppressedBy: number }[];
  raf: number;
  codes: CodeResolution[];
}

export interface HccLabel {
  code: string;
  label: string;
  raf: number;
}

export interface AttemptScore {
  user: SideScore;
  key: SideScore;
  captured: number[];
  missed: number[];
  overCoded: number[];
  /** Submitted codes that capture no HCC for this patient. Not errors. */
  noHccImpact: string[];
  /** Submitted codes that are optional on the key, left out of the HCC comparison. */
  optionalSetAside: string[];
  recall: number;
  precision: number;
  rafDelta: number;
  /** 1 − |Δ| / key RAF, floored at 0. */
  rafAccuracy: number;
  /** 0–100, two decimals. */
  scorePct: number;
  weights: ScoreWeights;
  /** Labels and coefficients for every HCC mentioned above, as of scoring. */
  hccLabels: Record<string, HccLabel>;
}

const THOUSANDTHS = 1000;
const toThousandths = (value: number) => Math.round(value * THOUSANDTHS);

function side(result: RafResult): SideScore {
  const trimmed = new Map<number, number>();
  const codes = result.codes.map((c) => ({
    code: c.icd10Code,
    mappings: c.mappings.map((m) => {
      if (m.suppressedBy !== null) trimmed.set(m.hccCategory, m.suppressedBy);
      return {
        hcc: m.hccCategory,
        counted: m.counted,
        suppressedBy: m.suppressedBy,
        duplicateOf: m.duplicateOf,
        excludedByEdit: m.excludedByEdit,
      };
    }),
  }));

  return {
    hccs: result.capturedHccs,
    trimmed: [...trimmed].map(([hcc, suppressedBy]) => ({ hcc, suppressedBy })).sort((a, b) => a.hcc - b.hcc),
    raf: result.totalRaf,
    codes,
  };
}

const ratio = (numerator: number, denominator: number) => (denominator === 0 ? 1 : numerator / denominator);

/** RAF accuracy. With an HCC-free key, only an HCC-free submission is accurate. */
export function rafAccuracy(rafUser: number, rafKey: number): number {
  if (rafKey === 0) return rafUser === 0 ? 1 : 0;
  const delta = Math.abs(toThousandths(rafUser) - toThousandths(rafKey)) / THOUSANDTHS;
  return Math.max(0, 1 - delta / rafKey);
}

export function blendScore(
  parts: { recall: number; precision: number; rafAccuracy: number },
  weights: ScoreWeights = SCORE_WEIGHTS,
): number {
  const raw = weights.recall * parts.recall + weights.precision * parts.precision + weights.raf * parts.rafAccuracy;
  return Math.round(raw * 100 * 100) / 100;
}

export function scoreAttempt(input: {
  submitted: readonly string[];
  key: readonly KeyCode[];
  patient: Patient;
  reference: ReferenceSlice;
  weights?: ScoreWeights;
}): AttemptScore {
  const weights = input.weights ?? SCORE_WEIGHTS;
  const submitted = [...new Set(input.submitted)];
  const optional = new Set(input.key.filter((k) => !k.required).map((k) => k.code));
  const required = input.key.filter((k) => k.required).map((k) => k.code);

  const scoredSubmission = submitted.filter((code) => !optional.has(code));
  const userResult = computeCapturedRaf(scoredSubmission, input.patient, input.reference);
  const keyResult = computeCapturedRaf(required, input.patient, input.reference);

  const user = side(userResult);
  const key = side(keyResult);

  const userSet = new Set(user.hccs);
  const keySet = new Set(key.hccs);
  const captured = user.hccs.filter((h) => keySet.has(h));
  const missed = key.hccs.filter((h) => !userSet.has(h));
  const overCoded = user.hccs.filter((h) => !keySet.has(h));

  const recall = ratio(captured.length, captured.length + missed.length);
  const precision = ratio(captured.length, captured.length + overCoded.length);
  const rafDelta = (toThousandths(user.raf) - toThousandths(key.raf)) / THOUSANDTHS;
  const accuracy = rafAccuracy(user.raf, key.raf);

  const noHccImpact = user.codes
    .filter((c) => c.mappings.every((m) => m.excludedByEdit !== null))
    .map((c) => c.code);

  const hccLabels: Record<string, HccLabel> = {};
  for (const resolution of [...user.codes, ...key.codes]) {
    for (const m of resolution.mappings) {
      const weight = input.reference.weights.get(m.hcc);
      if (weight) hccLabels[String(m.hcc)] = { code: `HCC${m.hcc}`, label: weight.label, raf: weight.rafWeight };
    }
  }

  return {
    user,
    key,
    captured,
    missed,
    overCoded,
    noHccImpact,
    optionalSetAside: submitted.filter((code) => optional.has(code)),
    recall,
    precision,
    rafDelta,
    rafAccuracy: accuracy,
    scorePct: blendScore({ recall, precision, rafAccuracy: accuracy }, weights),
    weights,
    hccLabels,
  };
}
