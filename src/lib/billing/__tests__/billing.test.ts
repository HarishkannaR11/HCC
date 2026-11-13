import { describe, expect, it } from "vitest";
import { canOpenChart, FREE_CHART_LIMIT, subscriptionGrantsAccess } from "../access";
import {
  lemonSqueezySubscriptionBody,
  parseLemonSqueezyWebhook,
  signLemonSqueezyBody,
  verifyLemonSqueezySignature,
} from "../lemonsqueezy-core";

const SECRET = "test-signing-secret";
const USER = "3f1c2b9e-1d2a-4c5b-9e8f-0a1b2c3d4e5f";
const plan = (variant: string) => ({ "101": "monthly", "202": "annual" })[variant] ?? `variant:${variant}`;

const body = (overrides: Partial<Parameters<typeof lemonSqueezySubscriptionBody>[0]> = {}) =>
  lemonSqueezySubscriptionBody({
    eventName: "subscription_created",
    subscriptionId: "9001",
    customerId: "77",
    variantId: "101",
    status: "active",
    renewsAt: "2026-12-12T00:00:00.000000Z",
    endsAt: null,
    updatedAt: "2026-11-12T10:00:00.000000Z",
    userEmail: "learner@example.com",
    userId: USER,
    ...overrides,
  });

describe("verifyLemonSqueezySignature", () => {
  it("accepts the hex HMAC-SHA256 of the raw body", () => {
    const raw = body();
    expect(verifyLemonSqueezySignature(raw, signLemonSqueezyBody(raw, SECRET), SECRET)).toBe(true);
  });

  it("rejects a tampered body, a wrong secret, a missing or malformed signature", () => {
    const raw = body();
    const sig = signLemonSqueezyBody(raw, SECRET);
    expect(verifyLemonSqueezySignature(raw.replace("active", "expired"), sig, SECRET)).toBe(false);
    expect(verifyLemonSqueezySignature(raw, signLemonSqueezyBody(raw, "other"), SECRET)).toBe(false);
    expect(verifyLemonSqueezySignature(raw, null, SECRET)).toBe(false);
    expect(verifyLemonSqueezySignature(raw, "abc", SECRET)).toBe(false);
    expect(verifyLemonSqueezySignature(raw, sig, "")).toBe(false);
  });
});

describe("parseLemonSqueezyWebhook", () => {
  it("normalises a new subscription, keeping our user id from custom_data", () => {
    const event = parseLemonSqueezyWebhook(body(), plan);
    expect(event).toMatchObject({
      eventName: "subscription_created",
      occurredAt: "2026-11-12T10:00:00.000000Z",
      userId: USER,
      subscription: {
        provider_subscription_id: "9001",
        provider_customer_id: "77",
        plan: "monthly",
        status: "active",
        provider_status: "active",
        current_period_end: "2026-12-12T00:00:00.000000Z",
      },
    });
  });

  it("gives a redelivery the same idempotency key, and a different event a different one", () => {
    const raw = body();
    expect(parseLemonSqueezyWebhook(raw, plan).eventId).toBe(parseLemonSqueezyWebhook(raw, plan).eventId);
    expect(parseLemonSqueezyWebhook(body({ eventName: "subscription_updated" }), plan).eventId).not.toBe(
      parseLemonSqueezyWebhook(raw, plan).eventId,
    );
  });

  it("uses ends_at as the period end once cancelled (the grace period)", () => {
    const event = parseLemonSqueezyWebhook(
      body({ eventName: "subscription_cancelled", status: "cancelled", endsAt: "2026-12-12T00:00:00.000000Z", renewsAt: null }),
      plan,
    );
    expect(event.subscription).toMatchObject({ status: "cancelled", current_period_end: "2026-12-12T00:00:00.000000Z" });
  });

  it("treats unpaid (every retry failed) as no access, keeping the provider's word", () => {
    const event = parseLemonSqueezyWebhook(body({ status: "unpaid" }), plan);
    expect(event.subscription).toMatchObject({ status: "expired", provider_status: "unpaid" });
  });

  it("maps an unknown variant to a visible label and ignores a malformed user id", () => {
    const event = parseLemonSqueezyWebhook(body({ variantId: "999", userId: "not-a-uuid" }), plan);
    expect(event.subscription?.plan).toBe("variant:999");
    expect(event.userId).toBeNull();
  });

  it("records invoices without subscription state", () => {
    const raw = JSON.stringify({
      meta: { event_name: "subscription_payment_failed", custom_data: { user_id: USER } },
      data: { type: "subscription-invoices", id: 5, attributes: { subscription_id: 9001, status: "failed", updated_at: "2026-11-12T10:00:00Z" } },
    });
    expect(parseLemonSqueezyWebhook(raw, plan)).toMatchObject({ eventName: "subscription_payment_failed", subscription: null, userId: USER });
  });

  it("rejects bodies that are not Lemon Squeezy events", () => {
    expect(() => parseLemonSqueezyWebhook("{}", plan)).toThrow();
    expect(() => parseLemonSqueezyWebhook("not json", plan)).toThrow();
  });
});

describe("subscriptionGrantsAccess (mirrors has_full_access in 0011)", () => {
  const now = new Date("2026-11-12T12:00:00Z");
  it.each([
    ["active", null, true],
    ["trialing", null, true],
    ["past_due", null, true],
    ["cancelled", "2026-12-01T00:00:00Z", true],
    ["cancelled", "2026-11-01T00:00:00Z", false],
    ["cancelled", null, false],
    ["paused", null, false],
    ["expired", null, false],
  ] as const)("%s, period end %s -> %s", (status, end, expected) => {
    expect(subscriptionGrantsAccess({ status, current_period_end: end }, now)).toBe(expected);
  });

  it("is false without a subscription", () => {
    expect(subscriptionGrantsAccess(null, now)).toBe(false);
  });
});

describe("canOpenChart (mirrors chart_access in 0011)", () => {
  const free = new Set(["a", "b", "c", "d", "e"]);
  it("allows any chart while free slots remain", () => {
    expect(canOpenChart({ fullAccess: false, freeChartIds: new Set(["a"]), chartId: "z" })).toBe(true);
  });
  it(`keeps only the first ${FREE_CHART_LIMIT} charts open once the free slots are used`, () => {
    expect(canOpenChart({ fullAccess: false, freeChartIds: free, chartId: "c" })).toBe(true);
    // e.g. a chart started while subscribed: not one of the free five, so it locks again.
    expect(canOpenChart({ fullAccess: false, freeChartIds: free, chartId: "z" })).toBe(false);
  });
  it("allows everything with full access", () => {
    expect(canOpenChart({ fullAccess: true, freeChartIds: free, chartId: "z" })).toBe(true);
  });
});
