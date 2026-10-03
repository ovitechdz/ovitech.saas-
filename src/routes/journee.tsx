import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Radio, Scale, Utensils, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { pendingCount, useFarmStore } from "@/lib/store";
import { computeFarmKpis, latestRecByAnimal } from "@/lib/kpis";
import { formatKg } from "@/lib/format";
import { TimeText } from "@/components/time-text";
import { useAppT } from "@/i18n/hooks";

export const Route = createFileRoute("/journee")({ component: JourneePage });

function JourneePage() {
  const t = useAppT();
  const animals = useFarmStore((s) => s.animals);
  const recs = useFarmStore((s) => s.recs);
  const feed = useFarmStore((s) => s.feed);
  const events = useFarmStore((s) => s.events);
  const network = useFarmStore((s) => s.network);
  const pending = useFarmStore((s) => pendingCount(s));
  const energy = useFarmStore((s) => s.energy);

  const kpis = computeFarmKpis({
    animals,
    recs,
    feed,
    pending,
    energyAutonomy: energy.autonomyPercent,
  });

  const latest = latestRecByAnimal(recs);
  const toServe = kpis.active.filter((a) => {
    const rec = latest.get(a.id);
    return Boolean(rec?.ration && rec.approvedBy && !rec.servedAt);
  });
  const refusedIds = new Set(recs.filter((r) => !r.ration).map((r) => r.animalId));
  const refusedAnimals = kpis.active.filter((a) => refusedIds.has(a.id));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">{t("app.journee.kicker")}</p>
        <h1 className="mt-2 font-display text-4xl">{t("app.journee.title")}</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {t("app.journee.lead")}
        </p>
      </header>

      {network === "offline" && (
        <Card className="border-warn/40 bg-warn/5">
          <p className="flex items-center gap-2 text-sm text-warn">
            <WifiOff className="size-4" />
            {t("app.journee.offline")}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("app.journee.aScanner")} value={String(kpis.staleScan.length)} hint={t("app.journee.hintStale")} />
        <Stat label={t("app.journee.sansPoids")} value={String(kpis.missingWeight.length)} hint={t("app.home.fieldBloque")} />
        <Stat label={t("app.journee.aServir")} value={String(toServe.length)} hint={t("app.journee.hintRevue")} />
        <Stat label={t("app.journee.fileSync")} value={String(pending)} hint={network === "offline" ? t("app.journee.hintLocal") : t("app.journee.hintPousser")} />
      </div>

      <Queue
        icon={Utensils}
        title={t("app.journee.rationsTitle")}
        desc={t("app.journee.rationsDesc")}
        empty={t("app.journee.rationsEmpty")}
        count={toServe.length}
        action={{ to: "/ration", label: t("app.common.feuille") }}
      >
        {toServe.map((a) => (
          <Row
            key={a.id}
            code={a.code}
            id={a.id}
            meta={`${t("app.stages." + a.stage)} · ${a.pen}`}
            extra={<Badge tone="gold">{t("app.journee.aServirBadge")}</Badge>}
            href="/ration"
            hrefLabel={t("app.common.servir")}
          />
        ))}
      </Queue>

      <Queue
        icon={Radio}
        title={t("app.journee.identTitle")}
        desc={t("app.journee.identDesc")}
        empty={t("app.journee.identEmpty")}
        count={kpis.staleScan.length}
      >
        {kpis.staleScan.map((a) => (
          <Row
            key={a.id}
            code={a.code}
            id={a.id}
            meta={`${t("app.stages." + a.stage)} · ${a.pen}`}
            extra={<TimeText iso={a.lastScanAt} />}
            hrefLabel={t("app.common.scan")}
          />
        ))}
      </Queue>

      <Queue
        icon={Scale}
        title={t("app.journee.donneesTitle")}
        desc={t("app.journee.donneesDesc")}
        empty={t("app.journee.donneesEmpty")}
        count={kpis.missingWeight.length}
      >
        {kpis.missingWeight.map((a) => (
          <Row
            key={a.id}
            code={a.code}
            id={a.id}
            meta={`${a.rfid} · ${a.pen}`}
            extra={<Badge tone="danger">{t("app.common.poids")}</Badge>}
            hrefLabel={t("app.common.scan")}
          />
        ))}
      </Queue>

      <Queue
        icon={AlertTriangle}
        title={t("app.journee.alertesTitle")}
        desc={t("app.journee.alertesDesc")}
        empty={t("app.journee.alertesEmpty")}
        count={kpis.lowBcs.length + refusedAnimals.length}
      >
        {kpis.lowBcs.map((a) => (
          <Row
            key={`bcs-${a.id}`}
            code={a.code}
            id={a.id}
            meta={`NEC ${a.bcs} · ${formatKg(a.weightKg)}`}
            extra={<Badge tone="warn">{t("app.common.nec")}</Badge>}
            hrefLabel={t("app.common.scan")}
          />
        ))}
        {refusedAnimals.map((a) => (
          <Row
            key={`ref-${a.id}`}
            code={a.code}
            id={a.id}
            meta={t("app.journee.insuffisant")}
            extra={<Badge tone="danger">{t("app.nutrition.filtrerRefus")}</Badge>}
            hrefLabel={t("app.common.scan")}
          />
        ))}
      </Queue>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.journee.journalTitle")}</CardTitle>
          <CardDesc>{t("app.journee.journalDesc")}</CardDesc>
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
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/scan">{t("app.journee.openScan")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/journal">{t("app.journee.openJournal")}</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl tabular">{value}</p>
      <p className="mt-1 text-xs text-subtle">{hint}</p>
    </Card>
  );
}

function Queue({
  icon: Icon,
  title,
  desc,
  empty,
  count,
  children,
  action,
}: {
  icon: typeof Radio;
  title: string;
  desc: string;
  empty: string;
  count: number;
  children: ReactNode;
  action?: { to: "/ration" | "/scan"; label: string };
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-gold" />
          <CardTitle>{title}</CardTitle>
          <Badge tone={count ? "gold" : "ok"}>{count}</Badge>
        </div>
        <CardDesc>{desc}</CardDesc>
      </CardHeader>
      {count === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">{children}</ul>
      )}
      {action && (
        <Button variant="ghost" size="sm" className="mt-3 px-0" asChild>
          <Link to={action.to}>{action.label}</Link>
        </Button>
      )}
    </Card>
  );
}

function Row({
  code,
  id,
  meta,
  extra,
  href = "/scan",
  hrefLabel,
}: {
  code: string;
  id: string;
  meta: string;
  extra: ReactNode;
  href?: "/scan" | "/ration";
  hrefLabel?: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div>
        <Link to="/troupeau/$id" params={{ id }} className="font-mono text-gold">
          {code}
        </Link>
        <p className="text-xs text-muted">{meta}</p>
      </div>
      <div className="flex items-center gap-2">
        {extra}
        <Button size="sm" variant="outline" asChild>
          <Link to={href}>{hrefLabel}</Link>
        </Button>
      </div>
    </li>
  );
}
