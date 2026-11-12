/**
 * How the three components of an attempt's score are blended. Tune here; the
 * weights must sum to 1 (a test enforces it).
 *
 *   score = recall·0.5 + precision·0.3 + rafAccuracy·0.2
 */
export const SCORE_WEIGHTS = {
  recall: 0.5,
  precision: 0.3,
  raf: 0.2,
} as const;

export type ScoreWeights = { readonly recall: number; readonly precision: number; readonly raf: number };
