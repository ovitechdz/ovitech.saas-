import { cn } from "@/lib/cn";
import { useAppT } from "@/i18n/hooks";
import { Badge } from "@/components/ui/badge";
import type { AnimalHealth, HealthLevel } from "@/lib/health";

const tone: Record<HealthLevel, "ok" | "warn" | "danger"> = {
  ok: "ok",
  suivi: "warn",
  alerte: "danger",
};

export function HealthStatusBadge({ health }: { health: AnimalHealth }) {
  const t = useAppT();
  return (
    <Badge tone={tone[health.status]}>{t(`app.health.status.${health.status}`)}</Badge>
  );
}

export function HealthSignals({
  health,
  className,
}: {
  health: AnimalHealth;
  className?: string;
}) {
  const t = useAppT();
  if (health.signals.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {health.signals.map((s) => (
        <li key={s.id}>
          <Badge tone={s.level === "alerte" ? "danger" : "warn"}>
            {t(`app.health.signal.${s.id}`)}
          </Badge>
        </li>
      ))}
    </ul>
  );
}