/**
 * The scoring snapshot stored in attempt_results.breakdown, and its schema.
 * Written once at submission; the result screen renders from it, so a result
 * stays reproducible even if the answer key or reference data change later.
 */
import { z } from "zod";
import { TRAP_TYPES } from "@/lib/charts/constants";
import type { AttemptScore } from "@/lib/scoring/score";
import type { CodeReview } from "@/lib/scoring/review";

const trap = z.enum(TRAP_TYPES);

const mapping = z.object({
  hcc: z.number(),
  counted: z.boolean(),
  suppressedBy: z.number().nullable(),
  duplicateOf: z.string().nullable(),
  excludedByEdit: z.string().nullable(),
});

const side = z.object({
  hccs: z.array(z.number()),
  trimmed: z.array(z.object({ hcc: z.number(), suppressedBy: z.number() })),
  raf: z.number(),
  codes: z.array(z.object({ code: z.string(), mappings: z.array(mapping) })),
});

export const breakdownSchema = z.object({
  version: z.literal(1),
  paymentYear: z.number(),
  patient: z.object({ age: z.number(), sex: z.enum(["male", "female"]) }),
  score: z.object({
    user: side,
    key: side,
    captured: z.array(z.number()),
    missed: z.array(z.number()),
    overCoded: z.array(z.number()),
    noHccImpact: z.array(z.string()),
    optionalSetAside: z.array(z.string()),
    recall: z.number(),
    precision: z.number(),
    rafDelta: z.number(),
    rafAccuracy: z.number(),
    scorePct: z.number(),
    weights: z.object({ recall: z.number(), precision: z.number(), raf: z.number() }),
    hccLabels: z.record(z.string(), z.object({ code: z.string(), label: z.string(), raf: z.number() })),
  }),
  review: z.object({
    lines: z.array(
      z.object({
        code: z.string(),
        verdict: z.enum(["correct", "optional", "distractor", "unlisted", "missed"]),
        trap: trap.nullable(),
      }),
    ),
    trapsHit: z.array(trap),
    trapsAvoided: z.array(trap),
  }),
});

export type Breakdown = z.infer<typeof breakdownSchema>;

export function makeBreakdown(input: {
  paymentYear: number;
  patient: { age: number; sex: "male" | "female" };
  score: AttemptScore;
  review: CodeReview;
}): Breakdown {
  return { version: 1, ...input };
}
