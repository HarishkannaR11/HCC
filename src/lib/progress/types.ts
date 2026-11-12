import type { TrapType } from "@/lib/charts/constants";

/**
 * One submitted, scored attempt, flattened for progress analytics. Built on
 * the server from the learner's own attempts and their scoring snapshots;
 * everything here is the learner's own post-submission data.
 */
export interface AttemptSummary {
  id: string;
  chartId: string;
  chartTitle: string;
  specialty: string;
  difficulty: number;
  mode: "practice" | "timed" | "audit";
  /** ISO timestamp. */
  submittedAt: string;
  durationSeconds: number | null;
  timeLimitSeconds: number | null;
  scorePct: number;
  recall: number;
  precision: number;
  rafDelta: number;
  rafKey: number;
  keyHccs: number[];
  captured: number[];
  missed: number[];
  overCoded: number[];
  trapsHit: TrapType[];
  trapsAvoided: TrapType[];
}

/** A published chart as the recommender may see it: public metadata only. */
export interface ChartListing {
  id: string;
  title: string;
  specialty: string;
  difficulty: number;
}
