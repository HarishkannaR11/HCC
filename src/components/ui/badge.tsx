import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-badge px-[7px] py-[3px] text-[11px] font-semibold tracking-wide whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-accent-soft text-accent-ink",
        neutral: "bg-border text-muted",
        warn: "bg-warn-soft text-warn-ink",
        destructive: "bg-destructive-soft text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
