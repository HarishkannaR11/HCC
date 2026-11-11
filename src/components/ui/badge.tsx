import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-badge px-1.5 py-0.5 text-[12px] font-medium", {
  variants: {
    variant: {
      default: "bg-accent-soft text-accent-ink",
      outline: "border border-border text-muted",
      warn: "bg-warn-soft text-warn-ink",
      danger: "bg-danger-soft text-danger-ink",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
