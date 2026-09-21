"use client";

import { useRef, useState } from "react";
import { useWorkspaceStore } from "@/lib/workspace/store";
import { readBlockSelection, splitByRanges } from "@/lib/workspace/text-selection";
import type { Chart, MeatElement } from "@/lib/workspace/types";
import { EvidencePopover } from "./EvidencePopover";

const SECTION_LABEL_CLASS =
  "m-0 mb-1 font-sans text-xs font-semibold uppercase tracking-[0.06em] text-muted";

interface PendingSelection {
  blockId: string;
  start: number;
  end: number;
  text: string;
  anchor: { top: number; bottom: number; left: number };
}

export function ChartPane({ chart, className = "flex" }: { chart: Chart; className?: string }) {
  const mode = useWorkspaceStore((s) => s.mode);
  const claimedCodes = useWorkspaceStore((s) => s.claimedCodes);
  const evidenceLinks = useWorkspaceStore((s) => s.evidenceLinks);
  const addEvidenceLink = useWorkspaceStore((s) => s.addEvidenceLink);

  const containerRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<PendingSelection | null>(null);

  function handleMouseUp() {
    // Let the browser finish updating window.getSelection() before reading it.
    window.setTimeout(() => {
      const selection = readBlockSelection();
      if (!selection) return;
      const range = window.getSelection()?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (!rect) return;
      setPending({ ...selection, anchor: { top: rect.top, bottom: rect.bottom, left: rect.left } });
    }, 0);
  }

  function handleContainerMouseDown(e: React.MouseEvent) {
    // Starting a fresh interaction dismisses any open popover; a genuine new
    // selection re-opens it on the next mouseup.
    if (pending && !(e.target as HTMLElement).closest("[data-evidence-popover]")) {
      setPending(null);
    }
  }

  function confirmEvidence(codeId: string, meat: MeatElement[]) {
    if (!pending) return;
    const sectionId = pending.blockId.split(".")[0];
    addEvidenceLink({
      codeId,
      sectionId,
      blockId: pending.blockId,
      start: pending.start,
      end: pending.end,
      text: pending.text,
      meat,
    });
    setPending(null);
    window.getSelection()?.removeAllRanges();
  }

  return (
    <section
      aria-label="Clinical chart"
      className={`w-full lg:w-[580px] lg:shrink-0 box-border border-r border-border bg-surface flex-col min-h-0 ${className}`}
    >
      <div className="px-7 pt-5 pb-4 border-b border-border flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <h1 className="m-0 text-lg font-semibold">{chart.title}</h1>
          <span className="text-xs text-muted">Synthetic record</span>
        </div>
        <div className="flex gap-4.5 text-[13px] text-ink/80 flex-wrap">
          <span>Patient {chart.patientRef}</span>
          <span>
            {chart.patientAge} · {chart.patientSex === "male" ? "Male" : "Female"}
          </span>
          <span>DOS {formatDate(chart.dateOfService)}</span>
          <span>{chart.visitType}</span>
        </div>
      </div>

      {mode === "guided" && chart.hint && (
        <div className="mx-7 mt-4 p-3.5 bg-accent-soft border border-accent-soft rounded-card text-[13px] leading-relaxed text-accent-ink">
          Hint: {chart.hint}
        </div>
      )}

      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        onMouseDown={handleContainerMouseDown}
        className="flex-1 overflow-y-auto px-7 pt-4.5 pb-7 font-serif text-[15px] leading-[1.65] text-ink flex flex-col gap-4.5"
      >
        {chart.body.sections.map((section) => (
          <div key={section.id}>
            <h2 className={SECTION_LABEL_CLASS}>{section.heading}</h2>
            {section.kind === "prose" ? (
              section.blocks.map((block) => (
                <p key={block.id} data-block-id={block.id} className="m-0">
                  {renderSegments(block.id, block.text, evidenceLinks)}
                </p>
              ))
            ) : (
              <ol className="m-0 pl-5 flex flex-col gap-2">
                {section.blocks.map((block) => (
                  <li key={block.id} data-block-id={block.id}>
                    {renderSegments(block.id, block.text, evidenceLinks)}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
        <p className="m-0 text-[13px] text-muted">{chart.body.signature}</p>
      </div>

      {pending && (
        <div data-evidence-popover>
          <EvidencePopover
            anchor={pending.anchor}
            claimedCodes={claimedCodes}
            onConfirm={confirmEvidence}
            onCancel={() => setPending(null)}
          />
        </div>
      )}
    </section>
  );
}

function renderSegments(
  blockId: string,
  text: string,
  evidenceLinks: { id: string; blockId: string; start: number; end: number }[],
) {
  const ranges = evidenceLinks.filter((l) => l.blockId === blockId);
  if (ranges.length === 0) return text;

  const segments = splitByRanges(text, ranges);
  return segments.map((segment, i) =>
    segment.evidenceId ? (
      <mark key={i} className="bg-accent-soft text-inherit rounded-[3px] px-0.5">
        {segment.text}
      </mark>
    ) : (
      <span key={i}>{segment.text}</span>
    ),
  );
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
}
