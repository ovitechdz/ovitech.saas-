import { useId, useRef, type ReactNode } from "react";
import { m, useInView } from "framer-motion";
import { cn } from "@/lib/cn";
import { easeOut } from "./ease";

export type DonutSegment = { key: string; value: number; color: string };

type DonutProps = {
  segments: DonutSegment[];
  size?: number;
  stroke?: number;
  ariaLabel: string;
  center?: ReactNode;
  className?: string;
};

export function Donut({
  segments,
  size = 148,
  stroke = 14,
  ariaLabel,
  center,
  className,
}: DonutProps) {
  const uid = useId();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = Math.max(0, s.value) / Math.max(total, 1);
      const arc = { key: s.key, color: s.color, length: frac * circ, offset: acc * circ };
      acc += frac;
      return arc;
    });

  return (
    <div
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <defs>
          <radialGradient id={`${uid}-a`}>
            <stop offset="55%" stopColor="rgb(201 162 39 / 0.08)" />
            <stop offset="100%" stopColor="rgb(201 162 39 / 0.05)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={c} cy={c} r={r} fill={`url(#${uid}-a)`} />
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-navy-700)" strokeWidth={stroke} />
        <m.g
          initial={{ opacity: 0 }}
          animate={{ opacity: inView ? 1 : 0 }}
          transition={{ duration: 0.7, ease: easeOut }}
        >
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${arc.length} ${circ - arc.length}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
        </m.g>
      </svg>
      {center && <div className="absolute inset-0 flex items-center justify-center">{center}</div>}
    </div>
  );
}