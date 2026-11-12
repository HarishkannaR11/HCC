import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PaymentConfirmation } from "./payment-confirmation";

export const metadata: Metadata = { title: "Payment" };

/**
 * Where the provider sends the buyer after paying. The webhook may land
 * before or after this request:
 *   - before: access is already granted and this page says so;
 *   - after: the page pulls the subscription from the provider once and then
 *     re-renders every few seconds until the webhook has been applied.
 * Either way the subscription row only ever changes through apply_billing_event.
 */
export default async function BillingSuccessPage() {
  const user = await requireUser("/billing/success");
  const db = await createClient();
  const { data } = await db.rpc("my_entitlement");
  const fullAccess = Boolean(data?.[0]?.full_access);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader user={user} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-16 text-center">
        {fullAccess ? (
          <>
            <h1 className="m-0 text-xl font-semibold">You&rsquo;re subscribed</h1>
            <p className="m-0 text-[14px] text-ink/80">The full chart library is unlocked.</p>
            <div className="flex justify-center gap-3">
              <Link href="/practice" className="rounded-[6px] bg-accent px-4 py-2 text-[14px] font-medium text-white">
                Go to the library
              </Link>
              <Link href="/billing" className="rounded-[6px] border border-border bg-surface px-4 py-2 text-[14px]">
                Billing
              </Link>
            </div>
          </>
        ) : (
          <PaymentConfirmation />
        )}
      </main>
    </div>
  );
}
