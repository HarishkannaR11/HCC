"use client";

import { useEffect, useRef, useState } from "react";
import type { CodeOption } from "@/lib/practice/types";
import { applicableHccs } from "@/lib/workspace/preview";
import { useEncoder, useEncoderContext } from "./encoder-context";
import { HccBadge } from "./HccBadge";

const DEBOUNCE_MS = 150;

/**
 * ICD-10-CM typeahead for the chart's payment year. Keyboard-first:
 * "/" focuses it, ↑/↓ choose, Enter assigns and clears for the next code,
 * Esc clears.
 */
export function CodeSearch() {
  const { paymentYear, patient } = useEncoderContext();
  const assigned = useEncoder((s) => s.assigned);
  const add = useEncoder((s) => s.add);

  const [query, setQuery] = useState("");
  const [hccOnly, setHccOnly] = useState(false);
  const [results, setResults] = useState<CodeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q === "") return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const params = new URLSearchParams({ q, year: String(paymentYear), hccOnly: hccOnly ? "1" : "0" });
        const response = await fetch(`/api/codes?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { results: CodeOption[] };
        setResults(body.results);
        setActive(0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, hccOnly, paymentYear]);

  // "/" focuses search unless the learner is typing somewhere else.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close the list on a click outside it.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(option: CodeOption) {
    add(option);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (query) setQuery("");
      else inputRef.current?.blur();
      setOpen(false);
      return;
    }
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      const option = results[active];
      if (option) choose(option);
    }
  }

  const q = query.trim();
  const showList = open && q !== "";
  const assignedCodes = new Set(assigned.map((a) => a.code));

  return (
    <div ref={boxRef} className="relative shrink-0 border-b border-border bg-surface px-5 pb-3 pt-4">
      <label htmlFor="code-search" className="text-[13px] font-semibold text-ink/90">
        Search ICD-10-CM · PY{paymentYear}
      </label>
      <div className="mt-2 flex h-11 items-center gap-2.5 rounded-card border-[1.5px] border-accent bg-surface px-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A5F66" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          id="code-search"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Code or words, e.g. E11.22 or heart failure"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 border-0 bg-transparent font-sans text-[15px] text-ink outline-none"
          role="combobox"
          aria-expanded={showList}
          aria-controls="code-search-results"
          aria-activedescendant={showList && results[active] ? `option-${results[active].code}` : undefined}
        />
        {loading ? <span className="text-[12px] text-muted">…</span> : null}
      </div>
      <div className="mt-2 flex items-center justify-between text-[12px] text-muted">
        <label className="flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" checked={hccOnly} onChange={() => setHccOnly((v) => !v)} className="accent-accent" />
          HCC-mapped codes only
        </label>
        <span>
          <kbd className="font-mono">/</kbd> search · <kbd className="font-mono">↑↓</kbd> · <kbd className="font-mono">Enter</kbd> add
        </span>
      </div>

      {showList ? (
        <ul
          id="code-search-results"
          role="listbox"
          className="absolute left-5 right-5 top-[86px] z-40 m-0 max-h-[55vh] list-none overflow-y-auto rounded-card border border-border bg-surface p-1 shadow-lg"
        >
          {failed ? (
            <li className="px-3 py-2 text-[13px] text-destructive">Search failed. Try again.</li>
          ) : results.length === 0 && !loading ? (
            <li className="px-3 py-2 text-[13px] text-muted">No billable codes match.</li>
          ) : (
            results.map((option, i) => {
              const hccs = applicableHccs(option.hccs, patient);
              const added = assignedCodes.has(option.code);
              return (
                <li
                  key={option.code}
                  id={`option-${option.code}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(option);
                  }}
                  className={`flex cursor-pointer items-start gap-3 rounded-[6px] px-3 py-2 ${i === active ? "bg-accent-soft/60" : ""}`}
                >
                  <span className="w-[72px] shrink-0 pt-px font-mono text-[13px] font-semibold">{option.code}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[13px] leading-snug text-ink/90">{option.description}</span>
                    <span className="flex flex-wrap gap-1">
                      {hccs.length > 0
                        ? hccs.map((h) => <HccBadge key={h.code} variant="mapped" label={h.code} />)
                        : option.hccs.length > 0
                          ? <HccBadge variant="unmapped" label="No HCC for this patient" />
                          : <HccBadge variant="unmapped" label="No HCC" />}
                    </span>
                  </span>
                  {added ? <span className="shrink-0 text-[12px] font-medium text-accent-ink">Added</span> : null}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
