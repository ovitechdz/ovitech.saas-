import type { LucideIcon } from "lucide-react";
import { Fragment } from "react";
import { m } from "framer-motion";
import { cn } from "@/lib/cn";

export type FlowNode = {
  key: string;
  label: string;
  icon?: LucideIcon;
  ok?: boolean;
};

const DASH = "8 6";

export function FlowArrows({ nodes, className }: { nodes: FlowNode[]; className?: string }) {
  return (
    <ul role="list" className={cn("flex flex-wrap items-center gap-y-3", className)}>
      {nodes.map((node, i) => {
        const Icon = node.icon;
        return (
          <Fragment key={node.key}>
            {i > 0 && (
              <div aria-hidden="true" className="min-w-8 flex-1 px-1">
                <svg className="h-1.5 w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
                  <m.line
                    x1={0}
                    y1={2.5}
                    x2={1000}
                    y2={2.5}
                    stroke="var(--color-gold-500)"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeDasharray={DASH}
                    animate={{ strokeDashoffset: [0, -14] }}
                    transition={{ duration: 1.1, ease: "linear", repeat: Infinity }}
                  />
                </svg>
              </div>
            )}
            <li role="listitem" className="flex shrink-0 flex-col items-center gap-1.5 px-1 text-center">
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border",
                  node.ok
                    ? "border-leaf/60 bg-leaf/15 text-leaf shadow-[0_0_14px_rgb(51_194_133/0.35)]"
                    : "border-gold/25 bg-surface text-muted",
                )}
              >
                {Icon ? (
                  <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
                ) : (
                  <span className="font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                )}
              </span>
              <span
                className={cn(
                  "max-w-20 text-[11px] leading-tight",
                  node.ok ? "text-fg" : "text-muted",
                )}
              >
                {node.label}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}