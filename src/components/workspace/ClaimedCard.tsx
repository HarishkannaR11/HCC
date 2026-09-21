import { HccBadge } from "./HccBadge";
import { MeatChips } from "./MeatChips";
import type { EvidenceLink, RafCodePreview } from "@/lib/workspace/types";
import { meatFlagsFor } from "@/lib/workspace/store";

export function ClaimedCard({
  preview,
  evidenceLinks,
  onRemove,
}: {
  preview: RafCodePreview;
  evidenceLinks: EvidenceLink[];
  onRemove: () => void;
}) {
  const primary = preview.mappings[0];
  const suppressed = primary?.suppressedBy != null;

  const badgeVariant = suppressed ? "suppressed" : primary ? "mapped" : "unmapped";
  const badgeLabel = suppressed
    ? `Suppressed by HCC ${primary!.suppressedBy}`
    : primary
      ? `HCC ${primary.category}`
      : "No HCC";

  const weightLabel = !primary ? "—" : suppressed ? "0.000" : `+${preview.scoredWeight.toFixed(3)}`;
  const weightColorClass = suppressed ? "text-warn-ink" : primary ? "text-accent" : "text-muted";

  const codeEvidence = evidenceLinks.filter((link) => link.codeId === preview.icd10Code);
  const evidenceText =
    codeEvidence.length === 0
      ? "No evidence linked yet"
      : codeEvidence.length === 1
        ? `“${truncate(codeEvidence[0].text, 60)}”`
        : `${codeEvidence.length} evidence links`;

  return (
    <div className="rounded-card border border-border bg-surface p-3.5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold">{preview.icd10Code}</span>
        <HccBadge variant={badgeVariant} label={badgeLabel} />
        <div className="flex-1" />
        <span className={`font-mono text-[13px] ${weightColorClass}`}>{weightLabel}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${preview.icd10Code}`}
          className="h-8 w-8 flex items-center justify-center rounded-[6px] border-0 bg-transparent text-muted cursor-pointer hover:bg-border/50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <span className="text-[13px] leading-snug text-ink/90">{preview.description}</span>

      <div className="flex items-center gap-1.5">
        <MeatChips flags={meatFlagsFor(evidenceLinks, preview.icd10Code)} />
        <span className="text-xs text-muted ml-1">{evidenceText}</span>
      </div>

      {suppressed && (
        <span className="text-xs text-warn-ink">
          Suppressed by HCC {primary!.suppressedBy} in the same hierarchy
        </span>
      )}
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
