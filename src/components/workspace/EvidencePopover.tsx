"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Link a text selection to one assigned code. Keyboard: 1–9 picks a code,
 * Enter links, Esc cancels.
 */
export function EvidencePopover({
  anchor,
  excerpt,
  codes,
  onConfirm,
  onCancel,
}: {
  anchor: { top: number; bottom: number; left: number };
  excerpt: string;
  codes: string[];
  onConfirm: (code: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState(codes[codes.length - 1] ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === "Enter" && selected) {
      e.preventDefault();
      onConfirm(selected);
    } else if (/^[1-9]$/.test(e.key)) {
      const code = codes[Number(e.key) - 1];
      if (code) {
        e.preventDefault();
        setSelected(code);
      }
    }
  }

  const placeAbove = anchor.top > 260;
  const left = Math.min(anchor.left, (typeof window === "undefined" ? 1200 : window.innerWidth) - 336);
  const style: React.CSSProperties = placeAbove
    ? { position: "fixed", left, bottom: window.innerHeight - anchor.top + 8, zIndex: 50 }
    : { position: "fixed", left, top: anchor.bottom + 8, zIndex: 50 };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Link evidence"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      style={style}
      className="flex w-80 flex-col gap-3 rounded-card border border-accent bg-surface p-3.5 font-sans shadow-lg outline-none"
    >
      <p className="m-0 line-clamp-3 text-[13px] italic text-ink/80">“{excerpt.trim()}”</p>
      {codes.length === 0 ? (
        <p className="m-0 text-[13px] text-ink/90">Assign a code first, then link this text to it as evidence.</p>
      ) : (
        <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
          <legend className="mb-1 text-[12px] font-semibold text-ink/90">Evidence for</legend>
          {codes.map((code, i) => (
            <label key={code} className="flex cursor-pointer items-center gap-2 text-[13px]">
              <input
                type="radio"
                name="evidence-code"
                value={code}
                checked={selected === code}
                onChange={() => setSelected(code)}
                className="accent-accent"
              />
              <span className="w-4 text-[11px] text-muted">{i < 9 ? i + 1 : ""}</span>
              <span className="font-mono">{code}</span>
            </label>
          ))}
        </fieldset>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 cursor-pointer rounded-[6px] border border-border px-3 text-[13px] font-medium text-ink/80"
        >
          Cancel
        </button>
        {codes.length > 0 ? (
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="h-8 cursor-pointer rounded-[6px] bg-accent px-3 text-[13px] font-medium text-white"
          >
            Link evidence
          </button>
        ) : null}
      </div>
    </div>
  );
}
