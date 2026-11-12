/**
 * The billing seam. Everything provider-specific sits behind BillingProvider;
 * the rest of the app speaks only these normalised shapes. Swapping Lemon
 * Squeezy for Paddle or Dodo is a new adapter, nothing else.
 */
import type { Database } from "@/lib/supabase/database.types";

export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];
export type ProviderId = "lemonsqueezy" | "paddle" | "dodo";
export type Plan = "monthly" | "annual";

/** A provider subscription, normalised. Written by apply_billing_event(). */
export interface NormalizedSubscription {
  provider_subscription_id: string;
  provider_customer_id: string;
  /** "monthly" | "annual", or "variant:<id>" for an unconfigured variant. */
  plan: string;
  status: SubscriptionStatus;
  /** The provider's own status word, kept for display and support. */
  provider_status: string;
  /** Renewal date, or the date access ends once cancelled. */
  current_period_end: string | null;
}

/** One provider event, normalised. */
export interface BillingEvent {
  /** Provider-unique and stable across redeliveries: the idempotency key. */
  eventId: string;
  eventName: string;
  /** When the provider says the state changed; orders events. */
  occurredAt: string;
  /** The user id we attached at checkout, when present and well-formed. */
  userId: string | null;
  /** Null for events that carry no subscription state (invoices, orders). */
  subscription: NormalizedSubscription | null;
  testMode: boolean;
}

export interface CheckoutRequest {
  userId: string;
  email: string | null;
  plan: Plan;
  /** Where the provider sends the buyer after paying. */
  redirectUrl: string;
}

export interface BillingProvider {
  readonly id: ProviderId;
  /** "fake" only in local development; see fake.ts. */
  readonly mode: "live" | "fake";
  createCheckout(request: CheckoutRequest): Promise<{ url: string }>;
  /** Constant-time signature check over the raw request body. */
  verifyWebhook(rawBody: string, headers: Headers): boolean;
  /** Throws on a payload that is not a well-formed provider event. */
  parseWebhook(rawBody: string, headers: Headers): BillingEvent;
  /** Cancel at period end. Returns the resulting state when the provider reports it. */
  cancelSubscription(providerSubscriptionId: string): Promise<BillingEvent | null>;
  /** Current subscriptions for a user, for reconciling a missed webhook. */
  fetchForUser(user: { id: string; email: string | null; providerSubscriptionId: string | null }): Promise<BillingEvent[]>;
  /** A short-lived URL where the customer manages payment details, if the provider has one. */
  managementUrl(providerSubscriptionId: string): Promise<string | null>;
}
