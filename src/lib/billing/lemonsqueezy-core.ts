/**
 * Lemon Squeezy webhooks: signature check and normalisation. Pure (node:crypto
 * only), so it is unit tested and shared by the live adapter and the dev fake.
 *
 * From the Lemon Squeezy docs: the X-Signature header is the hex HMAC-SHA256
 * of the raw body with the webhook signing secret; X-Event-Name names the
 * event; meta.custom_data carries what we attached at checkout on every order
 * and subscription event; failed deliveries are retried three more times
 * (about 5 s, 25 s, 125 s) and then dropped.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { BillingEvent, NormalizedSubscription, SubscriptionStatus } from "./types";

export function signLemonSqueezyBody(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

export function verifyLemonSqueezySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = Buffer.from(signLemonSqueezyBody(rawBody, secret), "utf8");
  const given = Buffer.from(signature.trim(), "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const id = z.union([z.string(), z.number()]).transform(String);

const envelopeSchema = z.object({
  meta: z.object({
    event_name: z.string().min(1),
    custom_data: z.record(z.string(), z.unknown()).nullish(),
    test_mode: z.boolean().optional(),
  }),
  data: z.object({ type: z.string(), id, attributes: z.record(z.string(), z.unknown()) }),
});

const LS_STATUSES = ["on_trial", "active", "paused", "past_due", "unpaid", "cancelled", "expired"] as const;

export const subscriptionAttributesSchema = z.object({
  customer_id: id,
  variant_id: id,
  status: z.enum(LS_STATUSES),
  renews_at: z.string().nullish(),
  ends_at: z.string().nullish(),
  trial_ends_at: z.string().nullish(),
  updated_at: z.string(),
  user_email: z.string().nullish(),
});

export type LemonSqueezySubscriptionAttributes = z.infer<typeof subscriptionAttributesSchema>;

/**
 * Lemon Squeezy statuses -> ours. "unpaid" (every retry failed) grants no
 * access, so it maps to expired; the original word is kept in provider_status.
 */
const STATUS: Record<(typeof LS_STATUSES)[number], SubscriptionStatus> = {
  on_trial: "trialing",
  active: "active",
  paused: "paused",
  past_due: "past_due",
  unpaid: "expired",
  cancelled: "cancelled",
  expired: "expired",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeSubscription(
  subscriptionId: string,
  attrs: LemonSqueezySubscriptionAttributes,
  planForVariant: (variantId: string) => string,
): NormalizedSubscription {
  const status = STATUS[attrs.status];
  const periodEnd =
    status === "cancelled" || status === "expired"
      ? (attrs.ends_at ?? null)
      : status === "trialing"
        ? (attrs.trial_ends_at ?? attrs.renews_at ?? null)
        : (attrs.renews_at ?? null);
  return {
    provider_subscription_id: subscriptionId,
    provider_customer_id: attrs.customer_id,
    plan: planForVariant(attrs.variant_id),
    status,
    provider_status: attrs.status,
    current_period_end: periodEnd,
  };
}

/**
 * Parse a verified webhook body. Only "subscriptions" resources carry state we
 * apply; orders and invoices are recorded and otherwise ignored, because a
 * subscription_updated always accompanies a change that matters.
 */
export function parseLemonSqueezyWebhook(rawBody: string, planForVariant: (variantId: string) => string): BillingEvent {
  const envelope = envelopeSchema.parse(JSON.parse(rawBody));
  const userId = envelope.meta.custom_data?.user_id;
  const attrs = envelope.data.type === "subscriptions" ? subscriptionAttributesSchema.parse(envelope.data.attributes) : null;
  const updatedAt = typeof envelope.data.attributes.updated_at === "string" ? envelope.data.attributes.updated_at : new Date(0).toISOString();

  return {
    // Lemon Squeezy has no delivery id; a redelivery repeats the body, so its
    // hash is a stable idempotency key.
    eventId: `ls_${createHash("sha256").update(rawBody, "utf8").digest("hex")}`,
    eventName: envelope.meta.event_name,
    occurredAt: updatedAt,
    userId: typeof userId === "string" && UUID.test(userId) ? userId : null,
    subscription: attrs ? normalizeSubscription(envelope.data.id, attrs, planForVariant) : null,
    testMode: envelope.meta.test_mode ?? false,
  };
}

/**
 * A subscription event body in Lemon Squeezy's shape. Used by the dev fake to
 * exercise the real webhook path, and by the tests.
 */
export function lemonSqueezySubscriptionBody(input: {
  eventName: string;
  subscriptionId: string;
  customerId: string;
  variantId: string;
  status: (typeof LS_STATUSES)[number];
  renewsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
  userEmail: string | null;
  userId: string | null;
  testMode?: boolean;
}): string {
  return JSON.stringify({
    meta: {
      event_name: input.eventName,
      test_mode: input.testMode ?? true,
      custom_data: input.userId ? { user_id: input.userId } : null,
    },
    data: {
      type: "subscriptions",
      id: input.subscriptionId,
      attributes: {
        store_id: 1,
        customer_id: Number(input.customerId) || input.customerId,
        variant_id: input.variantId,
        user_email: input.userEmail,
        status: input.status,
        cancelled: input.status === "cancelled",
        renews_at: input.renewsAt,
        ends_at: input.endsAt,
        trial_ends_at: null,
        created_at: input.updatedAt,
        updated_at: input.updatedAt,
      },
    },
  });
}
