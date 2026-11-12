import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label + control + inline error, wired up for screen readers. */
export function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="m-0 text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="m-0 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormStatus({ error, ok, okText = "Saved." }: { error?: string; ok?: boolean; okText?: string }) {
  if (error) return <p role="alert" className="m-0 text-[13px] text-destructive">{error}</p>;
  if (ok) return <p role="status" className="m-0 text-[13px] text-accent-ink">{okText}</p>;
  return null;
}
