import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { fakeBillingEnabled } from "@/lib/billing";
import { PLAN_IDS, PLANS } from "@/lib/billing/plans";
import type { Plan } from "@/lib/billing/types";
import { devBillingStep } from "../actions";

export const metadata: Metadata = { title: "Test checkout" };

/**
 * Stand-in for the provider's hosted checkout, local development only. The
 * buttons drive the fake provider, which posts signed Lemon-Squeezy-shaped
 * webhooks to /api/billing/webhook.
 */
export default async function DevCheckoutPage({ searchParams }: PageProps<"/billing/dev-checkout">) {
  if (!fakeBillingEnabled()) notFound();
  await requireUser("/billing");
  const params = await searchParams;
  const plan: Plan = PLAN_IDS.includes(params.plan as Plan) ? (params.plan as Plan) : "monthly";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-6">
      <p className="m-0 rounded-card bg-warn-soft px-3 py-2 text-[12px] text-warn-ink">
        Development test checkout. No real payment provider is involved and nothing is charged.
      </p>
      <h1 className="m-0 text-xl font-semibold">
        {PLANS[plan].name} · {PLANS[plan].price} {PLANS[plan].interval}
      </h1>
      {(
        [
          ["pay", "Pay (webhook arrives first)"],
          ["pay-late", "Pay (you return before the webhook)"],
        ] as const
      ).map(([step, label]) => (
        <form key={step} action={devBillingStep}>
          <input type="hidden" name="step" value={step} />
          <input type="hidden" name="plan" value={plan} />
          <Button type="submit" className="w-full">
            {label}
          </Button>
        </form>
      ))}
      <Link href="/billing?error=declined" className="text-center text-[13px] text-destructive hover:underline">
        Card declined
      </Link>
    </main>
  );
}
