import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Camera, Cpu, DoorOpen, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useFarmStore } from "@/lib/store";
import { useAppLang, useAppT } from "@/i18n/hooks";

export const Route = createFileRoute("/ecosysteme/")({ component: EcosystemeIndexPage });

const DEVICES = [
  { key: "cameras", icon: Camera, to: "/ecosysteme/cameras" },
  { key: "portails", icon: DoorOpen, to: "/ecosysteme/portails" },
  { key: "balance", icon: Scale, to: "/ecosysteme/balance" },
  { key: "iot", icon: Cpu, to: "/ecosysteme/iot" },
] as const;

function EcosystemeIndexPage() {
  const t = useAppT();
  const { lang } = useAppLang();
  const animals = useFarmStore((s) => s.animals);
  const weights = useFarmStore((s) => s.weights);

  const stats = useMemo(() => {
    const actifs = animals.filter((a) => a.status === "actif");
    const avecPoids = actifs.filter((a) => a.weightKg !== null);
    const scanRecents = actifs.filter(
      (a) => a.lastScanAt !== null && Date.now() - new Date(a.lastScanAt).getTime() < 14 * 86400000,
    );
    const poidsPct =
      actifs.length > 0 ? Math.round((avecPoids.length / actifs.length) * 100) : 0;
    const scanPct =
      actifs.length > 0 ? Math.round((scanRecents.length / actifs.length) * 100) : 0;
    return {
      actifs: actifs.length,
      avecPoids: avecPoids.length,
      pesees: weights.length,
      scanRecents: scanRecents.length,
      scanPct,
      poidsPct,
    };
  }, [animals, weights]);

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.22em] text-gold">
            {t("app.ecosysteme.kicker")}
          </p>
          <h1 className="mt-2 font-display text-4xl">{t("app.ecosysteme.title")}</h1>
          <p className="mt-2 max-w-3xl text-muted">{t("app.ecosysteme.lead")}</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>{t("app.ecosysteme.ideaTitle")}</CardTitle>
          </CardHeader>
          <p className="text-sm leading-relaxed text-muted">{t("app.ecosysteme.idea")}</p>
          <p className="mt-4 font-display text-lg">
            {t("app.ecosysteme.ideaPct")}{" "}
            <span className="text-gold">{t("app.ecosysteme.ideaPctHighlight")}</span>{" "}
            {t("app.ecosysteme.ideaPctEnd")}
          </p>
          <Badge tone="muted" className="mt-3">
            {t("app.ecosysteme.simulationBadge")}
          </Badge>
          <p className="mt-2 text-xs text-subtle">{t("app.ecosysteme.simulationDesc")}</p>
        </Card>

        <section>
          <h2 className="font-display text-xl">{t("app.ecosysteme.stats")}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat k={t("app.ecosysteme.statsAnimaux")} v={stats.actifs} />
            <MiniStat k={t("app.ecosysteme.statsPesees")} v={stats.pesees} />
            <MiniStat
              k={t("app.ecosysteme.statsScans")}
              v={`${stats.scanPct} %`}
              sub={`${stats.scanRecents} ${t("app.ecosysteme.statsScans")}`}
            />
            <MiniStat
              k={t("app.ecosysteme.statsAvecPoids")}
              v={`${stats.poidsPct} %`}
              sub={`${stats.avecPoids} ${t("app.ecosysteme.statsAnimaux")}`}
            />
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl">{t("app.ecosysteme.mapTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("app.ecosysteme.mapDesc")}</p>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-gold">
            {t("app.ecosysteme.layers")}
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DEVICES.map(({ key, icon: Icon, to }) => (
              <Link key={key} to={to}>
                <Card className="h-full p-4 transition-colors duration-150 hover:border-gold/40">
                  <Icon className="size-6 text-gold" />
                  <p className="mt-2 font-display text-lg">{t(`app.ecosysteme.${key}.title`)}</p>
                  <p className="mt-1 text-xs text-muted">{t(`app.ecosysteme.${key}Desc`)}</p>
                  <Badge tone="muted" className="mt-3">
                    {t("app.ecosysteme.simulationBadge")}
                  </Badge>
                </Card>
              </Link>
            ))}
          </div>

          <p className="mt-6 text-xs uppercase tracking-[0.18em] text-gold">
            {t("app.ecosysteme.mapTitle")}
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PillarLink label="Hybrid Feed Production" sub="fourrage" />
            <PillarLink label="Data-Driven Nutrition Engine" sub="nutrition" />
            <PillarLink label="Smart Energy Management" sub="energie" />
            <PillarLink label="Connected Livestock Intelligence" sub="troupeau" />
          </div>
        </section>
      </div>
    </div>
  );
}

function MiniStat({
  k,
  v,
  sub,
}: {
  k: string;
  v: string | number;
  sub?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{k}</p>
      <p className="mt-1 font-display text-3xl tabular">{v}</p>
      {sub && <p className="mt-1 text-xs text-subtle">{sub}</p>}
    </Card>
  );
}

const PILLAR_TO = {
  fourrage: "/fourrage",
  nutrition: "/nutrition",
  energie: "/energie",
  troupeau: "/troupeau",
} as const;

function PillarLink({ label, sub }: { label: string; sub: keyof typeof PILLAR_TO }) {
  return (
    <Link to={PILLAR_TO[sub]}>
      <Card className="h-full p-4 transition-colors duration-150 hover:border-gold/40">
        <p className="text-xs uppercase tracking-wider text-gold">{sub}</p>
        <p className="mt-1 font-display text-lg">{label}</p>
      </Card>
    </Link>
  );
}