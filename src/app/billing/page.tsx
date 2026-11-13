import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { billingProvider, fakeBillingEnabled } from "@/lib/billing";
import { subscriptionGrantsAccess } from "@/lib/billing/access";
import { PLAN_IDS, PLANS } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";
import { devBillingStep, openPaymentPortal, refreshBilling, startCheckout } from "./actions";
import { CancelButton } from "./cancel-button";

export const metadata: Metadata = { title: "Billing" };

const ERRORS: Record<string, string> = {
  checkout: "We could not start the checkout. Nothing was charged; try again in a minute.",
  portal: "The payment portal is not available right now. Try again in a minute.",
  declined: "The card was declined, so nothing was charged and your plan has not changed.",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(iso));
}

/**
 * Plan and billing. Reads the learner's own subscription and entitlement
 * through RLS; every change goes through a Server Action and, ultimately,
 * apply_billing_event().
 */
export default async function BillingPage({ searchParams }: PageProps<"/billing">) {
  const user = await requireUser("/billing");
  const params = await searchParams;
  const db = await createClient();
  const [{ data: entitlement }, { data: sub }] = await Promise.all([
    db.rpc("my_entitlement"),
    db.from("subscriptions").select("plan, status, provider_status, current_period_end, provider_subscription_id").maybeSingle(),
  ]);
  const ent = entitlement?.[0] ?? { full_access: false, free_used: 0, free_limit: 5, free_chart_ids: [] };
  const provider = billingProvider();
  const now = new Date();
  const subscribed = subscriptionGrantsAccess(sub ?? null, now);
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  const planName = sub?.plan === "annual" ? "Annual" : sub?.plan === "monthly" ? "Monthly" : (sub?.plan ?? "");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader user={user} />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8">
        <div>
          <h1 className="m-0 text-xl font-semibold">Plan and billing</h1>
          <p className="m-0 mt-1 text-[13px] text-muted">
            Payments are handled by Lemon Squeezy, our merchant of record. We never see your card.
          </p>
        </div>

        {error ? (
          <p role="alert" className="m-0 rounded-card bg-destructive-soft px-4 py-3 text-[14px] text-destructive">
            {error}
          </p>
        ) : null}

        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5" aria-label="Your plan">
          {user.role === "admin" ? (
            <p className="m-0 text-[15px]">Admin account: full access to every chart.</p>
          ) : subscribed && sub ? (
            <>
              <p className="m-0 text-[15px]">
                <b>{planName} plan</b>
                {sub.status === "cancelled"
                  ? ` · cancelled — full access until ${formatDate(sub.current_period_end)}`
                  : sub.status === "past_due"
                    ? ` · payment failed`
                    : sub.status === "trialing"
                      ? ` · trial ends ${formatDate(sub.current_period_end)}`
                      : ` · renews on ${formatDate(sub.current_period_end)}`}
              </p>
              {sub.status === "past_due" ? (
                <p className="m-0 rounded-card bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">
                  Your last renewal payment failed. The card is being retried and you keep full access meanwhile. Update your
                  payment method to avoid losing access.
                </p>
              ) : null}
              <div className="flex flex-wrap items-start gap-3">
                {provider?.mode === "live" && sub.provider_subscription_id ? (
                  <form action={openPaymentPortal}>
                    <Button type="submit" variant="outline">
                      Update payment method
                    </Button>
                  </form>
                ) : null}
                {sub.status !== "cancelled" ? <CancelButton periodEnd={formatDate(sub.current_period_end)} /> : null}
              </div>
            </>
          ) : (
            <>
              <p className="m-0 text-[15px]">
                <b>Free plan</b> · {Math.min(ent.free_used, ent.free_limit)} of {ent.free_limit} free charts used
              </p>
              <p className="m-0 text-[13px] text-muted">
                {ent.free_used >= ent.free_limit
                  ? "Your first five charts stay open to re-code as often as you like. Subscribe to open the rest of the library."
                  : `Any ${ent.free_limit} charts are free, and you can re-code those as often as you like.`}
                {sub && (sub.status === "expired" || sub.status === "paused" || sub.status === "cancelled")
                  ? ` Your ${planName.toLowerCase()} subscription ended${sub.provider_status === "unpaid" ? " after the renewal payment could not be collected" : ""}.`
                  : ""}
              </p>
            </>
          )}
        </section>

        {user.role !== "admin" && !subscribed ? (
          provider ? (
            <section className="grid gap-4 sm:grid-cols-2" aria-label="Plans">
              {PLAN_IDS.map((plan) => (
                <form key={plan} action={startCheckout} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5">
                  <input type="hidden" name="plan" value={plan} />
                  <span className="text-[14px] font-semibold">{PLANS[plan].name}</span>
                  <span>
                    <span className="font-mono text-[28px] font-semibold">{PLANS[plan].price}</span>{" "}
                    <span className="text-[13px] text-muted">{PLANS[plan].interval}</span>
                  </span>
                  <span className="text-[13px] text-muted">{PLANS[plan].note ?? "Cancel any time."}</span>
                  <span className="text-[13px]">Every chart, the full answer-key explanations, timed mode and progress.</span>
                  <Button type="submit" className="mt-2">
                    Subscribe {PLANS[plan].name.toLowerCase()}
                  </Button>
                </form>
              ))}
            </section>
          ) : (
            <p className="m-0 text-[13px] text-muted">Paid plans are not switched on yet.</p>
          )
        ) : null}

        {provider ? (
          <form action={refreshBilling}>
            <button type="submit" className="cursor-pointer border-0 bg-transparent p-0 text-[13px] text-accent-ink hover:underline">
              Paid but not showing? Refresh status
            </button>
          </form>
        ) : null}

        {fakeBillingEnabled() && sub?.provider_subscription_id ? (
          <section className="flex flex-col gap-2 rounded-card border border-dashed border-border p-4 text-[13px]" aria-label="Development billing controls">
            <span className="font-semibold">Development only: simulate provider events</span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["renewal-fails", "Renewal payment fails"],
                  ["retries-exhausted", "All retries fail"],
                  ["period-ends", "Paid period ends"],
                ] as const
              ).map(([step, label]) => (
                <form key={step} action={devBillingStep}>
                  <input type="hidden" name="step" value={step} />
                  <Button type="submit" size="sm" variant="outline">
                    {label}
                  </Button>
                </form>
              ))}
            </div>
          </section>
        ) : null}

        <p className="m-0 text-[12px] text-muted">
          <Link href="/practice" className="text-accent-ink hover:underline">
            Back to practice
          </Link>
        </p>
      </main>
    </div>
  );
}
