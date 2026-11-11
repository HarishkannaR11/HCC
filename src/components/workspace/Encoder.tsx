"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveDraft, startAttempt, submitAttempt } from "@/app/practice/[chartId]/actions";
import type { EncoderChart } from "@/lib/practice/types";
import type { HierarchyRef } from "@/lib/scoring/reference";
import { useStore as useEncoderStore } from "zustand";
import { createEncoderStore, evidenceId, trayPayload } from "@/lib/workspace/store";
import { locateEvidence } from "@/lib/workspace/resume";
import type { AssignedCode } from "@/lib/workspace/types";
import { EncoderContext, type EncoderContextValue } from "./encoder-context";
import { EncoderTopBar } from "./EncoderTopBar";
import { ChartPane } from "./ChartPane";
import { CodeSearch } from "./CodeSearch";
import { AssignedTray, type SaveStatus } from "./AssignedTray";

type Tab = "chart" | "codes";
const SAVE_DEBOUNCE_MS = 700;

export interface EncoderResume {
  attemptId: string | null;
  startedAt: string | null;
  mode: "practice" | "timed";
  timeLimitSeconds: number | null;
  assigned: AssignedCode[];
  /** Saved supporting excerpt per code, to rebuild highlights. */
  excerpts: Record<string, string>;
}

/**
 * The coding screen: the chart on the left; search and the assigned-code tray
 * on the right. The tray autosaves to the learner's open attempt, so a reload
 * (or another device) resumes where they left off. Below `lg` the halves sit
 * behind tabs; both stay mounted so highlights and the tray survive switching.
 */
export function Encoder({
  chart,
  hierarchy,
  nextChartId,
  resume,
}: {
  chart: EncoderChart;
  hierarchy: HierarchyRef;
  nextChartId: string | null;
  resume: EncoderResume;
}) {
  const [store] = useState(() => {
    const paragraphs = chart.sections.flatMap((s) => s.paragraphs);
    return createEncoderStore({
      attemptId: resume.attemptId,
      startedAt: resume.startedAt ? Date.parse(resume.startedAt) : null,
      mode: resume.mode,
      timeLimitSeconds: resume.timeLimitSeconds,
      assigned: resume.assigned,
      evidence: resume.assigned.flatMap((a) => locateEvidence(paragraphs, a.code, resume.excerpts[a.code] ?? "", evidenceId)),
    });
  });
  const [tab, setTab] = useState<Tab>("chart");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(resume.attemptId ? "saved" : "idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const attemptPromise = useRef<Promise<string | null> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const context = useMemo<EncoderContextValue>(
    () => ({
      store,
      chartId: chart.id,
      paymentYear: chart.paymentYear,
      patient: { age: chart.patient.age, sex: chart.patient.sex },
      hierarchy,
    }),
    [store, chart, hierarchy],
  );

  /** The open attempt's id, starting it on first use (once, even if called twice). */
  const ensureAttempt = useCallback(async (): Promise<string | null> => {
    const existing = store.getState().attemptId;
    if (existing) return existing;
    attemptPromise.current ??= startAttempt({ chartId: chart.id, mode: store.getState().mode }).then((result) => {
      if ("error" in result) {
        attemptPromise.current = null;
        setSubmitError(result.error);
        return null;
      }
      store.getState().setAttempt({
        attemptId: result.attemptId,
        startedAt: Date.parse(result.startedAt),
        mode: result.mode,
        timeLimitSeconds: result.timeLimitSeconds,
      });
      return result.attemptId;
    });
    return attemptPromise.current;
  }, [store, chart.id]);

  const flushSave = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const state = store.getState();
    if (!state.attemptId && state.assigned.length === 0) return;
    setSaveStatus("saving");
    const attemptId = await ensureAttempt();
    if (!attemptId) return setSaveStatus("error");
    const result = await saveDraft({ attemptId, codes: trayPayload(store.getState()) });
    setSaveStatus("error" in result ? "error" : "saved");
  }, [store, ensureAttempt]);

  // Autosave: debounce every tray or evidence change.
  useEffect(
    () =>
      store.subscribe((next, prev) => {
        if (next.assigned === prev.assigned && next.evidence === prev.evidence) return;
        // The attempt (and its database-clocked start) begins with the first
        // assigned code, not with the first debounced save.
        if (!next.attemptId && next.assigned.length > 0) void ensureAttempt();
        setSaveStatus("pending");
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => void flushSave(), SAVE_DEBOUNCE_MS);
      }),
    [store, flushSave, ensureAttempt],
  );
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const autoSubmitted = useRef(false);
  const submit = useCallback(
    (options: { auto?: boolean } = {}) => {
      const { assigned } = store.getState();
      if (assigned.length === 0 || submitting) return;
      const count = `${assigned.length} code${assigned.length === 1 ? "" : "s"}`;
      if (!options.auto && !window.confirm(`Submit ${count} for scoring? The answer key is shown once you submit.`)) return;
      setSubmitError(null);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      startSubmit(async () => {
        const attemptId = await ensureAttempt();
        if (!attemptId) return;
        // On success the action redirects to the result screen.
        const result = await submitAttempt({
          attemptId,
          codes: trayPayload(store.getState()),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        if (result?.error) setSubmitError(result.error);
      });
    },
    [store, submitting, ensureAttempt],
  );

  // Timed mode: when the database-clocked limit runs out, submit what is there.
  const attemptId = useEncoderStore(store, (s) => s.attemptId);
  const startedAt = useEncoderStore(store, (s) => s.startedAt);
  const timeLimitSeconds = useEncoderStore(store, (s) => s.timeLimitSeconds);
  useEffect(() => {
    if (!attemptId || startedAt === null || timeLimitSeconds === null) return;
    const remaining = startedAt + timeLimitSeconds * 1000 - Date.now();
    const timer = setTimeout(() => {
      if (autoSubmitted.current) return;
      autoSubmitted.current = true;
      if (store.getState().assigned.length > 0) submit({ auto: true });
      else setSubmitError("Time is up. Assign at least one code to submit; the attempt will be marked over time.");
    }, Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [attemptId, startedAt, timeLimitSeconds, store, submit]);

  // Ctrl/Cmd + Enter submits from anywhere on the screen.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [submit]);

  return (
    <EncoderContext.Provider value={context}>
      <div className="flex h-dvh flex-col overflow-hidden bg-bg text-ink">
        <EncoderTopBar chart={chart} nextChartId={nextChartId} onStartTimed={() => void ensureAttempt()} />

        <div role="tablist" aria-label="Coding screen panes" className="flex shrink-0 border-b border-border bg-surface lg:hidden">
          {(["chart", "codes"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={
                "h-11 flex-1 cursor-pointer border-b-2 text-sm font-medium " +
                (tab === key ? "border-accent text-accent-ink" : "border-transparent text-muted")
              }
            >
              {key === "chart" ? "Chart" : "Codes"}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <ChartPane chart={chart} className={tab === "chart" ? "flex" : "hidden lg:flex"} />
          <div
            className={`min-h-0 w-full flex-col border-l border-border bg-surface-alt lg:flex lg:w-[480px] lg:shrink-0 xl:w-[540px] ${
              tab === "codes" ? "flex" : "hidden"
            }`}
          >
            <CodeSearch />
            <AssignedTray onSubmit={() => submit()} submitting={submitting} error={submitError} saveStatus={saveStatus} />
          </div>
        </div>
      </div>
    </EncoderContext.Provider>
  );
}
