import "server-only";
import { z } from "zod";
import { parseLemonSqueezyWebhook, normalizeSubscription, subscriptionAttributesSchema, verifyLemonSqueezySignature } from "./lemonsqueezy-core";
import type { BillingEvent, BillingProvider, Plan } from "./types";

const API = "https://api.lemonsqueezy.com/v1";

const configSchema = z.object({
  LEMONSQUEEZY_API_KEY: z.string().min(10),
  LEMONSQUEEZY_STORE_ID: z.string().min(1),
  LEMONSQUEEZY_VARIANT_MONTHLY: z.string().min(1),
  LEMONSQUEEZY_VARIANT_ANNUAL: z.string().min(1),
  LEMONSQUEEZY_WEBHOOK_SECRET: z.string().min(6),
});

export function lemonSqueezyConfigured(): boolean {
  return configSchema.safeParse(process.env).success;
}

function config() {
  return configSchema.parse(process.env);
}

export function lemonSqueezyPlanForVariant(variantId: string): string {
  const c = config();
  if (variantId === c.LEMONSQUEEZY_VARIANT_MONTHLY) return "monthly";
  if (variantId === c.LEMONSQUEEZY_VARIANT_ANNUAL) return "annual";
  return `variant:${variantId}`;
}

async function api(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${config().LEMONSQUEEZY_API_KEY}`,
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Lemon Squeezy ${init.method ?? "GET"} ${path} failed: ${response.status}`);
  return response.json();
}

const resourceSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  attributes: z.record(z.string(), z.unknown()),
});

/** A subscription read from the API, as a synthetic event the ledger can apply. */
function eventFromResource(resource: z.infer<typeof resourceSchema>, userId: string | null, source: string): BillingEvent {
  const attrs = subscriptionAttributesSchema.parse(resource.attributes);
  return {
    eventId: `ls_${source}_${resource.id}_${attrs.updated_at}`,
    eventName: `${source}:subscription`,
    occurredAt: attrs.updated_at,
    userId,
    subscription: normalizeSubscription(resource.id, attrs, lemonSqueezyPlanForVariant),
    testMode: false,
  };
}

export function lemonSqueezyProvider(): BillingProvider {
  return {
    id: "lemonsqueezy",
    mode: "live",

    async createCheckout({ userId, email, plan, redirectUrl }) {
      const c = config();
      const variant = plan === "annual" ? c.LEMONSQUEEZY_VARIANT_ANNUAL : c.LEMONSQUEEZY_VARIANT_MONTHLY;
      const body = {
        data: {
          type: "checkouts",
          attributes: {
            // custom_data comes back in meta on every subscription webhook: it is how we know whose it is.
            checkout_data: { ...(email ? { email } : {}), custom: { user_id: userId } },
            product_options: { redirect_url: redirectUrl, enabled_variants: [Number(variant) || variant] },
          },
          relationships: {
            store: { data: { type: "stores", id: c.LEMONSQUEEZY_STORE_ID } },
            variant: { data: { type: "variants", id: variant } },
          },
        },
      };
      const json = z
        .object({ data: z.object({ attributes: z.object({ url: z.url() }) }) })
        .parse(await api("/checkouts", { method: "POST", body: JSON.stringify(body) }));
      return { url: json.data.attributes.url };
    },

    verifyWebhook(rawBody, headers) {
      return verifyLemonSqueezySignature(rawBody, headers.get("x-signature"), config().LEMONSQUEEZY_WEBHOOK_SECRET);
    },

    parseWebhook(rawBody) {
      return parseLemonSqueezyWebhook(rawBody, lemonSqueezyPlanForVariant);
    },

    async cancelSubscription(subscriptionId) {
      // Cancels at period end; the response is the subscription in its cancelled (grace) state.
      const json = z.object({ data: resourceSchema }).parse(await api(`/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: "DELETE" }));
      return eventFromResource(json.data, null, "cancel");
    },

    async fetchForUser({ id, email, providerSubscriptionId }) {
      if (providerSubscriptionId) {
        const json = z.object({ data: resourceSchema }).parse(await api(`/subscriptions/${encodeURIComponent(providerSubscriptionId)}`));
        return [eventFromResource(json.data, id, "sync")];
      }
      if (!email) return [];
      // No linked subscription yet (the webhook has not landed): look one up by
      // the account email, which the checkout was prefilled with.
      const params = new URLSearchParams({ "filter[store_id]": config().LEMONSQUEEZY_STORE_ID, "filter[user_email]": email });
      const json = z.object({ data: z.array(resourceSchema) }).parse(await api(`/subscriptions?${params}`));
      return json.data.map((resource) => eventFromResource(resource, id, "sync"));
    },

    async managementUrl(subscriptionId) {
      const json = z
        .object({ data: z.object({ attributes: z.object({ urls: z.object({ customer_portal: z.string().nullish() }).nullish() }) }) })
        .parse(await api(`/subscriptions/${encodeURIComponent(subscriptionId)}`));
      return json.data.attributes.urls?.customer_portal ?? null;
    },
  };
}

export type { Plan };
