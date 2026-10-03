import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { pendingCount, useFarmStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import { useAppT } from "@/i18n/hooks";

export function GoldenPath({ compact = false, className }: { compact?: boolean; className?: string }) {
  const t = useAppT();
  const events = useFarmStore((s) => s.events);
  const recs = useFarmStore((s) => s.recs);
  const animals = useFarmStore((s) => s.animals);
  const network = useFarmStore((s) => s.network);
  const pending = useFarmStore((s) => pendingCount(s));

  const steps = [
    {
      n: "01",
      label: t("app.goldenPath.s1"),
      ok: events.some((e) => e.type === "scan" || e.type === "identite"),
    },
    {
      n: "02",
      label: t("app.goldenPath.s2"),
      ok: network === "offline" || events.some((e) => e.syncStatus === "local"),
    },
    {
      n: "03",
      label: t("app.goldenPath.s3"),
      ok: recs.some((r) => r.ration),
    },
    {
      n: "04",
      label: t("app.goldenPath.s4"),
      ok: events.some((e) => e.type === "sync") || pending > 0,
    },
    {
      n: "05",
      label: t("app.goldenPath.s5"),
      ok: animals.some((a) => a.weightKg != null && a.adgKg != null),
    },
  ];

  const done = steps.filter((s) => s.ok).length;

  return (
    <Card className={cn("bg-bg-elevated", compact && "p-4", className)}>
      <div className="mb-4 flex items-center gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">{t("app.goldenPath.boucleMvp")}</p>
          <p className="font-display text-lg">
            {t("app.goldenPath.titre", { done, total: steps.length })}
          </p>
        </div>
      </div>
      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.n} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full",
                step.ok ? "bg-leaf/20 text-leaf" : "bg-surface-2 text-subtle",
              )}
            >
              {step.ok ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                <span className="font-mono text-xs">{step.n}</span>
              )}
            </span>
            <span className={step.ok ? "text-fg" : "text-muted"}>{step.label}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}