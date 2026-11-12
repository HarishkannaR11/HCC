"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelSubscription } from "./actions";

export function CancelButton({ periodEnd }: { periodEnd: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Cancel your subscription? You keep full access until ${periodEnd}.`)) return;
          start(async () => {
            const result = await cancelSubscription();
            setMessage({ ok: result.ok, text: result.message });
          });
        }}
      >
        {pending ? "Cancelling…" : "Cancel subscription"}
      </Button>
      {message ? (
        <p role="status" className={`m-0 text-[13px] ${message.ok ? "text-accent-ink" : "text-destructive"}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
