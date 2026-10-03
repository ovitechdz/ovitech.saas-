import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncChip } from "@/components/sync-chip";
import { TimeText } from "@/components/time-text";
import { canServe } from "@/lib/ration";
import { useFarmStore } from "@/lib/store";
import { useAppT } from "@/i18n/hooks";
import type { NutritionRec } from "@/lib/types";

export function RecCard({
  rec,
  code,
  compact = false,
}: {
  rec: NutritionRec;
  code?: string;
  compact?: boolean;
}) {
  const t = useAppT();
  const role = useFarmStore((s) => s.role);
  const approveRec = useFarmStore((s) => s.approveRec);
  const serveRec = useFarmStore((s) => s.serveRec);
  const serveGate = canServe(rec);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          {code && <CardTitle className="font-mono text-base">{code}</CardTitle>}
          {!code && <CardTitle>{t("app.recCard.fallbackTitle")}</CardTitle>}
          <Badge
            tone={
              rec.confidence === "haute" ? "ok" : rec.confidence === "moyenne" ? "gold" : "danger"
            }
          >
            {t("app.confidence." + rec.confidence)}
          </Badge>
          <SyncChip status={rec.syncStatus} />
          <span className="font-mono text-xs text-subtle">{rec.engineVersion}</span>
        </div>
        <CardDesc>
          {t("app.recCard.desc")}{" "}
          <TimeText iso={rec.createdAt} />
        </CardDesc>
      </CardHeader>
      {rec.ration ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Mini k={t("app.common.fourrage")} v={`${rec.ration.forageKg} kg`} />
          <Mini k={t("app.common.concentre")} v={`${rec.ration.concentrateKg} kg`} />
          <Mini k="CMV" v={`${rec.ration.mineralG} g`} />
          <Mini k="ME" v={`${rec.ration.meMj} MJ`} />
          <Mini k="MAT" v={`${rec.ration.cpPercent} %`} />
        </div>
      ) : (
        <p className="text-sm text-danger">
          {t("app.recCard.refusDetail", { missing: rec.missingInputs.join(", ") })}
        </p>
      )}
      {!compact && (
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {rec.notes.map((n) => (
            <li key={n}>— {n}</li>
          ))}
        </ul>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-gold">{t("app.recCard.recap")}</summary>
        <ul className="mt-2 space-y-1 font-mono text-xs text-muted">
          {rec.evidence.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </details>
      <div className="mt-3 flex flex-wrap gap-2">
        {role === "production" && rec.ration && !rec.approvedBy && (
          <Button
            size="sm"
            variant="leaf"
            onClick={() => {
              approveRec(rec.id);
              toast.success(t("app.recCard.toastApprouve"));
            }}
          >
            {t("app.recCard.approuver")}
          </Button>
        )}
        {serveGate.ok && (
          <Button
            size="sm"
            onClick={() => {
              const res = serveRec(rec.id);
              if (res.ok) toast.success(t("app.recCard.toastDistribue"));
              else toast.error(res.reason ?? t("app.recCard.toastImpossible"));
            }}
          >
            {t("app.recCard.distribuer")}
          </Button>
        )}
      </div>
      {rec.approvedBy && (
        <p className="mt-3 text-xs text-leaf">
          {t("app.recCard.revuePar", { name: rec.approvedBy })}
          {rec.servedAt
            ? t("app.recCard.distribueePar", { name: rec.servedBy ?? "" })
            : t("app.recCard.enAttente")}
        </p>
      )}
    </Card>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-bg p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted">{k}</p>
      <p className="mt-1 font-display text-xl tabular">{v}</p>
    </div>
  );
}
