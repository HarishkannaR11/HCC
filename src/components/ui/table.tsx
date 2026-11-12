import * as React from "react";
import { cn } from "@/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table data-slot="table" className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.04em] text-muted", className)}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td data-slot="table-cell" className={cn("border-b border-border px-3 py-2.5 align-top", className)} {...props} />;
}

export { Table, TableHead, TableCell };
