import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useFarmStore } from "@/lib/store";
import { latestRecByAnimal, weightsFor } from "@/lib/kpis";
import { computeAnimalHealth, type AnimalHealth, type HealthLevel } from "@/lib/health";
import { HealthSignals } from "@/components/health-status";
import { ageLabel } from "@/lib/format";
import type { Animal, Stage } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useAppT } from "@/i18n/hooks";

export const Route = createFileRoute("/sante")({ component: SantePage });

type Filter = HealthLevel | "all";

const FILTERS: Filter[] = ["all", "alerte", "suivi", "ok"];

function SantePage() {
  const t = useAppT();
  const role = useFarmStore((s) => s.role);
  const animals = useFarmStore((s) => s.animals);
  const weights = useFarmStore((s) => s.weights);
  const recs = useFarmStore((s) => s.recs);
  const [filter, setFilter] = useState<Filter>("all");

  const latest = useMemo(() => latestRecByAnimal(recs), [recs]);
  const rows = useMemo(() => {
    const out: { a: Animal; h: AnimalHealth }[] = [];
    for (const a of animals) {
      if (a.status !== "actif") continue;
      out.push({ a, h: computeAnimalHealth(a, weightsFor(a.id, weights), latest.get(a.id)) });
    }
    return out;
  }, [animals, weights, latest]);

  const stats = useMemo(() => {
    const s = { alerte: 0, suivi: 0, ok: 0 };
    for (const r of rows) s[r.h.status] += 1;
    return s;
  }, [rows]);

  const shown = useMemo(
    () => rows.filter((r) => filter === "all" || r.h.status === filter),
    [rows, filter],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">{t("app.health.kicker")}</p>
        <h1 className="mt-2 font-display text-4xl">{t("app.health.title")}</h1>
        <p className="mt-2 max-w-2xl text-muted">{t("app.health.lead")}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat k={t("app.health.statsAlerte")} v={stats.alerte} tone="danger" />
        <MiniStat k={t("app.health.statsSuivi")} v={stats.suivi} tone="warn" />
        <MiniStat k={t("app.health.statsOk")} v={stats.ok} tone="ok" />
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">{t("app.health.organizerTitle")}</h2>
            <p className="text-sm text-muted">{t("app.health.organizerDesc")}</p>
          </div>
          {role === "production" && (
            <Button asChild size="sm" variant="outline">
              <Link to="/troupeau">{t("app.troupeau.title")}</Link>
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? t("app.health.all") : t(`app.health.status.${f}`)}
            </FilterChip>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">{t("app.troupeau.compte", { count: shown.length })}</p>
        {shown.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t("app.health.emptySuivi")}</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map(({ a, h }) => (
              <HealthCard key={a.id} a={a} h={h} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MiniStat({ k, v, tone }: { k: string; v: number; tone: "ok" | "warn" | "danger" }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{k}</p>
      <p
        className={cn(
          "mt-1 font-display text-3xl tabular",
          tone === "danger" && "text-rose-400",
          tone === "warn" && "text-amber-400",
          tone === "ok" && "text-green-400",
        )}
      >
        {v}
      </p>
    </Card>
  );
}

function HealthCard({ a, h }: { a: Animal; h: AnimalHealth }) {
  const t = useAppT();
  return (
    <Link to="/troupeau/$id" params={{ id: a.id }}>
      <Card className="h-full transition-colors duration-150 hover:border-gold/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-xl">{a.code}</p>
            <p className="font-mono text-xs text-muted">{a.rfid}</p>
          </div>
          <StageBadge stage={a.stage} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge
            tone={
              h.status === "alerte" ? "danger" : h.status === "suivi" ? "warn" : "ok"
            }
          >
            {t(`app.health.status.${h.status}`)}
          </Badge>
          {h.vetReview && <Badge tone="danger">{t("app.health.vetReview")}</Badge>}
        </div>
        <HealthSignals health={h} className="mt-3" />
        <p className="mt-3 text-xs text-subtle">
          {a.pen} · {ageLabel(a.birthDate)}
        </p>
      </Card>
    </Link>
  );
}

function StageBadge({ stage }: { stage: Stage }) {
  const t = useAppT();
  return <Badge tone="leaf">{t("app.stages." + stage)}</Badge>;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-gold/50 bg-gold/10 text-gold"
          : "border-border bg-surface text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}