"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { syncBilling } from "../actions";

const POLL_MS = 2000;
const GIVE_UP_MS = 90_000;

/**
 * The buyer arrived before the webhook. Ask the provider once, then re-render
 * the page every two seconds until the server reports access (this component
 * then unmounts). Lemon Squeezy retries a failed delivery for about two and a
 * half minutes, so after ninety seconds say so plainly instead of spinning.
 */
export function PaymentConfirmation() {
  const router = useRouter();
  const [waitedLong, setWaitedLong] = useState(false);

  useEffect(() => {
    let stopped = false;
    void syncBilling().then(({ fullAccess }) => {
      if (fullAccess && !stopped) router.refresh();
    });
    const poll = setInterval(() => router.refresh(), POLL_MS);
    const giveUp = setTimeout(() => {
      clearInterval(poll);
      setWaitedLong(true);
    }, GIVE_UP_MS);
    return () => {
      stopped = true;
      clearInterval(poll);
      clearTimeout(giveUp);
    };
  }, [router]);

  return (
    <>
      <h1 className="m-0 text-xl font-semibold">Confirming your payment…</h1>
      <p className="m-0 text-[14px] text-ink/80" aria-live="polite">
        {waitedLong
          ? "The payment provider has not confirmed yet. That can take a few minutes; the library unlocks as soon as it does. Nothing more to do here."
          : "This usually takes a few seconds."}
      </p>
      {waitedLong ? (
        <p className="m-0">
          <Link href="/billing" className="text-accent-ink hover:underline">
            Check billing
          </Link>
        </p>
      ) : null}
    </>
  );
}
