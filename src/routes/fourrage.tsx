import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp, Donut, StatGauge } from "@/components/charts";
import { pendingCount, useFarmStore } from "@/lib/store";
import { computeFarmKpis } from "@/lib/kpis";
import { concentrateStock, forageStock } from "@/lib/feed";
import { formatDzd } from "@/lib/format";
import { useAppT } from "@/i18n/hooks";

const STOCK_STEP_KG = 50;

export const Route = createFileRoute("/fourrage")({ component: FourragePage });

function FourragePage() {
  const t = useAppT();
  const feed = useFarmStore((s) => s.feed);
  const recs = useFarmStore((s) => s.recs);
  const animals = useFarmStore((s) => s.animals);
  const pending = useFarmStore((s) => pendingCount(s));
  const energy = useFarmStore((s) => s.energy);
  const setFeedAvailable = useFarmStore((s) => s.setFeedAvailable);
  const adjustFeedStock = useFarmStore((s) => s.adjustFeedStock);
  const kpis = computeFarmKpis({
    animals,
    recs,
    feed,
    pending,
    energyAutonomy: energy.autonomyPercent,
  });

  const stockTotal = forageStock(feed);
  const concStock = concentrateStock(feed);
  const concCoverDays = kpis.concNeed > 0 ? concStock / kpis.concNeed : null;
  const annualPct =
    kpis.coverDays != null ? Math.min(100, Math.round((kpis.coverDays / 365) * 100)) : null;
  const concAnnualPct =
    concCoverDays != null ? Math.min(100, Math.round((concCoverDays / 365) * 100)) : null;
  const stockValue = feed.reduce((s, f) => s + f.stockKg * f.costPerKg, 0);
  const forageOk = feed.some(
    (f) => (f.kind === "fourrage" || f.kind === "hybride") && f.available && f.stockKg > 0,
  );

  const lotDays = (f: (typeof feed)[number]): number | null =>
    f.kind === "fourrage" || f.kind === "hybride"
      ? kpis.forageNeed > 0
        ? f.stockKg / kpis.forageNeed
        : null
      : f.kind === "concentre"
        ? kpis.concNeed > 0
          ? f.stockKg / kpis.concNeed
          : null
        : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">{t("app.fourrage.kicker")}</p>
        <h1 className="mt-2 font-display text-4xl">{t("app.fourrage.title")}</h1>
        <p className="mt-2 max-w-2xl text-muted">{t("app.fourrage.lead")}</p>
        <Button className="mt-4" variant="outline" size="sm" asChild>
          <Link to="/ration">{t("app.fourrage.feuilleDuJour")}</Link>
        </Button>
      </header>

      <Card className="relative overflow-hidden border-leaf/40 bg-leaf/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-leaf">{t("app.fourrage.heroTitle")}</p>
            <p className="mt-2 max-w-xl text-lg text-ink-200">{t("app.fourrage.heroSub", { days: kpis.coverDays != null ? Math.round(kpis.coverDays) : 0 })}</p>
            <p className="mt-1 font-display text-sm tabular text-muted">
              {t("app.fourrage.heroFormula", { stock: Math.round(stockTotal), need: kpis.forageNeed.toFixed(1) })}
            </p>
            <p className="mt-2 max-w-xl text-xs text-subtle">{t("app.fourrage.heroHint")}</p>
          </div>
          <div className="w-full max-w-[13rem]">
            <StatGauge
              value={kpis.coverDays ?? 0}
              max={365}
              size={150}
              stroke={13}
              unit="j"
              label={t("app.fourrage.heroTitle")}
              ariaLabel={`${t("app.fourrage.heroTitle")} ${Math.round(kpis.coverDays ?? 0)} j`}
            />
            <p className="mt-2 text-center text-xs text-muted">
              {annualPct != null ? t("app.fourrage.heroAnnual", { pct: annualPct }) : ""}
            </p>
          </div>
        </div>
      </Card>

      <Card className="relative overflow-hidden border-gold/40 bg-gold/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-gold">{t("app.fourrage.concTitle")}</p>
            <p className="mt-2 max-w-xl text-lg text-ink-200">{t("app.fourrage.concSub", { days: concCoverDays != null ? Math.round(concCoverDays) : 0 })}</p>
            <p className="mt-1 font-display text-sm tabular text-muted">
              {t("app.fourrage.concFormula", { stock: Math.round(concStock), need: kpis.concNeed.toFixed(1) })}
            </p>
            <p className="mt-2 max-w-xl text-xs text-subtle">{t("app.fourrage.concHint")}</p>
          </div>
          <div className="w-full max-w-[13rem]">
            <StatGauge
              value={concCoverDays ?? 0}
              max={365}
              size={150}
              stroke={13}
              tone="gold"
              unit="j"
              label={t("app.fourrage.concTitle")}
              ariaLabel={`${t("app.fourrage.concTitle")} ${Math.round(concCoverDays ?? 0)} j`}
            />
            <p className="mt-2 text-center text-xs text-muted">
              {concAnnualPct != null ? t("app.fourrage.heroAnnual", { pct: concAnnualPct }) : ""}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{t("app.fourrage.distTitle")}</CardTitle>
              <CardDesc>{t("app.fourrage.distDesc")}</CardDesc>
            </div>
          </div>
        </CardHeader>
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <Donut
            segments={feed.map((f) => ({
              key: f.id,
              value: f.stockKg,
              color:
                f.kind === "concentre"
                  ? "var(--color-gold-500)"
                  : f.kind === "hybride"
                    ? "var(--color-green-600)"
                    : "var(--color-green-400)",
            }))}
            ariaLabel={t("app.fourrage.distTitle")}
            center={
              <div className="text-center">
                <p className="font-display text-2xl tabular">
                  <CountUp value={Math.round(stockTotal)} suffix=" kg" />
                </p>
                <p className="text-[11px] text-subtle">{t("app.common.stock")}</p>
              </div>
            }
          />
          <ul className="w-full flex-1 space-y-2">
            {feed.map((f) => (
              <li key={f.id} className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{
                    background:
                      f.kind === "concentre"
                        ? "var(--color-gold-500)"
                        : f.kind === "hybride"
                          ? "var(--color-green-600)"
                          : "var(--color-green-400)",
                  }}
                />
                <span className="flex-1 truncate">{f.name}</span>
                <span className="font-mono text-xs tabular text-muted">{f.stockKg} kg</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{t("app.fourrage.valeurStock")}</p>
          <p className="mt-2 font-display text-2xl tabular">{formatDzd(stockValue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{t("app.fourrage.besoinFourrage")}</p>
          <p className="mt-2 font-display text-2xl tabular">
            <CountUp value={kpis.forageNeed} decimals={1} suffix=" kg" />
          </p>
          <p className="mt-1 text-xs text-subtle">{t("app.fourrage.hintFourrage")}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{t("app.fourrage.besoinConcentre")}</p>
          <p className="mt-2 font-display text-2xl tabular">
            <CountUp value={kpis.concNeed} decimals={1} suffix=" kg" />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{t("app.fourrage.animaux")}</p>
          <p className="mt-2 font-display text-2xl tabular">
            <CountUp value={kpis.active.length} />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{t("app.fourrage.couverture")}</p>
          <p className="mt-2 font-display text-2xl tabular">
            <CountUp value={kpis.coverDays ?? 0} suffix=" j" />
          </p>
          <p className="mt-1 text-xs text-subtle">{t("app.fourrage.hintCouverture")}</p>
        </Card>
      </div>

      {!forageOk && (
        <Card className="border-warn/40 bg-warn/5">
          <CardTitle>{t("app.fourrage.indispoTitle")}</CardTitle>
          <CardDesc>{t("app.fourrage.indispoDesc")}</CardDesc>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {feed.map((f) => {
          const days = lotDays(f);
          const nextAfterSub = Math.max(0, f.stockKg - STOCK_STEP_KG);
          return (
            <Card key={f.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{f.name}</CardTitle>
                  <Badge tone={f.available ? "ok" : "danger"}>{t(`app.fourrage.kinds.${f.kind}`)}</Badge>
                </div>
                <CardDesc>{f.origin}</CardDesc>
              </CardHeader>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-subtle">{t("app.common.stock")}</dt>
                  <dd className="font-display text-xl tabular">{f.stockKg} kg</dd>
                </div>
                <div>
                  <dt className="text-xs text-subtle">{t("app.common.cout")}</dt>
                  <dd className="font-display text-xl tabular">{formatDzd(f.costPerKg)}/kg</dd>
                </div>
              </dl>
              {days != null && (
                <p className="mt-2 text-xs text-muted">
                  {t("app.fourrage.lotCouvre", { days: Math.round(days) })}
                </p>
              )}
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg">
                <div
                  className="h-full bg-leaf"
                  style={{ width: `${Math.min(100, (f.stockKg / 5000) * 100)}%` }}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={t("app.fourrage.retirer50", { name: f.name })}
                    disabled={f.stockKg <= 0}
                    onClick={() => {
                      adjustFeedStock(f.id, -STOCK_STEP_KG);
                      toast.message(t("app.fourrage.toastAjuste", { name: f.name, stock: nextAfterSub }));
                    }}
                  >
                    −{STOCK_STEP_KG} kg
                  </Button>
                  <Button
                    size="sm"
                    variant="leaf"
                    aria-label={t("app.fourrage.ajouter50", { name: f.name })}
                    onClick={() => {
                      adjustFeedStock(f.id, STOCK_STEP_KG);
                      toast.message(t("app.fourrage.toastAjuste", { name: f.name, stock: f.stockKg + STOCK_STEP_KG }));
                    }}
                  >
                    +{STOCK_STEP_KG} kg
                  </Button>
                </div>
                <Button
                  className="ms-auto w-full sm:w-auto"
                  size="sm"
                  variant={f.available ? "outline" : "leaf"}
                  onClick={() => {
                    setFeedAvailable(f.id, !f.available);
                    toast.message(
                      f.available
                        ? t("app.fourrage.toastIndispo", { name: f.name })
                        : t("app.fourrage.toastDispo", { name: f.name }),
                    );
                  }}
                >
                  {f.available ? t("app.fourrage.marquerIndispo") : t("app.fourrage.rendreDispo")}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}