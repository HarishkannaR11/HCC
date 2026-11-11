"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DIFFICULTY_LABELS } from "@/lib/charts/constants";
import type { EncoderChart } from "@/lib/practice/types";
import { useEncoder } from "./encoder-context";

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function EncoderTopBar({ chart, nextChartId }: { chart: EncoderChart; nextChartId: string | null }) {
  const startedAt = useEncoder((s) => s.startedAt);
  const [now, setNow] = useState<number | null>(null);

  // Client-only clock (avoids a server/client mismatch on first render).
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  // The attempt starts (on the database clock) when the first code is assigned.
  const elapsed = now === null || startedAt === null ? null : Math.max(0, Math.floor((now - startedAt) / 1000));

  return (
    <header className="flex h-14 shrink-0 items-center gap-5 bg-topbar px-5 text-bg">
      <Link href="/practice" className="text-[13px] text-white/70 hover:text-white">
        ← Practice
      </Link>
      <span className="font-semibold tracking-tight">Chartwise</span>
      <span className="hidden rounded-full border border-white/20 px-2.5 py-[3px] text-[12px] text-white/80 sm:inline">
        CMS-HCC V28 · PY{chart.paymentYear}
      </span>
      <span className="hidden truncate text-[13px] text-white/60 md:inline">
        {chart.specialty} · {DIFFICULTY_LABELS[chart.difficulty as 1 | 2 | 3] ?? chart.difficulty}
      </span>
      <div className="flex-1" />
      <span className="font-mono text-[13px] text-white/80" aria-label="Time on this chart">
        {elapsed === null ? "Not started" : formatElapsed(elapsed)}
      </span>
      {nextChartId ? (
        <Link href={`/practice/${nextChartId}`} className="text-[13px] text-white/70 hover:text-white">
          Skip to next chart →
        </Link>
      ) : null}
    </header>
  );
}
