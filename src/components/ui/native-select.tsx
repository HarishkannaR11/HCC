import * as React from "react";
import { cn } from "@/lib/utils";

/** shadcn's native-select: a styled <select>, so forms post without client JS. */
export function NativeSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-[6px] border border-border bg-surface px-2.5 text-sm text-ink disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
