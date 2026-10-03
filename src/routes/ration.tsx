import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardTitle } from "@/components/ui/card";
import { TimeText } from "@/components/time-text";
import { buildRationSheet, canServe } from "@/lib/ration";
import { formatDzd } from "@/lib/format";
import { FARM } from "@/lib/seed";
import { useFarmStore } from "@/lib/store";
import { useAppT } from "@/i18n/hooks";

export const Route = createFileRoute("/ration")({ component: RationPage });

function RationPage() {
  const t = useAppT();
  const animals = useFarmStore((s) => s.animals);
  const recs = useFarmStore((s) => s.recs);
  const feed = useFarmStore((s) => s.feed);
  const lastSyncedAt = useFarmStore((s) => s.lastSyncedAt);
  const network = useFarmStore((s) => s.network);
  const role = useFarmStore((s) => s.role);
  const runEngineForPen = useFarmStore((s) => s.runEngineForPen);
  const approveRec = useFarmStore((s) => s.approveRec);
  const serveRec = useFarmStore((s) => s.serveRec);
  const servePen = useFarmStore((s) => s.servePen);
  const sheet = buildRationSheet(animals, recs, feed);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gold">
            {t("app.ration.kicker", { farm: FARM.name })}
          </p>
          <h1 className="mt-2 font-display text-4xl">{t("app.ration.title")}</h1>
          <p className="mt-2 max-w-2xl text-muted">
            {t("app.ration.lead")}
          </p>
          <p className="mt-2 text-xs text-subtle">
            {t("app.ration.fraicheur", { state: network === "offline" ? t("app.common.donneesLocales") : t("app.common.derniereSynchro") })}{" "}
            <TimeText iso={lastSyncedAt} />
          </p>
        </div>
        <Button
          variant="outline"
          className="no-print"
          onClick={() => window.print()}
        >
          <Printer />
          {t("app.ration.imprimer")}
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat k={t("app.ration.couverts")} v={`${sheet.covered}/${sheet.total}`} />
        <Stat k={t("app.ration.aDistribuer")} v={String(sheet.ready)} />
        <Stat k={t("app.ration.distribuees")} v={String(sheet.served)} />
        <Stat k={t("app.common.fourrage")} v={`${sheet.forageKg.toFixed(1)} kg`} />
        <Stat k={t("app.common.concentre")} v={`${sheet.concentrateKg.toFixed(1)} kg`} />
        <Stat k={t("app.ration.coutSorties")} v={formatDzd(sheet.cost)} />
      </div>

      {sheet.blocked > 0 && (
        <Card className="border-warn/40 bg-warn/5 no-print">
          <CardTitle>{t("app.ration.bloqueTitle", { count: sheet.blocked })}</CardTitle>
          <CardDesc>
            {t("app.ration.bloqueDesc")}
          </CardDesc>
        </Card>
      )}

      {sheet.groups.map((g) => (
        <Card key={g.pen} className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-display text-xl">{g.pen}</h2>
              <p className="text-xs text-muted">
                {t("app.ration.tetes", { count: g.rows.length })} · {g.forageKg.toFixed(1)} kg {t("app.common.fourrage")} ·{" "}
                {g.concentrateKg.toFixed(1)} kg {t("app.common.concentre")} · {formatDzd(g.cost)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 no-print">
              {g.blocked > 0 && <Badge tone="warn">{t("app.ration.bloqueBadge", { count: g.blocked })}</Badge>}
              {g.ready > 0 && <Badge tone="gold">{t("app.ration.prêtBadge", { count: g.ready })}</Badge>}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const list = runEngineForPen(g.pen);
                  toast.message(t("app.ration.toastSorties", { count: list.length, pen: g.pen }));
                }}
              >
                {t("app.ration.relanceParc")}
              </Button>
              {role === "production" &&
                g.rows.some((r) => r.rec?.ration && !r.rec.approvedBy) && (
                  <Button
                    size="sm"
                    variant="leaf"
                    onClick={() => {
                      g.rows.forEach((r) => {
                        if (r.rec?.ration && !r.rec.approvedBy) approveRec(r.rec.id);
                      });
                      toast.success(t("app.ration.toastRevu", { pen: g.pen }));
                    }}
                  >
                    {t("app.ration.revoirParc")}
                  </Button>
                )}
              {g.ready > 0 && (
                <Button
                  size="sm"
                  onClick={() => {
                    const res = servePen(g.pen);
                    toast.success(t("app.ration.toastDistribue", { served: res.served, skipped: res.skipped }));
                  }}
                >
                  {t("app.ration.distribuerParc")}
                </Button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-start text-sm">
              <thead className="bg-bg text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("app.common.code")}</th>
                  <th className="px-4 py-3 font-medium">{t("app.common.stade")}</th>
                  <th className="px-4 py-3 font-medium">{t("app.common.fourrage")}</th>
                  <th className="px-4 py-3 font-medium">{t("app.common.concentre")}</th>
                  <th className="px-4 py-3 font-medium">{t("app.common.eau")}</th>
                  <th className="px-4 py-3 font-medium">{t("app.common.etat")}</th>
                  <th className="px-4 py-3 font-medium no-print">{t("app.common.acte")}</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((row) => {
                  const gate = canServe(row.rec);
                  return (
                    <tr key={row.animal.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <Link
                          to="/troupeau/$id"
                          params={{ id: row.animal.id }}
                          className="font-mono text-gold"
                        >
                          {row.animal.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{t("app.stages." + row.animal.stage)}</td>
                      <td className="px-4 py-3 tabular">
                        {row.blocked ? "—" : `${row.forageKg.toFixed(1)} kg`}
                      </td>
                      <td className="px-4 py-3 tabular">
                        {row.blocked ? "—" : `${row.concentrateKg.toFixed(1)} kg`}
                      </td>
                      <td className="px-4 py-3 tabular">
                        {row.blocked ? "—" : `${row.waterL.toFixed(1)} L`}
                      </td>
                      <td className="px-4 py-3">
                        {row.blocked ? (
                          <Badge tone="danger">{t("app.ration.sansRation")}</Badge>
                        ) : row.served ? (
                          <Badge tone="ok">{t("app.ration.distribuee")}</Badge>
                        ) : row.approved ? (
                          <Badge tone="gold">{t("app.journee.aServirBadge")}</Badge>
                        ) : (
                          <Badge tone="warn">{t("app.ration.aRevoir")}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 no-print">
                        {gate.ok && row.rec ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const res = serveRec(row.rec!.id);
                              if (res.ok) toast.success(t("app.ration.toastServi", { code: row.animal.code }));
                              else toast.error(res.reason ?? t("app.ration.impossible"));
                            }}
                          >
                            {t("app.common.servir")}
                          </Button>
                        ) : (
                          <span className="text-xs text-subtle">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <p className="text-xs text-subtle">
        {t("app.ration.footer")}
      </p>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{k}</p>
      <p className="mt-2 font-display text-xl tabular">{v}</p>
    </Card>
  );
}
