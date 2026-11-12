import type { Plan } from "./types";

/**
 * What the pricing cards say. The amount actually charged is whatever the
 * provider's product variant is set to: keep these in step with the Lemon
 * Squeezy dashboard (DECISIONS.md, Phase 4).
 */
export const PLANS: Record<Plan, { name: string; price: string; interval: string; note: string | null }> = {
  monthly: { name: "Monthly", price: "$19", interval: "per month", note: null },
  annual: { name: "Annual", price: "$149", interval: "per year", note: "About $12.42 a month" },
};

export const PLAN_IDS = Object.keys(PLANS) as Plan[];
