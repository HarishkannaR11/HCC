/**
 * The entitlement rule, mirrored from has_full_access() / chart_access() in
 * migration 0011 for the UI. Postgres enforces it; this only decides what to
 * show. Pure.
 */
import type { SubscriptionStatus } from "./types";

export const FREE_CHART_LIMIT = 5;

export interface SubscriptionState {
  status: SubscriptionStatus;
  current_period_end: string | null;
}

/** Active, trialing, past due while the card is retried, or cancelled inside the paid period. */
export function subscriptionGrantsAccess(sub: SubscriptionState | null, now: Date): boolean {
  if (!sub) return false;
  if (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") return true;
  if (sub.status === "cancelled") return sub.current_period_end !== null && Date.parse(sub.current_period_end) > now.getTime();
  return false;
}

/** May this learner open this chart? Mirrors chart_access(). */
export function canOpenChart(input: { fullAccess: boolean; startedChartIds: ReadonlySet<string>; chartId: string }): boolean {
  return input.fullAccess || input.startedChartIds.has(input.chartId) || input.startedChartIds.size < FREE_CHART_LIMIT;
}
