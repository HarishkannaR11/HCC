"use client";

import { useState } from "react";
import type { EncoderChart } from "@/lib/practice/types";
import { readBlockSelection, splitByRanges } from "@/lib/workspace/text-selection";
import type { EvidenceLink } from "@/lib/workspace/types";
import { useEncoder } from "./encoder-context";
import { EvidencePopover } from "./EvidencePopover";

interface PendingSelection {
  paragraphId: string;
  start: number;
  end: number;
  text: string;
  anchor: { top: number; bottom: number; left: number };
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
}

/**
 * The note, read-only and selectable. Selecting text opens a popover to link
 * it to an assigned code as that code's supporting documentation.
 */
export function ChartPane({ chart, className = "flex" }: { chart: EncoderChart; className?: string }) {
  const assigned = useEncoder((s) => s.assigned);
  const evidence = useEncoder((s) => s.evidence);
  const linkEvidence = useEncoder((s) => s.linkEvidence);
  const [pending, setPending] = useState<PendingSelection | null>(null);

  function captureSelection() {
    // Let the browser settle window.getSelection() first.
    window.setTimeout(() => {
      const selection = readBlockSelection();
      if (!selection) return;
      const rect = window.getSelection()?.getRangeAt(0).getBoundingClientRect();
      if (!rect) return;
      setPending({
        paragraphId: selection.blockId,
        start: selection.start,
        end: selection.end,
        text: selection.text,
        anchor: { top: rect.top, bottom: rect.bottom, left: rect.left },
      });
    }, 0);
  }

  function confirm(code: string) {
    if (!pending) return;
    linkEvidence({ code, paragraphId: pending.paragraphId, start: pending.start, end: pending.end, text: pending.text });
    setPending(null);
    window.getSelection()?.removeAllRanges();
  }

  const { patient } = chart;

  return (
    <section aria-label="Clinical chart" className={`min-h-0 w-full flex-1 flex-col bg-surface ${className}`}>
      <div className="flex flex-col gap-1.5 border-b border-border px-7 pb-4 pt-5">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="m-0 text-lg font-semibold">{chart.title}</h1>
          <span className="shrink-0 text-xs text-muted">Synthetic record — no patient data</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink/80">
          <span className="font-medium text-ink">{patient.name}</span>
          <span>
            DOB {formatDate(patient.dob)} ({patient.age} y)
          </span>
          <span>{patient.sex === "male" ? "Male" : "Female"}</span>
          <span className="font-mono">{patient.mrn}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          <span>DOS {formatDate(chart.encounterDate)}</span>
          <span>{chart.providerName}</span>
          <span>{chart.facilityName}</span>
        </div>
      </div>

      <div
        onMouseUp={captureSelection}
        onKeyUp={(e) => {
          if (e.shiftKey) captureSelection();
        }}
        onMouseDown={(e) => {
          if (pending && !(e.target as HTMLElement).closest("[data-evidence-popover]")) setPending(null);
        }}
        className="flex flex-1 flex-col gap-5 overflow-y-auto px-7 pb-8 pt-5 font-serif text-[15px] leading-[1.65] text-ink"
      >
        {chart.sections.map((section) => (
          <div key={section.id}>
            <h2 className="m-0 mb-1 font-sans text-xs font-semibold uppercase tracking-[0.06em] text-muted">
              {section.label}
            </h2>
            <div className="flex flex-col gap-1.5">
              {section.paragraphs.map((p) => (
                <p key={p.id} data-block-id={p.id} className="m-0 whitespace-pre-wrap">
                  {renderHighlights(p.id, p.text, evidence)}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {pending ? (
        <div data-evidence-popover>
          <EvidencePopover
            anchor={pending.anchor}
            excerpt={pending.text}
            codes={assigned.map((a) => a.code)}
            onConfirm={confirm}
            onCancel={() => setPending(null)}
          />
        </div>
      ) : null}
    </section>
  );
}

function renderHighlights(paragraphId: string, text: string, evidence: readonly EvidenceLink[]) {
  const ranges = evidence.filter((e) => e.paragraphId === paragraphId);
  if (ranges.length === 0) return text;
  return splitByRanges(text, ranges).map((segment, i) =>
    segment.evidenceId ? (
      <mark
        key={i}
        title={`Evidence for ${evidence.find((e) => e.id === segment.evidenceId)?.code ?? ""}`}
        className="rounded-[3px] bg-accent-soft px-0.5 text-inherit"
      >
        {segment.text}
      </mark>
    ) : (
      <span key={i}>{segment.text}</span>
    ),
  );
}
