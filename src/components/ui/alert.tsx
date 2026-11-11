import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("rounded-card border px-4 py-3 text-sm", {
  variants: {
    variant: {
      default: "border-border bg-surface-alt text-ink",
      success: "border-accent-soft bg-accent-soft text-accent-ink",
      warn: "border-warn-soft bg-warn-soft text-warn-ink",
      destructive: "border-danger-soft bg-danger-soft text-danger-ink",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Alert({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div role="status" className={cn(alertVariants({ variant }), className)} {...props} />;
}
