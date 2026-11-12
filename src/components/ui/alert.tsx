import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("rounded-card border px-4 py-3 text-[13px] leading-relaxed", {
  variants: {
    variant: {
      default: "border-border bg-surface-alt text-ink",
      info: "border-accent-soft bg-accent-soft text-accent-ink",
      warn: "border-warn-soft bg-warn-soft text-warn-ink",
      destructive: "border-destructive-soft bg-destructive-soft text-destructive",
    },
  },
  defaultVariants: { variant: "default" },
});

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div role="alert" data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export { Alert };
