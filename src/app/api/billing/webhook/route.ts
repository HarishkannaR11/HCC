import { NextResponse, type NextRequest } from "next/server";
import type { Json } from "@/lib/supabase/database.types";
import { billingProvider } from "@/lib/billing";
import { applyBillingEvent } from "@/lib/billing/apply";

const MAX_BODY = 256 * 1024;

/**
 * POST /api/billing/webhook — the provider's subscription events.
 *
 *   401  bad or missing signature (nothing is recorded)
 *   400  signed, but not an event we understand
 *   200  recorded: applied, duplicate (a redelivery), stale (older than what
 *        we have), unmatched (no such user) or ignored (no subscription state)
 *   500  our failure: the provider retries, and the retry is safe because
 *        apply_billing_event is idempotent and its transaction rolled back
 */
export async function POST(request: NextRequest) {
  const provider = billingProvider();
  if (!provider) return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "Too large." }, { status: 413 });
  if (!provider.verifyWebhook(raw, request.headers)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event;
  let payload: Json;
  try {
    event = provider.parseWebhook(raw, request.headers);
    payload = JSON.parse(raw) as Json;
  } catch {
    return NextResponse.json({ error: "Unrecognised event." }, { status: 400 });
  }

  try {
    const outcome = await applyBillingEvent(provider.id, event, payload);
    return NextResponse.json({ outcome });
  } catch (error) {
    console.error("billing webhook:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not record the event." }, { status: 500 });
  }
}
