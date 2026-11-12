"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";
import { getSessionUser } from "@/lib/auth/session";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { billingProvider, fakeBillingEnabled } from "@/lib/billing";
import { applyBillingEvent } from "@/lib/billing/apply";
import { fakeSteps } from "@/lib/billing/fake";
import { PLAN_IDS } from "@/lib/billing/plans";
import type { Plan } from "@/lib/billing/types";

/**
 * Billing mutations. Each re-authenticates; none takes a user id from the
 * client. Subscription state itself only ever changes through
 * apply_billing_event (webhook, cancel response or sync).
 */

type Result = { ok: true; message: string } | { ok: false; message: string };
const planSchema = z.enum(PLAN_IDS as [Plan, ...Plan[]]);

async function ownSubscription() {
  const db = await createClient();
  const { data } = await db.from("subscriptions").select("provider_subscription_id, status").maybeSingle();
  return data;
}

async function hasFullAccess(): Promise<boolean> {
  const db = await createClient();
  const { data } = await db.rpc("my_entitlement");
  return Boolean(data?.[0]?.full_access);
}

export async function startCheckout(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/billing");
  const plan = planSchema.safeParse(formData.get("plan"));
  const provider = billingProvider();
  if (!plan.success || !provider) redirect("/billing?error=checkout");
  if (await hasFullAccess()) redirect("/billing");

  let url: string;
  try {
    ({ url } = await provider.createCheckout({
      userId: user.id,
      email: user.email,
      plan: plan.data,
      redirectUrl: `${siteUrl()}/billing/success`,
    }));
  } catch (error) {
    console.error("checkout:", error instanceof Error ? error.message : error);
    redirect("/billing?error=checkout");
  }
  redirect(url);
}

/** Pull the user's subscription from the provider and apply it: the fallback for a late or lost webhook. */
export async function syncBilling(): Promise<{ fullAccess: boolean }> {
  const user = await getSessionUser();
  if (!user) return { fullAccess: false };
  const provider = billingProvider();
  if (provider) {
    try {
      const sub = await ownSubscription();
      const events = await provider.fetchForUser({ id: user.id, email: user.email, providerSubscriptionId: sub?.provider_subscription_id ?? null });
      for (const event of events) {
        const payload: Json = { source: "sync", event_name: event.eventName, subscription_id: event.subscription?.provider_subscription_id ?? null };
        await applyBillingEvent(provider.id, event, payload);
      }
    } catch (error) {
      console.error("billing sync:", error instanceof Error ? error.message : error);
    }
  }
  revalidatePath("/billing");
  return { fullAccess: await hasFullAccess() };
}

export async function cancelSubscription(): Promise<Result> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Sign in again." };
  const provider = billingProvider();
  const sub = await ownSubscription();
  if (!provider || !sub?.provider_subscription_id || sub.status === "cancelled" || sub.status === "expired") {
    return { ok: false, message: "There is no active subscription to cancel." };
  }
  try {
    const event = await provider.cancelSubscription(sub.provider_subscription_id);
    if (event) {
      const payload: Json = { source: "cancel", subscription_id: sub.provider_subscription_id };
      await applyBillingEvent(provider.id, { ...event, userId: user.id }, payload);
    }
  } catch (error) {
    console.error("cancel:", error instanceof Error ? error.message : error);
    return { ok: false, message: "Could not cancel right now. Try again in a minute." };
  }
  revalidatePath("/billing");
  return { ok: true, message: "Cancelled. You keep full access until the end of the period you have paid for." };
}

export async function openPaymentPortal(): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/billing");
  const provider = billingProvider();
  const sub = await ownSubscription();
  let url: string | null = null;
  if (provider && sub?.provider_subscription_id) {
    try {
      url = await provider.managementUrl(sub.provider_subscription_id);
    } catch (error) {
      console.error("portal:", error instanceof Error ? error.message : error);
    }
  }
  redirect(url ?? "/billing?error=portal");
}

// --- Local development only: drive the fake provider -------------------------

const devStepSchema = z.enum(["pay", "pay-late", "renewal-fails", "retries-exhausted", "period-ends"]);

export async function devBillingStep(formData: FormData): Promise<void> {
  if (!fakeBillingEnabled()) redirect("/billing");
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/billing");
  const step = devStepSchema.safeParse(formData.get("step"));
  if (!step.success) redirect("/billing");

  switch (step.data) {
    case "pay":
    case "pay-late": {
      const plan = planSchema.catch("monthly").parse(formData.get("plan"));
      await fakeSteps.completeCheckout({ userId: user.id, email: user.email, plan, delayMs: step.data === "pay-late" ? 4000 : 0 });
      redirect("/billing/success");
    }
    case "renewal-fails":
      await fakeSteps.renewalFails(user.id);
      break;
    case "retries-exhausted":
      await fakeSteps.retriesExhausted(user.id);
      break;
    case "period-ends":
      await fakeSteps.periodEnds(user.id);
      break;
  }
  revalidatePath("/billing");
  redirect("/billing");
}

/** Form-friendly sync: reconcile, then reload /billing. */
export async function refreshBilling(): Promise<void> {
  await syncBilling();
  redirect("/billing");
}
