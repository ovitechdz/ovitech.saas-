import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp, Entrance, StatGauge } from "@/components/charts";
import { pendingCount, useFarmStore } from "@/lib/store";
import { computeFarmKpis } from "@/lib/kpis";
import { KPI_DICTIONARY } from "@/lib/seed";
import { formatDzd, formatKg } from "@/lib/format";
import { TimeText } from "@/components/time-text";
import { useAppT, useAppLang } from "@/i18n/hooks";
import { pickFarmData } from "@/lib/backup";
import { generateRapportInd } from "@/lib/indicateurs-pdf";
import { loadPdfMake, renderPdfBuffer } from "@/lib/pdf-engine";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/indicateurs")({
  component: IndicateursPage,
});

const axis = { fill: "var(--color-muted)", fontSize: 11 };
const tooltipStyle = {
  background: "var(--color-navy-800)",
  border: "1px solid var(--color-gold-700)",
  color: "var(--color-ink-100)",
};

function IndicateursPage() {
  const t = useAppT();
  const { lang } = useAppLang();
  const [busy, setBusy] = useState(false);
  const animals = useFarmStore((s) => s.animals);
  const recs = useFarmStore((s) => s.recs);
  const series = useFarmStore((s) => s.kpiSeries);
  const pending = useFarmStore((s) => pendingCount(s));
  const feed = useFarmStore((s) => s.feed);
  const lastSyncedAt = useFarmStore((s) => s.lastSyncedAt);
  const network = useFarmStore((s) => s.network);
  const energy = useFarmStore((s) => s.energy);

  const kpis = computeFarmKpis({
    animals,
    recs,
    feed,
    pending,
    energyAutonomy: energy.autonomyPercent,
  });

  useEffect(() => {
    void (async () => {
      try {
        const api = await loadPdfMake();
        await renderPdfBuffer(api, { content: [{ text: "" }] }).catch(() => {});
      } catch {
        // warm-up best-effort — le clic rechargera si nécessaire
      }
    })();
  }, []);

  async function onRapport() {
    setBusy(true);
    try {
      await generateRapportInd({
        t,
        lang,
        data: pickFarmData(useFarmStore.getState()),
        kpis,
        series,
        date: new Date().toISOString().slice(0, 10),
      });
      toast.success(t("app.rapport.pdfDone"));
    } catch {
      toast.error(t("app.rapport.pdfError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gold">{t("app.indicateurs.kicker")}</p>
          <h1 className="mt-2 font-display text-4xl">{t("app.indicateurs.title")}</h1>
          <p className="mt-2 max-w-2xl text-muted">
            {t("app.indicateurs.lead")}
          </p>
          <p className="mt-3 text-xs text-subtle">
            {t("app.indicateurs.demoNote")}
          </p>
          <p className="mt-3 text-xs text-subtle">
            {t("app.indicateurs.fraicheur", { state: network === "offline" ? t("app.common.donneesLocales") : t("app.common.derniereSynchro"), pending })}{" "}
            <TimeText iso={lastSyncedAt} />
          </p>
        </div>
        <Button size="lg" onClick={onRapport} disabled={busy}>
          <Download className="size-4" />
          {busy ? t("app.rapport.pdfBusy") : t("app.rapport.export")}
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <GaugeCard source={t("app.indicateurs.srcTags")}>
          <StatGauge value={kpis.identifiedPct} label={t("app.indicateurs.kpiIdent")} ariaLabel={`${t("app.indicateurs.kpiIdent")} ${kpis.identifiedPct} %`} />
        </GaugeCard>
        <GaugeCard source={t("app.indicateurs.srcMoteur")}>
          <StatGauge value={kpis.dataDrivenPct} tone="gold" label={t("app.indicateurs.kpiData")} ariaLabel={`${t("app.indicateurs.kpiData")} ${kpis.dataDrivenPct} %`} />
        </GaugeCard>
        {kpis.coverDays != null ? (
          <GaugeCard source={t("app.indicateurs.srcLots")}>
            <StatGauge value={kpis.coverDays} max={365} unit="j" label={t("app.indicateurs.kpiCouv")} ariaLabel={`${t("app.indicateurs.kpiCouv")} ${Math.round(kpis.coverDays)} j`} />
          </GaugeCard>
        ) : (
          <GaugeCard source={t("app.indicateurs.srcLots")}>
            <div className="flex h-full items-center justify-center">
              <p className="font-display text-4xl tabular text-muted">—</p>
            </div>
          </GaugeCard>
        )}
        <GaugeCard source={t("app.indicateurs.srcHistorique")}>
          <StatGauge value={kpis.meanAdg} max={2} decimals={2} unit="kg/j" label={t("app.indicateurs.kpiGmq")} ariaLabel={`${t("app.indicateurs.kpiGmq")} ${kpis.meanAdg.toFixed(2)} kg/j`} />
        </GaugeCard>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Entrance delay={0}>
          <KpiCard label={t("app.indicateurs.kpiHerd")} source={t("app.indicateurs.srcRegistre")}>
            <CountUp value={kpis.active.length} />
          </KpiCard>
        </Entrance>
        <Entrance delay={60}>
          <KpiCard label={t("app.indicateurs.kpiPoids")} source={t("app.indicateurs.srcPesee")}>
            <span>{formatKg(kpis.meanW)}</span>
          </KpiCard>
        </Entrance>
        <Entrance delay={120}>
          <KpiCard label={t("app.indicateurs.kpiRefus")} source={t("app.indicateurs.srcEntrees")}>
            <CountUp value={kpis.recBlock} />
          </KpiCard>
        </Entrance>
        <Entrance delay={180}>
          <KpiCard label={t("app.indicateurs.kpiCout")} source={t("app.indicateurs.srcCout")}>
            <span>{formatDzd(kpis.rationCost)}</span>
          </KpiCard>
        </Entrance>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("app.indicateurs.chartGmqTitle")}</CardTitle>
            <CardDesc>{t("app.indicateurs.chartGmqDesc")}</CardDesc>
          </CardHeader>
          <div className="h-56" role="img" aria-label={t("app.indicateurs.chartGmqTitle")}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid stroke="var(--color-navy-700)" vertical={false} />
                <XAxis dataKey="day" tick={axis} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={axis} domain={["auto", "auto"]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="adg" name={t("app.indicateurs.seriesGmq")} stroke="var(--color-green-400)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("app.indicateurs.chartIdentTitle")}</CardTitle>
            <CardDesc>{t("app.indicateurs.chartIdentDesc")}</CardDesc>
          </CardHeader>
          <div className="h-56" role="img" aria-label={t("app.indicateurs.chartIdentTitle")}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid stroke="var(--color-navy-700)" vertical={false} />
                <XAxis dataKey="day" tick={axis} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={axis} domain={[70, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="identified" name={t("app.indicateurs.seriesIdent")} stroke="var(--color-gold-500)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <section>
        <h2 className="font-display text-2xl">{t("app.indicateurs.dictTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {t("app.indicateurs.dictLead")}
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-start text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t("app.indicateurs.thId")}</th>
                <th className="px-4 py-3 font-medium">{t("app.indicateurs.thIndicateur")}</th>
                <th className="px-4 py-3 font-medium">{t("app.indicateurs.thFormule")}</th>
                <th className="px-4 py-3 font-medium">{t("app.indicateurs.thSource")}</th>
                <th className="px-4 py-3 font-medium">{t("app.indicateurs.thCible")}</th>
              </tr>
            </thead>
            <tbody>
              {KPI_DICTIONARY.map((k) => (
                <tr key={k.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 font-mono text-xs text-gold">{k.id}</td>
                  <td className="px-4 py-3">
                    <p>{k.name}</p>
                    <p className="text-xs text-subtle">{k.pillar}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{k.formula}</td>
                  <td className="px-4 py-3 text-muted">{k.source}</td>
                  <td className="px-4 py-3 text-muted">{k.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, source, children }: { label: string; source: string; children: ReactNode }) {
  return (
    <Card className="flex h-full flex-col justify-between p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-2 font-display text-2xl tabular">{children}</p>
      </div>
      <p className="mt-1 text-xs text-subtle">{source}</p>
    </Card>
  );
}

function GaugeCard({ source, children }: { source: string; children: ReactNode }) {
  return (
    <Card className="flex h-full flex-col items-center gap-2 p-4">
      {children}
      <p className="text-xs text-subtle">{source}</p>
    </Card>
  );
}
