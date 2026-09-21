export type HccBadgeVariant = "mapped" | "unmapped" | "suppressed";

const VARIANT_CLASSES: Record<HccBadgeVariant, string> = {
  mapped: "bg-accent-soft text-accent-ink",
  unmapped: "bg-border text-muted",
  suppressed: "bg-warn-soft text-warn-ink",
};

export function HccBadge({ variant, label }: { variant: HccBadgeVariant; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-badge px-[7px] py-[3px] text-[11px] font-semibold tracking-wide ${VARIANT_CLASSES[variant]}`}
    >
      {label}
    </span>
  );
}
