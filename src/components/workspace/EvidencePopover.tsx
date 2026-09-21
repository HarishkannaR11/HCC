"use client";

import { useState } from "react";
import type { MeatElement } from "@/lib/workspace/types";

const MEAT_OPTIONS: Array<{ key: MeatElement; label: string }> = [
  { key: "M", label: "Monitor" },
  { key: "E", label: "Evaluate" },
  { key: "A", label: "Assess" },
  { key: "T", label: "Treat" },
];

export interface EvidencePopoverProps {
  /** Viewport coordinates of the selection this popover is anchored to. */
  anchor: { top: number; bottom: number; left: number };
  claimedCodes: string[];
  onConfirm: (codeId: string, meat: MeatElement[]) => void;
  onCancel: () => void;
}

export function EvidencePopover({ anchor, claimedCodes, onConfirm, onCancel }: EvidencePopoverProps) {
  const [codeId, setCodeId] = useState(claimedCodes[0] ?? "");
  const [meat, setMeat] = useState<MeatElement[]>([]);

  const placeAbove = anchor.top > 220;
  const style: React.CSSProperties = placeAbove
    ? { position: "fixed", left: anchor.left, bottom: window.innerHeight - anchor.top + 8, zIndex: 50 }
    : { position: "fixed", left: anchor.left, top: anchor.bottom + 8, zIndex: 50 };

  function toggleMeat(key: MeatElement) {
    setMeat((current) => (current.includes(key) ? current.filter((m) => m !== key) : [...current, key]));
  }

  if (claimedCodes.length === 0) {
    return (
      <div
        style={style}
        className="w-72 rounded-card border border-border bg-surface p-3.5 shadow-none flex flex-col gap-2.5"
      >
        <p className="text-[13px] text-ink/90">Add a code to the claimed list before linking evidence to it.</p>
        <button
          type="button"
          onClick={onCancel}
          className="self-end h-9 px-3 rounded-card border border-border text-[13px] font-medium text-ink/80 cursor-pointer"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div style={style} className="w-80 rounded-card border border-accent bg-surface p-3.5 flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="evidence-code" className="text-[12px] font-semibold text-ink/90">
          Link as evidence for
        </label>
        <select
          id="evidence-code"
          value={codeId}
          onChange={(e) => setCodeId(e.target.value)}
          className="h-9 rounded-card border border-border bg-surface px-2 font-mono text-[13px]"
        >
          {claimedCodes.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-[12px] font-semibold text-ink/90 mb-0.5">This shows (optional)</legend>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {MEAT_OPTIONS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-1.5 text-[13px] text-ink/90 cursor-pointer">
              <input
                type="checkbox"
                checked={meat.includes(key)}
                onChange={() => toggleMeat(key)}
                className="h-4 w-4 accent-accent"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center justify-end gap-2 pt-0.5">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-3 rounded-card border border-border text-[13px] font-medium text-ink/80 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(codeId, meat)}
          className="h-9 px-3.5 rounded-card bg-accent text-[13px] font-medium text-white cursor-pointer"
        >
          Link evidence
        </button>
      </div>
    </div>
  );
}
