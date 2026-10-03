import { useId, useRef } from "react";
import { m, useInView } from "framer-motion";
import { cn } from "@/lib/cn";
import { CountUp } from "./count-up";
import { easeOut } from "./ease";

type Tone = "leaf" | "gold";

const PALETTES: Record<
  Tone,
  { from: string; to: string; glow: string; aura: string; text: string }
> = {
  leaf: {
    from: "#33c285",
    to: "#17704e",
    glow: "rgb(51 194 133 / 0.5)",
    aura: "rgb(51 194 133 / 0.16)",
    text: "text-leaf",
  },
  gold: {
    from: "#e7c46b",
    to: "#8a6d1f",
    glow: "rgb(201 162 39 / 0.45)",
    aura: "rgb(201 162 39 / 0.16)",
    text: "text-gold",
  },
};

type StatGaugeProps = {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  label: string;
  unit?: string;
  decimals?: number;
  ariaLabel: string;
  className?: string;
};

export function StatGauge({
  value,
  max = 100,
  size = 132,
  stroke = 12,
  tone = "leaf",
  label,
  unit = "",
  decimals = 0,
  ariaLabel,
  className,
}: StatGaugeProps) {
  const uid = useId();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const pal = PALETTES[tone];
  const big = size >= 132;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      className={cn("flex flex-col items-center", className)}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <defs>
            <linearGradient id={`${uid}-g`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={pal.from} />
              <stop offset="100%" stopColor={pal.to} />
            </linearGradient>
            <radialGradient id={`${uid}-a`}>
              <stop offset="40%" stopColor={pal.aura} />
              <stop offset="100%" stopColor={pal.aura} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={c} cy={c} r={r} fill={`url(#${uid}-a)`} />
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="var(--color-navy-700)"
            strokeWidth={stroke}
          />
          <m.circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={`url(#${uid}-g)`}
            strokeWidth={stroke}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: inView ? pct : 0 }}
            transition={{ duration: 1, ease: easeOut, delay: 0.1 }}
            style={{ filter: `drop-shadow(0 0 6px ${pal.glow})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center">
          <p className={cn("font-display font-medium leading-none tabular", pal.text, big ? "text-3xl" : "text-xl")}>
            <CountUp value={value} decimals={decimals} suffix={unit === "" ? "" : ` ${unit}`} />
          </p>
          <p className="text-[11px] leading-tight text-subtle">{label}</p>
        </div>
      </div>
    </div>
  );
}