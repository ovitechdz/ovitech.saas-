import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Cpu } from "lucide-react";
import { DevicePage } from "@/components/ecosysteme-device";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDesc } from "@/components/ui/card";
import { useFarmStore } from "@/lib/store";
import { useAppT } from "@/i18n/hooks";
import { environment } from "@/lib/seed";

export const Route = createFileRoute("/ecosysteme/iot")({ component: IotPage });

const STATUS_TONE = {
  ok: "ok",
  attention: "warn",
  critique: "danger",
} as const;

function IotPage() {
  const t = useAppT();
  const energy = useFarmStore((s) => s.energy);

  const stats = useMemo(
    () => [
      { key: "app.ecosysteme.iot.statBatterie", value: `${energy.batteryPercent} %` },
      { key: "app.ecosysteme.iot.statAutonomie", value: `${energy.autonomyPercent} %` },
      { key: "app.ecosysteme.iot.statParcs", value: environment.pens.length },
    ],
    [energy],
  );

  const hydro = environment.hydroponie;

  return (
    <DevicePage device="iot" icon={Cpu} stats={stats}>
      <Card>
        <CardHeader>
          <CardTitle>{t("app.ecosysteme.iot.climatTitle")}</CardTitle>
          <CardDesc>{t("app.ecosysteme.iot.climatDesc")}</CardDesc>
        </CardHeader>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wider text-muted">
                <th className="py-2 pr-4">{t("app.ecosysteme.iot.colPen")}</th>
                <th className="py-2 pr-4">{t("app.ecosysteme.iot.colTemp")}</th>
                <th className="py-2 pr-4">{t("app.ecosysteme.iot.colHumidite")}</th>
                <th className="py-2">{t("app.ecosysteme.iot.colStatut")}</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              {environment.pens.map((s) => (
                <tr key={s.pen} className="border-b border-border/40">
                  <td className="py-2 pr-4 font-display text-ink">{s.pen}</td>
                  <td className="py-2 pr-4 tabular">{s.temperatureC.toFixed(1)} °C</td>
                  <td className="py-2 pr-4 tabular">{s.humidityPercent} %</td>
                  <td className="py-2">
                    <Badge tone={STATUS_TONE[s.status]}>
                      {t(`app.ecosysteme.iot.statuses.${s.status}`)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.ecosysteme.iot.hydroTitle")}</CardTitle>
          <CardDesc>{t("app.ecosysteme.iot.hydroDesc")}</CardDesc>
        </CardHeader>
        <dl className="mt-2 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-subtle">{t("app.ecosysteme.iot.hydroStock")}</dt>
            <dd className="font-display text-2xl tabular">{hydro.stockKg} kg</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">{t("app.ecosysteme.iot.hydroTrays")}</dt>
            <dd className="font-display text-2xl tabular">{hydro.trays}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">{t("app.ecosysteme.iot.hydroCycles")}</dt>
            <dd className="font-display text-2xl tabular">{hydro.cyclesPerDay} / j</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">{t("app.ecosysteme.iot.hydroTemp")}</dt>
            <dd className="flex items-center gap-2 font-display text-2xl tabular">
              {hydro.temperatureC.toFixed(1)} °C
              <Badge tone={STATUS_TONE[hydro.status]}>
                {t(`app.ecosysteme.iot.statuses.${hydro.status}`)}
              </Badge>
            </dd>
          </div>
        </dl>
      </Card>
    </DevicePage>
  );
}