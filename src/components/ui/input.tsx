import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-[6px] border border-border bg-surface px-3 text-sm text-ink placeholder:text-muted/70 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(fieldBase, "h-9 py-1", className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(fieldBase, "min-h-20 py-2 leading-relaxed", className)} {...props} />;
}

/** Native select: accessible and keyboard-friendly with no client JS. */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select data-slot="select" className={cn(fieldBase, "h-9 py-1 pr-8", className)} {...props} />;
}

export { Input, Textarea, NativeSelect };
