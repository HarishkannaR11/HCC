"use client";

import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/lib/workspace/store";
import type { Difficulty } from "@/lib/workspace/types";

const EXAM_SECONDS = 15 * 60;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function TopBar({
  position,
  difficulty,
}: {
  position: { index: number; total: number };
  difficulty: Difficulty;
}) {
  const mode = useWorkspaceStore((s) => s.mode);
  const setMode = useWorkspaceStore((s) => s.setMode);

  const [secondsLeft, setSecondsLeft] = useState(EXAM_SECONDS);
  // Reset the clock the instant `mode` changes, by adjusting state during
  // render (React's documented pattern for "state depends on a prop/store
  // value changing") rather than a useEffect that would need an extra
  // render pass to catch up.
  const [modeAtLastRender, setModeAtLastRender] = useState(mode);
  if (mode !== modeAtLastRender) {
    setModeAtLastRender(mode);
    setSecondsLeft(EXAM_SECONDS);
  }

  useEffect(() => {
    if (mode !== "exam") return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  const isGuided = mode === "guided";
  const pillBase =
    "h-8 px-3.5 border-0 rounded-[6px] font-sans text-[13px] font-medium cursor-pointer";

  return (
    <header className="h-16 shrink-0 box-border px-7 flex items-center gap-5 bg-topbar text-bg">
      <div className="flex items-center gap-2.5">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7FD1C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
          <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
          <path d="M9 14l2 2 4-4" />
        </svg>
        <span className="text-lg font-semibold tracking-tight">Chartwise</span>
      </div>

      <span className="hidden sm:inline text-[13px] px-2.5 py-[5px] border border-white/20 rounded-full text-white/80">
        CMS-HCC V28 · PY 2026 · Medicare Part C
      </span>

      <span className="hidden md:inline text-[13px] text-white/60">
        Chart {position.index} of {position.total} · {capitalize(difficulty)}
      </span>

      <div className="flex-1" />

      <div role="group" aria-label="Practice mode" className="flex p-[3px] bg-white/10 rounded-lg gap-0.5">
        <button
          type="button"
          onClick={() => setMode("guided")}
          aria-pressed={isGuided}
          className={pillBase + (isGuided ? " bg-bg text-ink" : " bg-transparent text-white/60")}
        >
          Guided
        </button>
        <button
          type="button"
          onClick={() => setMode("exam")}
          aria-pressed={!isGuided}
          className={pillBase + (!isGuided ? " bg-bg text-ink" : " bg-transparent text-white/60")}
        >
          Exam
        </button>
      </div>

      {!isGuided && (
        <span className="font-mono text-sm text-[#F4C77A]" aria-live="polite">
          {formatCountdown(secondsLeft)} left
        </span>
      )}

      <span className="hidden sm:inline text-[13px] text-white/80">Streak · 6 days</span>

      <div
        aria-label="Account"
        className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-[13px] font-semibold"
      >
        HK
      </div>
    </header>
  );
}
