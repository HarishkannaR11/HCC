import "server-only";
import type { Json } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { BillingEvent, ProviderId } from "./types";

export type ApplyOutcome = "applied" | "duplicate" | "stale" | "unmatched" | "ignored";

/**
 * Record and apply one normalised event through apply_billing_event(), which
 * is idempotent and ordered. Throws on a database error so the webhook answers
 * 5xx and the provider retries.
 */
export async function applyBillingEvent(provider: ProviderId, event: BillingEvent, payload: Json): Promise<ApplyOutcome> {
  const s = event.subscription;
  const subscription: Json = s
    ? {
        provider_subscription_id: s.provider_subscription_id,
        provider_customer_id: s.provider_customer_id,
        plan: s.plan,
        status: s.status,
        provider_status: s.provider_status,
        current_period_end: s.current_period_end,
      }
    : null;
  const { data, error } = await createServiceRoleClient().rpc("apply_billing_event", {
    p_event_id: event.eventId,
    p_provider: provider,
    p_event_name: event.eventName,
    p_occurred_at: event.occurredAt,
    // SQL null means "unknown user" here; the type generator does not model nullable arguments.
    p_user_id: event.userId as string,
    p_payload: payload,
    p_subscription: subscription,
  });
  if (error) throw new Error(`apply_billing_event failed: ${error.message}`);
  return data as ApplyOutcome;
}
