import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide",
  {
    variants: {
      tone: {
        gold: "bg-gold/15 text-gold",
        leaf: "bg-leaf/15 text-leaf",
        muted: "bg-fg/8 text-muted",
        warn: "bg-warn/15 text-warn",
        danger: "bg-danger/15 text-danger",
        ok: "bg-ok/15 text-ok",
      },
    },
    defaultVariants: { tone: "muted" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
