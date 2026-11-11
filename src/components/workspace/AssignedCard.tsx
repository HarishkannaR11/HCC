"use client";

import { useState } from "react";
import type { CodeOutcome } from "@/lib/hcc/raf";
import type { AssignedCode } from "@/lib/workspace/types";
import { useEncoder } from "./encoder-context";
import { HccBadge } from "./HccBadge";

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** One assigned code: its HCC and coefficient for this patient, evidence and rationale. */
export function AssignedCard({ assigned, outcome }: { assigned: AssignedCode; outcome: CodeOutcome | undefined }) {
  const evidence = useEncoder((s) => s.evidence);
  const remove = useEncoder((s) => s.remove);
  const unlink = useEncoder((s) => s.unlinkEvidence);
  const setRationale = useEncoder((s) => s.setRationale);
  const [showRationale, setShowRationale] = useState(assigned.rationale !== "");

  const mappings = outcome?.mappings ?? [];
  const links = evidence.filter((e) => e.code === assigned.code);
  const scored = outcome?.scoredWeight ?? 0;

  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold">{assigned.code}</span>
        <div className="flex flex-wrap gap-1">
          {mappings.length === 0 ? <HccBadge variant="unmapped" label="No HCC" /> : null}
          {mappings.map((m) =>
            m.excludedByEdit ? (
              <HccBadge key={m.hccCategory} variant="unmapped" label={`No HCC for this patient (${m.excludedByEdit})`} />
            ) : m.suppressedBy !== null ? (
              <HccBadge key={m.hccCategory} variant="suppressed" label={`HCC${m.hccCategory} → trimmed by HCC${m.suppressedBy}`} />
            ) : m.duplicateOf ? (
              <HccBadge key={m.hccCategory} variant="suppressed" label={`HCC${m.hccCategory} · counted via ${m.duplicateOf}`} />
            ) : (
              <HccBadge key={m.hccCategory} variant="mapped" label={`HCC${m.hccCategory}`} />
            ),
          )}
        </div>
        <div className="flex-1" />
        <span className={`font-mono text-[13px] ${scored > 0 ? "text-accent" : "text-muted"}`}>
          {mappings.length === 0 ? "—" : scored > 0 ? `+${scored.toFixed(3)}` : "0.000"}
        </span>
        <button
          type="button"
          onClick={() => remove(assigned.code)}
          aria-label={`Remove ${assigned.code}`}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] border-0 bg-transparent text-muted hover:bg-border/50"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <span className="text-[13px] leading-snug text-ink/90">{assigned.description}</span>
      {mappings
        .filter((m) => !m.excludedByEdit)
        .map((m) => (
          <span key={m.hccCategory} className="text-[12px] text-muted">
            HCC{m.hccCategory} {m.label} · {m.rafWeight.toFixed(3)}
          </span>
        ))}

      <div className="flex flex-col gap-1">
        {links.length === 0 ? (
          <span className="text-[12px] text-muted">No evidence linked — select text in the chart.</span>
        ) : (
          links.map((link) => (
            <span key={link.id} className="flex items-start gap-1.5 text-[12px]">
              <span className="flex-1 rounded-[4px] bg-accent-soft/50 px-1.5 py-0.5 font-serif italic text-ink/85">
                “{truncate(link.text.trim(), 140)}”
              </span>
              <button
                type="button"
                onClick={() => unlink(link.id)}
                aria-label="Unlink this evidence"
                className="cursor-pointer border-0 bg-transparent px-1 text-muted hover:text-ink"
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      {showRationale ? (
        <label className="flex flex-col gap-1 text-[12px] text-muted">
          Rationale (optional)
          <textarea
            value={assigned.rationale}
            onChange={(e) => setRationale(assigned.code, e.target.value.slice(0, 2000))}
            rows={2}
            className="rounded-[6px] border border-border bg-surface px-2 py-1.5 font-sans text-[13px] text-ink"
          />
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setShowRationale(true)}
          className="cursor-pointer self-start border-0 bg-transparent p-0 text-[12px] text-accent-ink hover:underline"
        >
          + Add rationale
        </button>
      )}
    </div>
  );
}
