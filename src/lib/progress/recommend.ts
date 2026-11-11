/**
 * The next chart to open. Pure.
 *
 * Uses only public chart metadata (difficulty, specialty) and the learner's
 * own scores. It never looks at answer keys or distractors, so a
 * recommendation can never hint at what a chart's key contains.
 */
import type { AttemptSummary, ChartListing } from "./types";

export interface Recommendation {
  chartId: string;
  title: string;
  reason: string;
}

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
export const STEP_UP_AT = 85;
export const STEP_DOWN_BELOW = 60;

export function recommendNextChart(input: {
  charts: readonly ChartListing[];
  attempts: readonly AttemptSummary[];
  openDraftChartIds: readonly string[];
}): Recommendation | null {
  const { charts, attempts } = input;
  if (charts.length === 0) return null;
  const byId = new Map(charts.map((c) => [c.id, c]));

  // 1. Finish what you started.
  const draft = input.openDraftChartIds.map((id) => byId.get(id)).find(Boolean);
  if (draft) return { chartId: draft.id, title: draft.title, reason: "You have a draft in progress on this chart." };

  const sorted = [...attempts].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const scored = new Set(sorted.map((a) => a.chartId));
  const unscored = charts.filter((c) => !scored.has(c.id));

  // 2. Pick the difficulty from recent form.
  const recent = sorted.slice(-3);
  const lastDifficulty = recent.at(-1)?.difficulty ?? 1;
  const form = recent.length > 0 ? mean(recent.map((a) => a.scorePct)) : null;
  const target =
    form === null ? 1 : form >= STEP_UP_AT ? Math.min(3, lastDifficulty + 1) : form < STEP_DOWN_BELOW ? Math.max(1, lastDifficulty - 1) : lastDifficulty;

  if (unscored.length > 0) {
    // Prefer the specialty you score lowest in (public metadata), then the closest difficulty.
    const specialtyScore = new Map<string, number[]>();
    for (const a of sorted) specialtyScore.set(a.specialty, [...(specialtyScore.get(a.specialty) ?? []), a.scorePct]);
    const weakness = (specialty: string) => {
      const scores = specialtyScore.get(specialty);
      return scores ? mean(scores) : 50; // untried specialties sit mid-table
    };
    const pick = [...unscored].sort(
      (a, b) =>
        Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target) ||
        weakness(a.specialty) - weakness(b.specialty) ||
        a.title.localeCompare(b.title),
    )[0];
    const step =
      form === null
        ? "A foundational chart to start."
        : form >= STEP_UP_AT
          ? `Your last ${recent.length} averaged ${Math.round(form)}%, so a step up.`
          : form < STEP_DOWN_BELOW
            ? `Your last ${recent.length} averaged ${Math.round(form)}%, so a steadier chart.`
            : `Matched to your recent form (${Math.round(form)}%).`;
    const specialtyNote = specialtyScore.has(pick.specialty) ? ` ${pick.specialty} is where you score lowest.` : "";
    return { chartId: pick.id, title: pick.title, reason: `${step}${specialtyNote}` };
  }

  // 3. Everything scored: retry the weakest.
  const best = new Map<string, number>();
  for (const a of sorted) best.set(a.chartId, Math.max(best.get(a.chartId) ?? 0, a.scorePct));
  const retry = charts
    .filter((c) => (best.get(c.id) ?? 0) < 100)
    .sort((a, b) => (best.get(a.id) ?? 0) - (best.get(b.id) ?? 0) || a.title.localeCompare(b.title))[0];
  if (!retry) return null;
  return { chartId: retry.id, title: retry.title, reason: `Your best here is ${Math.round(best.get(retry.id) ?? 0)}%. Code it again.` };
}
