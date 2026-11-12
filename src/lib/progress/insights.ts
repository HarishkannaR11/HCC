/**
 * Plain-language observations about a learner's weak spots, ranked. Pure and
 * deterministic: every sentence is a threshold over counts, so the same
 * history always says the same thing. Nothing here calls a model.
 */
import { TRAP_LABELS } from "@/lib/charts/constants";
import { codingBalance, familyStats, modeStats, scoreTrend, trapStats } from "./analytics";
import type { AttemptSummary } from "./types";

export interface Insight {
  id: string;
  kind: "weakness" | "strength" | "trend";
  title: string;
  detail: string;
}

/** Below this many scored charts, insights are shown as provisional. */
export const MIN_ATTEMPTS_FOR_INSIGHTS = 5;

const pct = (x: number) => `${Math.round(x * 100)}%`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function buildInsights(
  attempts: readonly AttemptSummary[],
  groupOf: (hcc: number) => string,
  groupLabel: (group: string) => string,
  hccLabel: (hcc: number) => string,
): Insight[] {
  if (attempts.length === 0) return [];
  const out: Insight[] = [];

  // 1. Which way do the errors lean, and what does it cost?
  const balance = codingBalance(attempts);
  if (balance.tendency === "undercoding") {
    out.push({
      id: "tendency",
      kind: "weakness",
      title: "You undercode more than you overcode",
      detail: `${plural(balance.missed, "missed HCC")} against ${balance.overCoded} over-coded across ${plural(attempts.length, "chart")}. Recall averages ${pct(balance.meanRecall)}; precision ${pct(balance.meanPrecision)}. On average your RAF lands ${Math.abs(balance.meanRafDelta).toFixed(3)} below the key.`,
    });
  } else if (balance.tendency === "overcoding") {
    out.push({
      id: "tendency",
      kind: "weakness",
      title: "You overcode more than you undercode",
      detail: `${plural(balance.overCoded, "over-coded HCC")} against ${balance.missed} missed across ${plural(attempts.length, "chart")}. Precision averages ${pct(balance.meanPrecision)}; recall ${pct(balance.meanRecall)}. On average your RAF lands ${balance.meanRafDelta.toFixed(3)} above the key — the kind of variance an audit flags.`,
    });
  }

  // 2. Documentation traps: the worst one that has come up at least twice.
  const traps = trapStats(attempts).filter((t) => t.trap !== "none");
  const worstTrap = traps.find((t) => t.opportunities >= 2 && t.rate >= 0.5);
  if (worstTrap) {
    out.push({
      id: `trap-${worstTrap.trap}`,
      kind: "weakness",
      title: `${TRAP_LABELS[worstTrap.trap]} traps catch you`,
      detail: `It caught you in ${worstTrap.hits} of the ${worstTrap.opportunities} charts that planted one (${pct(worstTrap.rate)}).`,
    });
  }

  // 3. The HCC family that costs the most.
  const families = familyStats(attempts, groupOf);
  const weakFamily = families.find((f) => f.missed >= 2 || f.overCoded >= 2);
  if (weakFamily) {
    const parts = [];
    if (weakFamily.missed > 0) {
      parts.push(`missed ${plural(weakFamily.missed, "time")} (${weakFamily.missedHccs.map(hccLabel).join(", ")})`);
    }
    if (weakFamily.overCoded > 0) {
      parts.push(`over-coded ${plural(weakFamily.overCoded, "time")} (${weakFamily.overCodedHccs.map(hccLabel).join(", ")})`);
    }
    out.push({
      id: `family-${weakFamily.group}`,
      kind: "weakness",
      title: `${groupLabel(weakFamily.group)} is your costliest HCC family`,
      detail: `Across your charts you ${parts.join(" and ")}; it was on the key ${plural(weakFamily.onKey, "time")}.`,
    });
  }

  // 4. Time pressure.
  const modes = modeStats(attempts);
  if (modes.timed.count >= 2 && modes.practice.count >= 2) {
    const drop = modes.practice.meanScore - modes.timed.meanScore;
    if (drop >= 5) {
      out.push({
        id: "timed",
        kind: "weakness",
        title: "Your accuracy drops under time pressure",
        detail: `Timed charts average ${Math.round(modes.timed.meanScore)}% against ${Math.round(modes.practice.meanScore)}% untimed, and ${modes.timed.withinLimit} of ${modes.timed.count} timed charts finished within the limit.`,
      });
    }
  }

  // 5. A strength worth keeping: a trap met at least twice and never fallen for.
  const strongTrap = [...traps].reverse().find((t) => t.opportunities >= 2 && t.hits === 0);
  if (strongTrap) {
    out.push({
      id: `strength-${strongTrap.trap}`,
      kind: "strength",
      title: `${TRAP_LABELS[strongTrap.trap]}: solid`,
      detail: `You got past it in all ${strongTrap.opportunities} charts that planted one.`,
    });
  }

  // 6. Direction of travel.
  const trend = scoreTrend(attempts);
  if (trend.direction === "up" || trend.direction === "down") {
    out.push({
      id: "trend",
      kind: "trend",
      title: trend.direction === "up" ? "Your scores are climbing" : "Your scores are slipping",
      detail: `Your last ${Math.min(5, attempts.length)} charts average ${Math.round(trend.recentAvg!)}%, against ${Math.round(trend.previousAvg!)}% for the ones before.`,
    });
  }

  return out;
}
