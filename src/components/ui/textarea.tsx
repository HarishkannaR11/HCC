import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-20 w-full rounded-[6px] border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
