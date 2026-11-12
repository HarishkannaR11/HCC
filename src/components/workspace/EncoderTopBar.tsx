"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DIFFICULTY_LABELS } from "@/lib/charts/constants";
import { TIMED_LIMIT_SECONDS, type EncoderChart } from "@/lib/practice/types";
import { useEncoder } from "./encoder-context";

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function EncoderTopBar({
  chart,
  nextChartId,
  onStartTimed,
}: {
  chart: EncoderChart;
  nextChartId: string | null;
  onStartTimed: () => void;
}) {
  const attemptId = useEncoder((s) => s.attemptId);
  const startedAt = useEncoder((s) => s.startedAt);
  const mode = useEncoder((s) => s.mode);
  const limit = useEncoder((s) => s.timeLimitSeconds);
  const chooseMode = useEncoder((s) => s.chooseMode);
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

  // The attempt starts on the database clock: with the first code in practice
  // mode, or on "Start timer" in timed mode.
  const elapsed = now === null || startedAt === null ? null : Math.max(0, (now - startedAt) / 1000);
  const timed = mode === "timed";
  const plannedLimit = TIMED_LIMIT_SECONDS[chart.difficulty] ?? 900;
  const remaining = timed && limit !== null && elapsed !== null ? limit - elapsed : null;

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

      {attemptId ? (
        <span className="text-[12px] uppercase tracking-wide text-white/50">{timed ? "Timed" : "Practice"}</span>
      ) : (
        <div role="group" aria-label="Mode" className="flex gap-0.5 rounded-lg bg-white/10 p-[3px]">
          {(["practice", "timed"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => chooseMode(m)}
              className={`h-7 cursor-pointer rounded-[6px] border-0 px-3 text-[13px] font-medium ${
                mode === m ? "bg-bg text-ink" : "bg-transparent text-white/60"
              }`}
            >
              {m === "practice" ? "Practice" : `Timed · ${formatClock(plannedLimit)}`}
            </button>
          ))}
        </div>
      )}

      {timed && !attemptId ? (
        <button
          type="button"
          onClick={onStartTimed}
          className="h-8 cursor-pointer rounded-[6px] border-0 bg-[#F4C77A] px-3 text-[13px] font-semibold text-ink"
        >
          Start timer
        </button>
      ) : remaining !== null ? (
        <span
          className={`font-mono text-[15px] font-semibold ${remaining <= 60 ? "text-[#F49A7A]" : "text-[#F4C77A]"}`}
          aria-label="Time remaining"
          aria-live={remaining <= 60 ? "polite" : "off"}
        >
          {remaining > 0 ? `${formatClock(remaining)} left` : "Time is up"}
        </span>
      ) : (
        <span className="font-mono text-[13px] text-white/80" aria-label="Time on this chart">
          {elapsed === null ? "Not started" : formatClock(elapsed)}
        </span>
      )}

      {nextChartId ? (
        <Link href={`/practice/${nextChartId}`} className="text-[13px] text-white/70 hover:text-white">
          Skip to next chart →
        </Link>
      ) : null}
    </header>
  );
}
