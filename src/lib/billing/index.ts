import "server-only";
import { fakeProvider } from "./fake";
import { lemonSqueezyConfigured, lemonSqueezyProvider } from "./lemonsqueezy";
import type { BillingProvider } from "./types";

/** True only for local development and tests; never on a Vercel production deploy. */
export function fakeBillingEnabled(): boolean {
  return process.env.BILLING_PROVIDER === "fake" && process.env.VERCEL_ENV !== "production";
}

/**
 * The configured billing provider, or null when billing is not set up (the
 * app then runs free-tier only and /billing says so).
 */
export function billingProvider(): BillingProvider | null {
  const which = process.env.BILLING_PROVIDER ?? "lemonsqueezy";
  if (which === "fake") {
    if (!fakeBillingEnabled()) throw new Error("BILLING_PROVIDER=fake is for local development only.");
    return fakeProvider();
  }
  if (which === "lemonsqueezy") return lemonSqueezyConfigured() ? lemonSqueezyProvider() : null;
  return null;
}

export type { BillingEvent, BillingProvider, Plan, ProviderId } from "./types";
