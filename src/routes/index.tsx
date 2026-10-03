import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Cpu, Radio, RefreshCw, SunMedium, Wheat, WifiOff, Zap } from "lucide-react";
import { useAppT } from "@/i18n/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { GoldenPath } from "@/components/golden-path";
import { TimeText } from "@/components/time-text";
import { Entrance, FlowArrows, StatGauge } from "@/components/charts";
import { pendingCount, useFarmStore } from "@/lib/store";
import { computeFarmKpis } from "@/lib/kpis";
import { formatDzd, formatKg } from "@/lib/format";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const t = useAppT();
  const animals = useFarmStore((s) => s.animals);
  const recs = useFarmStore((s) => s.recs);
  const energy = useFarmStore((s) => s.energy);
  const feed = useFarmStore((s) => s.feed);
  const events = useFarmStore((s) => s.events);
  const network = useFarmStore((s) => s.network);
  const pending = useFarmStore((s) => pendingCount(s));
  const lastSyncedAt = useFarmStore((s) => s.lastSyncedAt);
  const role = useFarmStore((s) => s.role);

  const kpis = computeFarmKpis({
    animals,
    recs,
    feed,
    pending,
    energyAutonomy: energy.autonomyPercent,
  });
  const latestRec = recs[0];
  const toReview = recs.filter((r) => r.ration && !r.approvedBy);
  const toServe = recs.filter((r) => r.ration && r.approvedBy && !r.servedAt);
  const hybrid = feed.find((f) => f.kind === "hybride");

  const flowOk = [
    events.some((e) => e.type === "scan" || e.type === "identite"),
    network === "offline" || events.some((e) => e.syncStatus === "local"),
    recs.some((r) => r.ration),
    events.some((e) => e.type === "sync") || pending > 0,
    animals.some((a) => a.weightKg != null && a.adgKg != null),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gold">
            {t("app.home.kicker")}
          </p>
          <Badge tone="muted" className="mt-3">{t("pres.demo")}</Badge>
          <h1 className="mt-2 font-display text-4xl font-medium leading-tight md:text-5xl">
            {t("app.home.title")}
          </h1>
          <div aria-hidden="true" className="gold-rule mt-4 w-32" />
          <p className="mt-4 max-w-xl text-muted">
            {t("app.home.lead")}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to={role === "field" ? "/scan" : "/nutrition"}>
                {role === "field" ? t("app.home.ctaScan") : t("app.home.ctaRevue")}
                <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={role === "production" ? "/indicateurs" : "/journee"}>
                {role === "production" ? t("app.home.ctaIndicateurs") : t("app.home.ctaJournee")}
              </Link>
            </Button>
          </div>
          <div className="mt-8">
            <p className="text-xs uppercase tracking-[0.18em] text-gold">{t("app.goldenPath.boucleMvp")}</p>
            <FlowArrows
              className="mt-3"
              nodes={[
                { key: "s1", label: t("app.goldenPath.s1"), icon: Radio, ok: flowOk[0] },
                { key: "s2", label: t("app.goldenPath.s2"), icon: WifiOff, ok: flowOk[1] },
                { key: "s3", label: t("app.goldenPath.s3"), icon: Cpu, ok: flowOk[2] },
                { key: "s4", label: t("app.goldenPath.s4"), icon: RefreshCw, ok: flowOk[3] },
                { key: "s5", label: t("app.goldenPath.s5"), icon: Zap, ok: flowOk[4] },
              ]}
            />
          </div>
        </div>
        <Entrance delay={120}>
          <Card className="glass-card p-5">
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.18em] text-gold">{t("app.home.dashTitle")}</p>
              <p className="text-xs text-subtle">{t("app.home.dashDesc")}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatGauge
                value={kpis.identifiedPct}
                label={t("app.indicateurs.kpiIdent")}
                ariaLabel={`${t("app.indicateurs.kpiIdent")} ${kpis.identifiedPct} %`}
              />
              <StatGauge
                value={energy.autonomyPercent}
                tone="gold"
                unit="%"
                label={t("app.energie.heroTitle")}
                ariaLabel={`${t("app.energie.heroTitle")} ${energy.autonomyPercent} %`}
              />
              <StatGauge
                value={kpis.coverDays ?? 0}
                max={365}
                unit="j"
                label={t("app.fourrage.heroUnit")}
                ariaLabel={`${t("app.fourrage.heroTitle")} ${Math.round(kpis.coverDays ?? 0)} ${t("app.fourrage.heroUnit")}`}
              />
              <StatGauge
                value={energy.batteryPercent}
                tone="gold"
                unit="%"
                size={116}
                stroke={10}
                label={t("app.energie.batterie")}
                ariaLabel={`${t("app.energie.batterie")} ${energy.batteryPercent} %`}
              />
            </div>
          </Card>
        </Entrance>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Entrance>
          <Card className="h-full border-gold/25 bg-gold/5">
            <p className="text-xs uppercase tracking-[0.18em] text-gold">{t("app.home.proofKicker")}</p>
            <p className="mt-2 text-sm text-muted">{t("app.home.proofBody")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/preuve">{t("app.home.proofReplay")}</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/label">{t("app.home.proofLabel")}</Link>
              </Button>
            </div>
          </Card>
        </Entrance>
        <Entrance delay={100}>
          <GoldenPath className="h-full" />
        </Entrance>
      </section>

      <Entrance>
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={t("app.home.statHerd")} value={String(kpis.active.length)} hint={`${kpis.identifiedPct} % RFID`} />
          <Stat label={t("app.home.statAdg")} value={`${kpis.meanAdg.toFixed(2)} kg`} hint={t("app.home.hintPesees")} />
          <Stat
            label={t("app.home.statSync")}
            value={String(pending)}
            hint={network === "offline" ? t("app.home.hintLocal") : <>{t("app.home.hintDerniere")} <TimeText iso={lastSyncedAt} /></>}
          />
          <Stat
            label={role === "production" ? t("app.home.statForage") : t("app.home.statEnergy")}
            value={
              role === "production"
                ? kpis.coverDays != null
                  ? `${Math.round(kpis.coverDays)} j`
                  : "—"
                : `${energy.autonomyPercent} %`
            }
            hint={
              role === "production"
                ? formatDzd(kpis.rationCost)
                : t("app.home.hintSolar", { kwh: energy.solarKwhToday })
            }
          />
        </section>
      </Entrance>

      {role === "field" && (
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted">{t("app.home.fieldToScan")}</p>
            <p className="mt-2 font-display text-3xl tabular">{kpis.staleScan.length}</p>
            <Button variant="ghost" size="sm" className="mt-3 px-0" asChild>
              <Link to="/journee">{t("app.home.fieldOuvrir")}</Link>
            </Button>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted">{t("app.home.fieldSansPoids")}</p>
            <p className="mt-2 font-display text-3xl tabular">{kpis.missingWeight.length}</p>
            <p className="mt-1 text-xs text-subtle">{t("app.home.fieldBloque")}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted">{t("app.home.fieldNec")}</p>
            <p className="mt-2 font-display text-3xl tabular">{kpis.lowBcs.length}</p>
            <p className="mt-1 text-xs text-subtle">{t("app.home.fieldSuivi")}</p>
          </Card>
        </section>
      )}

      {role === "production" && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>{t("app.home.reviewTitle")}</CardTitle>
                <CardDesc>{t("app.home.reviewDesc")}</CardDesc>
              </div>
              <Badge tone={toReview.length ? "gold" : "ok"}>{t("app.home.reviewCompte", { count: toReview.length })}</Badge>
              {toServe.length > 0 && <Badge tone="warn">{t("app.home.serveCompte", { count: toServe.length })}</Badge>}
            </div>
          </CardHeader>
          {toReview.length === 0 ? (
            <p className="text-sm text-muted">{t("app.home.reviewEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {toReview.slice(0, 4).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-mono">
                    {animals.find((a) => a.id === r.animalId)?.code}
                  </span>
                  <span className="text-muted">
                    {r.ration
                      ? t("app.home.rationDetail", { forage: r.ration.forageKg, conc: r.ration.concentrateKg })
                      : t("app.common.refus")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/nutrition">{t("app.home.reviewMoteur")}</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/ration">{t("app.home.reviewFeuille")}</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/label">{t("app.home.reviewComite")}</Link>
            </Button>
          </div>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Pillar
          to="/troupeau"
          kicker={t("app.home.pillarIdentKicker")}
          title={t("app.home.pillarIdentTitle")}
          body={t("app.home.pillarIdentBody")}
          icon={Radio}
        />
        <Pillar
          to="/nutrition"
          kicker={t("app.home.pillarEngineKicker")}
          title={t("app.home.pillarEngineTitle")}
          body={t("app.home.pillarEngineBody")}
          icon={Cpu}
        />
        <Pillar
          to="/fourrage"
          kicker={t("app.home.pillarFeedKicker")}
          title={t("app.home.pillarFeedTitle")}
          body={t("app.home.pillarFeedBody")}
          icon={Wheat}
        />
        <Pillar
          to="/energie"
          kicker={t("app.home.pillarEnergyKicker")}
          title={t("app.home.pillarEnergyTitle")}
          body={t("app.home.pillarEnergyBody")}
          icon={SunMedium}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("app.home.latestTitle")}</CardTitle>
            <CardDesc>{t("app.home.latestDesc")}</CardDesc>
          </CardHeader>
          {latestRec ? (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm">
                  {animals.find((a) => a.id === latestRec.animalId)?.code}
                </p>
                <Badge tone={latestRec.confidence === "haute" ? "ok" : latestRec.confidence === "moyenne" ? "gold" : "danger"}>
                  {t(`app.confidence.${latestRec.confidence}`)}
                </Badge>
              </div>
              {latestRec.ration ? (
                <p className="mt-3 text-sm text-muted">
                  {t("app.home.rationDetail", { forage: latestRec.ration.forageKg, conc: latestRec.ration.concentrateKg })} · {latestRec.ration.meMj} MJ
                </p>
              ) : (
                <p className="mt-3 text-sm text-danger">{t("app.home.latestNoRation")}</p>
              )}
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link to="/nutrition">{t("app.home.reviewMoteur")}</Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted">{t("app.home.latestNone")}</p>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("app.home.journalTitle")}</CardTitle>
            <CardDesc>{t("app.home.journalDesc")}</CardDesc>
          </CardHeader>
          <ul className="space-y-3">
            {events.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p>{e.label}</p>
                  <p className="text-xs text-muted">{e.detail}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-subtle">
                  <TimeText iso={e.at} />
                </span>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" className="mt-4" asChild>
            <Link to="/sync">
              {t("app.home.journalOpen")}
              <RefreshCw />
            </Link>
          </Button>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-xl">{t("app.home.herdTitle")}</h2>
          <Link to="/troupeau" className="text-sm text-gold">
            {t("app.common.voirTout")}
          </Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-start text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t("app.common.code")}</th>
                <th className="px-4 py-3 font-medium">{t("app.common.rfid")}</th>
                <th className="px-4 py-3 font-medium">{t("app.common.stade")}</th>
                <th className="px-4 py-3 font-medium">{t("app.common.poids")}</th>
                <th className="px-4 py-3 font-medium">{t("app.common.parc")}</th>
              </tr>
            </thead>
            <tbody>
              {kpis.active.slice(0, 6).map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link to="/troupeau/$id" params={{ id: a.id }} className="text-gold">
                      {a.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{a.rfid}</td>
                  <td className="px-4 py-3">{t(`app.stages.${a.stage}`)}</td>
                  <td className="px-4 py-3 tabular">{formatKg(a.weightKg)}</td>
                  <td className="px-4 py-3 text-muted">{a.pen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hybrid && (
          <p className="mt-3 text-xs text-subtle">
            {t("app.home.herdContext", { name: hybrid.name, stock: hybrid.stockKg })}
          </p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl tabular">{value}</p>
      <p className="mt-1 text-xs text-subtle">{hint}</p>
    </Card>
  );
}

function Pillar({
  to,
  kicker,
  title,
  body,
  icon: Icon,
}: {
  to: string;
  kicker: string;
  title: string;
  body: string;
  icon: typeof Radio;
}) {
  return (
    <Link to={to} className="block">
      <Card className="h-full transition-colors duration-150 hover:border-gold/40">
        <Icon className="size-5 text-gold" />
        <p className="mt-4 text-xs uppercase tracking-[0.16em] text-gold">{kicker}</p>
        <h3 className="mt-2 font-display text-lg">{title}</h3>
        <p className="mt-2 text-sm text-muted">{body}</p>
      </Card>
    </Link>
  );
}