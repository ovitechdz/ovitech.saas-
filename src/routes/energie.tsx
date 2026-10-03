import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp, StatGauge } from "@/components/charts";
import { useFarmStore } from "@/lib/store";
import { useAppT } from "@/i18n/hooks";

export const Route = createFileRoute("/energie")({ component: EnergiePage });

const axis = { fill: "var(--color-muted)", fontSize: 11 };
const tooltipStyle = {
  background: "var(--color-navy-800)",
  border: "1px solid var(--color-gold-700)",
  borderRadius: 8,
  color: "var(--color-ink-100)",
};

function EnergiePage() {
  const t = useAppT();
  const energy = useFarmStore((s) => s.energy);
  const surplus = energy.solarKwhToday - energy.consumedKwhToday;
  const loads = [
    { nameKey: "app.energie.l1name", roleKey: "app.energie.l1role", share: "critique" },
    { nameKey: "app.energie.l2name", roleKey: "app.energie.l2role", share: "critique" },
    { nameKey: "app.energie.l3name", roleKey: "app.energie.l3role", share: "operationnel" },
    { nameKey: "app.energie.l4name", roleKey: "app.energie.l4role", share: "conditionnel" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">{t("app.energie.kicker")}</p>
        <h1 className="mt-2 font-display text-4xl">{t("app.energie.title")}</h1>
        <p className="mt-2 max-w-2xl text-muted">{t("app.energie.lead")}</p>
      </header>

      <Card className="relative overflow-hidden border-gold/40 bg-gold/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-gold">{t("app.energie.heroTitle")}</p>
            <p className="mt-2 max-w-xl text-lg text-ink-200">
              {t("app.energie.heroSub", { pct: energy.autonomyPercent })}
            </p>
            <div className="mt-3">
              <Badge tone={energy.status === "nominal" ? "ok" : "warn"}>{energy.status}</Badge>
            </div>
            <p className="mt-2 max-w-xl text-xs text-subtle">{t("app.energie.heroHint")}</p>
          </div>
          <div className="w-full max-w-[13rem]">
            <StatGauge
              value={energy.autonomyPercent}
              size={150}
              stroke={13}
              tone="gold"
              unit="%"
              label={t("app.energie.heroTitle")}
              ariaLabel={`${t("app.energie.heroTitle")} ${energy.autonomyPercent} %`}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{t("app.energie.solaireDuJour")}</p>
          <p className="mt-2 font-display text-2xl tabular">
            <CountUp value={energy.solarKwhToday} suffix=" kWh" />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{t("app.energie.chargeFerme")}</p>
          <p className="mt-2 font-display text-2xl tabular">
            <CountUp value={energy.consumedKwhToday} suffix=" kWh" />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{t("app.energie.surplus")}</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="font-display text-2xl tabular">
              <CountUp value={surplus} decimals={1} prefix={surplus > 0 ? "+" : ""} suffix=" kWh" />
            </p>
            <Badge tone={surplus >= 0 ? "ok" : "warn"}>{surplus >= 0 ? "+" : "−"}</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{t("app.energie.batterie")}</p>
          <p className="mt-2 font-display text-2xl tabular">
            <CountUp value={energy.batteryPercent} suffix=" %" />
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.energie.chargesTitle")}</CardTitle>
          <CardDesc>{t("app.energie.chargesDesc")}</CardDesc>
        </CardHeader>
        <ul className="divide-y divide-border">
          {loads.map((l) => (
            <li key={l.nameKey} className="flex items-start justify-between gap-3 py-3">
              <div>
                <p className="text-sm">{t(l.nameKey)}</p>
                <p className="text-xs text-muted">{t(l.roleKey)}</p>
              </div>
              <Badge tone={l.share === "critique" ? "gold" : "muted"}>{t(`app.energie.${l.share}`)}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.energie.chartTitle")}</CardTitle>
          <CardDesc>{t("app.energie.chartDesc", { surplus: surplus.toFixed(1) })}</CardDesc>
        </CardHeader>
        <div className="h-64" role="img" aria-label={t("app.energie.chartTitle")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={energy.series}>
              <CartesianGrid stroke="var(--color-navy-700)" vertical={false} />
              <XAxis dataKey="day" tick={axis} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="solar" name={t("app.energie.solaire")} stroke="var(--color-green-400)" fill="color-mix(in oklab, var(--color-green-400) 25%, transparent)" />
              <Area type="monotone" dataKey="load" name={t("app.energie.charge")} stroke="var(--color-gold-500)" fill="color-mix(in oklab, var(--color-gold-500) 20%, transparent)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="border-warn/40 bg-warn/5">
        <CardTitle>{t("app.energie.demoTitle")}</CardTitle>
        <CardDesc>{t("app.energie.demoBody")}</CardDesc>
      </Card>
    </div>
  );
}