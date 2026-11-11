"use client";

import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/forms";

/** Submit button that disables itself while its form's action is in flight. */
export function SubmitButton({ children, pendingLabel, ...props }: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? (pendingLabel ?? "Saving…") : children}
    </Button>
  );
}

/** The action's summary message, if it has one. */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.status === "idle") return null;
  return (
    <Alert variant={state.status === "success" ? "success" : "destructive"} aria-live="polite">
      {state.message}
    </Alert>
  );
}

export function fieldError(state: ActionState, name: string): string | undefined {
  return state.status === "error" ? state.fieldErrors?.[name] : undefined;
}

/** Label + control + inline error, stacked. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-[12px] text-muted">{hint}</p> : null}
      {error ? (
        <p className="text-[12px] text-danger-ink" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
