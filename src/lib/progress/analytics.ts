/**
 * Accuracy trend and weak-spot statistics over a learner's scored attempts.
 * Pure and deterministic: aggregate counts, no models.
 */
import type { TrapType } from "@/lib/charts/constants";
import { withinTimeLimit } from "@/lib/practice/types";
import type { AttemptSummary } from "./types";

const mean = (xs: readonly number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const byTime = (a: AttemptSummary, b: AttemptSummary) => a.submittedAt.localeCompare(b.submittedAt);

export interface TrendPoint {
  attemptId: string;
  submittedAt: string;
  scorePct: number;
  /** Mean of this and the previous two scores. */
  rolling: number;
  chartTitle: string;
  mode: AttemptSummary["mode"];
}

export interface Trend {
  points: TrendPoint[];
  /** Mean of the last five scores, and of the five before them. */
  recentAvg: number | null;
  previousAvg: number | null;
  direction: "up" | "down" | "flat" | null;
}

export const TREND_WINDOW = 5;
/** A change smaller than this (in score points) is "flat". */
export const TREND_THRESHOLD = 5;

export function scoreTrend(attempts: readonly AttemptSummary[]): Trend {
  const sorted = [...attempts].sort(byTime);
  const points = sorted.map((a, i) => ({
    attemptId: a.id,
    submittedAt: a.submittedAt,
    scorePct: a.scorePct,
    rolling: mean(sorted.slice(Math.max(0, i - 2), i + 1).map((x) => x.scorePct)),
    chartTitle: a.chartTitle,
    mode: a.mode,
  }));
  const recent = sorted.slice(-TREND_WINDOW);
  const previous = sorted.slice(-2 * TREND_WINDOW, -TREND_WINDOW);
  const recentAvg = recent.length ? mean(recent.map((a) => a.scorePct)) : null;
  const previousAvg = previous.length >= 3 ? mean(previous.map((a) => a.scorePct)) : null;
  const direction =
    recentAvg === null || previousAvg === null || recent.length < 3
      ? null
      : recentAvg - previousAvg >= TREND_THRESHOLD
        ? "up"
        : previousAvg - recentAvg >= TREND_THRESHOLD
          ? "down"
          : "flat";
  return { points, recentAvg, previousAvg, direction };
}

export interface TrapStat {
  trap: TrapType;
  /** Charts where the learner fell for this kind of trap at least once. */
  hits: number;
  /** Charts they scored that had this kind of trap. */
  opportunities: number;
  rate: number;
}

/**
 * Per trap type: in how many of the charts that planted it the learner fell
 * for it. Counted once per chart, so a single mistake that both misses the
 * right code and codes the planted wrong one (I50.22 for I50.23) is one hit,
 * not two. Worst first.
 */
export function trapStats(attempts: readonly AttemptSummary[]): TrapStat[] {
  const stats = new Map<TrapType, { hits: number; opportunities: number }>();
  for (const a of attempts) {
    const hit = new Set(a.trapsHit);
    for (const trap of new Set([...a.trapsHit, ...a.trapsAvoided])) {
      const s = stats.get(trap) ?? { hits: 0, opportunities: 0 };
      s.opportunities += 1;
      if (hit.has(trap)) s.hits += 1;
      stats.set(trap, s);
    }
  }
  return [...stats]
    .map(([trap, s]) => ({ trap, ...s, rate: s.hits / s.opportunities }))
    .sort((a, b) => b.rate - a.rate || b.hits - a.hits || a.trap.localeCompare(b.trap));
}

export interface FamilyStat {
  group: string;
  /** Times an HCC in this family was on the key of a scored chart. */
  onKey: number;
  missed: number;
  overCoded: number;
  /** The specific HCCs missed / over-coded, most frequent first. */
  missedHccs: number[];
  overCodedHccs: number[];
}

/** Missed and over-coded HCCs, grouped by hierarchy family. Weakest first. */
export function familyStats(attempts: readonly AttemptSummary[], groupOf: (hcc: number) => string): FamilyStat[] {
  const families = new Map<string, { onKey: number; missed: Map<number, number>; over: Map<number, number> }>();
  const get = (group: string) => {
    let f = families.get(group);
    if (!f) families.set(group, (f = { onKey: 0, missed: new Map(), over: new Map() }));
    return f;
  };
  const bump = (m: Map<number, number>, hcc: number) => m.set(hcc, (m.get(hcc) ?? 0) + 1);

  for (const a of attempts) {
    for (const hcc of a.keyHccs) get(groupOf(hcc)).onKey += 1;
    for (const hcc of a.missed) bump(get(groupOf(hcc)).missed, hcc);
    for (const hcc of a.overCoded) bump(get(groupOf(hcc)).over, hcc);
  }
  const ranked = (m: Map<number, number>) => [...m].sort((x, y) => y[1] - x[1] || x[0] - y[0]).map(([h]) => h);
  const total = (m: Map<number, number>) => [...m.values()].reduce((a, b) => a + b, 0);

  return [...families]
    .map(([group, f]) => ({
      group,
      onKey: f.onKey,
      missed: total(f.missed),
      overCoded: total(f.over),
      missedHccs: ranked(f.missed),
      overCodedHccs: ranked(f.over),
    }))
    .filter((f) => f.missed + f.overCoded > 0)
    .sort((a, b) => b.missed + b.overCoded - (a.missed + a.overCoded) || a.group.localeCompare(b.group));
}

export interface Balance {
  missed: number;
  overCoded: number;
  meanRecall: number;
  meanPrecision: number;
  meanRafDelta: number;
  tendency: "undercoding" | "overcoding" | "balanced";
}

/** Do the learner's errors lean towards missing HCCs or adding unsupported ones? */
export function codingBalance(attempts: readonly AttemptSummary[]): Balance {
  const missed = attempts.reduce((n, a) => n + a.missed.length, 0);
  const overCoded = attempts.reduce((n, a) => n + a.overCoded.length, 0);
  const tendency =
    missed >= 2 && missed >= 1.5 * overCoded ? "undercoding" : overCoded >= 2 && overCoded >= 1.5 * missed ? "overcoding" : "balanced";
  return {
    missed,
    overCoded,
    meanRecall: mean(attempts.map((a) => a.recall)),
    meanPrecision: mean(attempts.map((a) => a.precision)),
    meanRafDelta: mean(attempts.map((a) => a.rafDelta)),
    tendency,
  };
}

export interface ModeStat {
  count: number;
  meanScore: number;
  /** Timed attempts submitted within their limit. */
  withinLimit: number;
  meanSeconds: number | null;
}

export function modeStats(attempts: readonly AttemptSummary[]): Record<"practice" | "timed", ModeStat> {
  const stat = (list: AttemptSummary[]): ModeStat => {
    const durations = list.map((a) => a.durationSeconds).filter((d): d is number => d !== null);
    return {
      count: list.length,
      meanScore: mean(list.map((a) => a.scorePct)),
      withinLimit: list.filter((a) => withinTimeLimit(a.durationSeconds, a.timeLimitSeconds)).length,
      meanSeconds: durations.length ? mean(durations) : null,
    };
  };
  return {
    practice: stat(attempts.filter((a) => a.mode === "practice")),
    timed: stat(attempts.filter((a) => a.mode === "timed")),
  };
}
