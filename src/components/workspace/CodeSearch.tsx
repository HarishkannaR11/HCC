"use client";

import { useEffect, useRef, useState } from "react";
import { searchCodes } from "@/lib/workspace-api";
import { useWorkspaceStore } from "@/lib/workspace/store";
import type { CodeSearchResult } from "@/lib/workspace/types";
import { ResultRow, ResultRowSkeleton } from "./ResultRow";

const DEBOUNCE_MS = 200;

export function CodeSearch({ className = "flex" }: { className?: string }) {
  const searchQuery = useWorkspaceStore((s) => s.searchQuery);
  const setSearchQuery = useWorkspaceStore((s) => s.setSearchQuery);
  const hccOnly = useWorkspaceStore((s) => s.hccOnly);
  const toggleHccOnly = useWorkspaceStore((s) => s.toggleHccOnly);
  const claimedCodes = useWorkspaceStore((s) => s.claimedCodes);
  const addClaimedCode = useWorkspaceStore((s) => s.addClaimedCode);

  const [results, setResults] = useState<CodeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced fetch: the query and checkbox live in the shared store (other
  // panes may want them later), but the request itself is this component's
  // concern.
  useEffect(() => {
    const query = searchQuery.trim();
    // Nothing to fetch; stale `results`/`loading` from a prior query are
    // never rendered while empty (see `showEmpty` below), so there is
    // nothing to reset here.
    if (query === "") return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      searchCodes(query, hccOnly).then((rows) => {
        if (cancelled) return;
        setResults(rows);
        setLoading(false);
        setActiveIndex(0);
      });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, hccOnly]);

  // Global "/" focuses search, unless the user is already typing somewhere.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) addClaimedCode(target.icd10Code);
    }
  }

  const trimmedQuery = searchQuery.trim();
  const showEmpty = trimmedQuery === "";
  const showNoResults = !showEmpty && !loading && results.length === 0;

  return (
    <section
      aria-label="Code search"
      className={`w-full lg:w-[500px] lg:shrink-0 box-border border-r border-border flex-col min-h-0 ${className}`}
    >
      <div className="px-6 pt-5 pb-3.5 flex flex-col gap-3">
        <label htmlFor="code-search" className="text-[13px] font-semibold text-ink/90">
          Search ICD-10-CM (FY 2026)
        </label>
        <div className="flex items-center gap-2.5 h-[46px] box-border px-3.5 bg-surface border-[1.5px] border-accent rounded-card">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A5F66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            id="code-search"
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Code or description, e.g. E11 or copd"
            className="flex-1 border-0 outline-none bg-transparent font-sans text-[15px] text-ink"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="code-search-results"
            aria-activedescendant={results[activeIndex] ? `result-${results[activeIndex].icd10Code}` : undefined}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[13px] text-ink/90 cursor-pointer">
            <input
              type="checkbox"
              checked={hccOnly}
              onChange={toggleHccOnly}
              className="h-4 w-4 accent-accent"
            />
            Show HCC-mapped codes only
          </label>
          <span className="text-xs text-muted" aria-live="polite">
            {showEmpty ? "" : `${results.length} ${results.length === 1 ? "result" : "results"}`}
          </span>
        </div>
      </div>

      <div id="code-search-results" className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-2">
        {showEmpty ? (
          <p className="my-3 text-sm text-muted">
            Type a code prefix like E11 or a word from the chart to search.
          </p>
        ) : loading ? (
          Array.from({ length: 5 }).map((_, i) => <ResultRowSkeleton key={i} />)
        ) : showNoResults ? (
          <p className="my-3 text-sm text-muted">No codes match. Try a code prefix like E11 or a word from the chart.</p>
        ) : (
          results.map((result, i) => (
            <div id={`result-${result.icd10Code}`} key={result.icd10Code}>
              <ResultRow
                result={result}
                added={claimedCodes.includes(result.icd10Code)}
                active={i === activeIndex}
                onAdd={() => addClaimedCode(result.icd10Code)}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
