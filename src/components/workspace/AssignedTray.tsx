"use client";

import { useMemo } from "react";
import { previewRaf } from "@/lib/workspace/preview";
import { useEncoder, useEncoderContext } from "./encoder-context";
import { AssignedCard } from "./AssignedCard";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

const SAVE_LABEL: Record<SaveStatus, string> = {
  idle: "",
  pending: "Unsaved changes",
  saving: "Saving…",
  saved: "Draft saved",
  error: "Draft not saved",
};

/**
 * The assigned-code tray. The running RAF at the top is the same engine the
 * server scores with — edits, de-duplication and V28 hierarchy trimming
 * applied — over the learner's own codes. It says nothing about the key.
 */
export function AssignedTray({
  onSubmit,
  submitting,
  error,
  saveStatus,
}: {
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  saveStatus: SaveStatus;
}) {
  const { patient, hierarchy } = useEncoderContext();
  const assigned = useEncoder((s) => s.assigned);
  const preview = useMemo(() => previewRaf(assigned, patient, hierarchy), [assigned, patient, hierarchy]);
  const outcomeByCode = new Map(preview.codes.map((c) => [c.icd10Code, c]));

  return (
    <section aria-label="Assigned codes" className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border bg-surface px-5 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-ink/90">RAF · after hierarchy</span>
          <span aria-live="polite" className="font-mono text-[28px] font-semibold leading-none text-accent">
            {preview.totalRaf.toFixed(3)}
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between text-[12px] text-muted">
          <span>
            {preview.capturedHccs.length} HCC{preview.capturedHccs.length === 1 ? "" : "s"}
            {preview.capturedHccs.length > 0 ? `: ${preview.capturedHccs.map((h) => `HCC${h}`).join(", ")}` : ""}
          </span>
          <span>V28 · community non-dual aged · demographics excluded</span>
        </div>
      </div>

      <div className="flex shrink-0 items-baseline justify-between px-5 pb-2 pt-3">
        <h2 className="m-0 text-[14px] font-semibold">
          Assigned codes <span className="font-normal text-muted">({assigned.length})</span>
        </h2>
        <span className={`text-[12px] ${saveStatus === "error" ? "text-destructive" : "text-muted"}`} aria-live="polite">
          {SAVE_LABEL[saveStatus]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-4">
        {assigned.length === 0 ? (
          <p className="my-2 text-[13px] leading-relaxed text-muted">
            Search for a code and press Enter to assign it. Then select text in the chart to link it as supporting
            documentation.
          </p>
        ) : null}
        {assigned.map((a) => (
          <AssignedCard key={a.code} assigned={a} outcome={outcomeByCode.get(a.code)} />
        ))}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-surface px-5 pb-5 pt-4">
        {error ? (
          <p role="alert" className="m-0 rounded-card bg-destructive-soft px-3 py-2 text-[13px] text-destructive">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onSubmit}
          disabled={assigned.length === 0 || submitting}
          className="h-12 cursor-pointer rounded-card bg-accent font-sans text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Scoring…" : "Submit for scoring"}
        </button>
        <span className="text-center text-[12px] text-muted">
          <kbd className="font-mono">Ctrl</kbd>/<kbd className="font-mono">⌘</kbd> + <kbd className="font-mono">Enter</kbd> submits
        </span>
      </div>
    </section>
  );
}
