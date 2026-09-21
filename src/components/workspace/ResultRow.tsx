import { HccBadge } from "./HccBadge";
import type { CodeSearchResult } from "@/lib/workspace/types";

export function ResultRow({
  result,
  added,
  active,
  onAdd,
}: {
  result: CodeSearchResult;
  added: boolean;
  active: boolean;
  onAdd: () => void;
}) {
  const primaryHcc = result.hccs[0];

  return (
    <div
      data-active={active || undefined}
      className={
        "flex items-center gap-3.5 rounded-card border p-3 " +
        (active ? "border-accent bg-accent-soft/40" : "border-border bg-surface")
      }
    >
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-semibold">{result.icd10Code}</span>
          <HccBadge
            variant={primaryHcc ? "mapped" : "unmapped"}
            label={primaryHcc ? `HCC ${primaryHcc.category}` : "No HCC"}
          />
          {result.hccs.length > 1 && (
            <span className="text-xs text-muted">+{result.hccs.length - 1} more</span>
          )}
        </div>
        <span className="text-[13px] leading-snug text-ink/90">{result.description}</span>
      </div>

      {added ? (
        <span className="flex shrink-0 items-center gap-1 h-11 px-2.5 text-sm font-medium text-accent-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5 9-10" />
          </svg>
          Added
        </span>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${result.icd10Code}`}
          className="shrink-0 h-11 px-4 rounded-card border border-accent bg-surface text-sm font-medium text-accent cursor-pointer hover:bg-accent-soft"
        >
          Add
        </button>
      )}
    </div>
  );
}

export function ResultRowSkeleton() {
  return (
    <div className="flex items-center gap-3.5 rounded-card border border-border bg-surface p-3 animate-pulse" aria-hidden="true">
      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <div className="h-4 w-24 rounded bg-border" />
        <div className="h-3 w-4/5 rounded bg-border" />
      </div>
      <div className="h-11 w-16 shrink-0 rounded-card bg-border" />
    </div>
  );
}
