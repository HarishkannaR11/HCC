import "server-only";
import { siteUrl } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { lemonSqueezySubscriptionBody, parseLemonSqueezyWebhook, signLemonSqueezyBody, verifyLemonSqueezySignature } from "./lemonsqueezy-core";
import type { BillingProvider, Plan } from "./types";

/**
 * A local stand-in for Lemon Squeezy, for development and end-to-end tests
 * only (BILLING_PROVIDER=fake; refused in a Vercel production deploy).
 *
 * It owns no state of its own. Each simulated step builds a Lemon-Squeezy-
 * shaped subscription event, signs it with the webhook secret, and POSTs it
 * to our own /api/billing/webhook — so the real verification, parsing,
 * idempotency and ordering path runs exactly as it would in production.
 */

const VARIANT: Record<Plan, string> = { monthly: "fake-monthly", annual: "fake-annual" };
const DAY = 86_400_000;

export function fakeSecret(): string {
  return process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "dev-only-webhook-secret";
}

export function fakePlanForVariant(variantId: string): string {
  if (variantId === VARIANT.monthly) return "monthly";
  if (variantId === VARIANT.annual) return "annual";
  return `variant:${variantId}`;
}

type Step = Parameters<typeof lemonSqueezySubscriptionBody>[0];

async function deliver(step: Step): Promise<number> {
  const raw = lemonSqueezySubscriptionBody(step);
  const response = await fetch(`${siteUrl()}/api/billing/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Event-Name": step.eventName, "X-Signature": signLemonSqueezyBody(raw, fakeSecret()) },
    body: raw,
    cache: "no-store",
  });
  return response.status;
}

async function current(userId: string) {
  const { data } = await createServiceRoleClient()
    .from("subscriptions")
    .select("provider_subscription_id, provider_customer_id, plan, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

const variantOf = (plan: string | undefined) => (plan === "annual" ? VARIANT.annual : VARIANT.monthly);

/** Simulated steps, used by the dev checkout page and the dev billing controls. */
export const fakeSteps = {
  /** A successful checkout: subscription_created, optionally delivered after a delay (the race). */
  async completeCheckout(input: { userId: string; email: string | null; plan: Plan; delayMs: number }) {
    const now = Date.now();
    const step: Step = {
      eventName: "subscription_created",
      subscriptionId: `fake_${input.userId.slice(0, 8)}_${now.toString(36)}`,
      customerId: `fake_cust_${input.userId.slice(0, 8)}`,
      variantId: VARIANT[input.plan],
      status: "active",
      renewsAt: new Date(now + (input.plan === "annual" ? 365 : 30) * DAY).toISOString(),
      endsAt: null,
      updatedAt: new Date(now).toISOString(),
      userEmail: input.email,
      userId: input.userId,
    };
    if (input.delayMs <= 0) return deliver(step);
    // Deliberately after the redirect: the buyer lands before the webhook does.
    setTimeout(() => void deliver(step).catch(() => {}), input.delayMs);
    return 202;
  },

  /** A renewal charge fails: past_due while the provider retries. */
  async renewalFails(userId: string) {
    const sub = await current(userId);
    if (!sub?.provider_subscription_id) return 404;
    return deliver({
      eventName: "subscription_updated",
      subscriptionId: sub.provider_subscription_id,
      customerId: sub.provider_customer_id,
      variantId: variantOf(sub.plan),
      status: "past_due",
      renewsAt: sub.current_period_end,
      endsAt: null,
      updatedAt: new Date().toISOString(),
      userEmail: null,
      userId,
    });
  },

  /** Every retry failed: unpaid, which grants no access. */
  async retriesExhausted(userId: string) {
    const sub = await current(userId);
    if (!sub?.provider_subscription_id) return 404;
    return deliver({
      eventName: "subscription_updated",
      subscriptionId: sub.provider_subscription_id,
      customerId: sub.provider_customer_id,
      variantId: variantOf(sub.plan),
      status: "unpaid",
      renewsAt: null,
      endsAt: null,
      updatedAt: new Date().toISOString(),
      userEmail: null,
      userId,
    });
  },

  /** The cancelled subscription's paid period runs out: subscription_expired. */
  async periodEnds(userId: string) {
    const sub = await current(userId);
    if (!sub?.provider_subscription_id) return 404;
    return deliver({
      eventName: "subscription_expired",
      subscriptionId: sub.provider_subscription_id,
      customerId: sub.provider_customer_id,
      variantId: variantOf(sub.plan),
      status: "expired",
      renewsAt: null,
      endsAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userEmail: null,
      userId,
    });
  },
};

export function fakeProvider(): BillingProvider {
  return {
    id: "lemonsqueezy",
    mode: "fake",

    async createCheckout({ plan }) {
      return { url: `${siteUrl()}/billing/dev-checkout?plan=${plan}` };
    },

    verifyWebhook(rawBody, headers) {
      return verifyLemonSqueezySignature(rawBody, headers.get("x-signature"), fakeSecret());
    },

    parseWebhook(rawBody) {
      return parseLemonSqueezyWebhook(rawBody, fakePlanForVariant);
    },

    async cancelSubscription(subscriptionId) {
      // Lemon Squeezy answers a cancel with the subscription in its grace period
      // and sends subscription_cancelled; the fake sends the webhook.
      const { data: row } = await createServiceRoleClient()
        .from("subscriptions")
        .select("user_id, provider_customer_id, plan, current_period_end")
        .eq("provider_subscription_id", subscriptionId)
        .maybeSingle();
      if (!row) return null;
      await deliver({
        eventName: "subscription_cancelled",
        subscriptionId,
        customerId: row.provider_customer_id,
        variantId: variantOf(row.plan),
        status: "cancelled",
        renewsAt: null,
        endsAt: row.current_period_end,
        updatedAt: new Date().toISOString(),
        userEmail: null,
        userId: row.user_id,
      });
      return null;
    },

    async fetchForUser() {
      return [];
    },

    async managementUrl() {
      return null;
    },
  };
}
