import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus, Printer } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeText } from "@/components/time-text";
import {
  BUSINESS_OBJECTIVES,
  EVIDENCE_FILE,
  LABEL_MATRIX,
  MVP_FEATURES,
  OPEN_P0,
} from "@/lib/constitution";
import { buildEvidencePack, downloadEvidence } from "@/lib/evidence";
import { runAllCases } from "@/lib/engine-cases";
import { FARM } from "@/lib/seed";
import { pendingCount, useFarmStore } from "@/lib/store";
import { ENGINE_VERSION } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useAppT } from "@/i18n/hooks";

export const Route = createFileRoute("/label")({ component: LabelPage });

function LabelPage() {
  const t = useAppT();
  const animals = useFarmStore((s) => s.animals);
  const recs = useFarmStore((s) => s.recs);
  const events = useFarmStore((s) => s.events);
  const feed = useFarmStore((s) => s.feed);
  const weights = useFarmStore((s) => s.weights);
  const energy = useFarmStore((s) => s.energy);
  const network = useFarmStore((s) => s.network);
  const lastSyncedAt = useFarmStore((s) => s.lastSyncedAt);
  const signoffs = useFarmStore((s) => s.signoffs);
  const pending = useFarmStore((s) => pendingCount(s));

  const cases = runAllCases(animals);
  const casesOk = cases.filter((c) => c.ok).length;

  const dod = [
    { ok: events.some((e) => e.type === "scan"), label: t("app.label.dod1") },
    { ok: network === "offline" || events.some((e) => e.syncStatus === "local"), label: t("app.label.dod2") },
    { ok: recs.some((r) => r.ration), label: t("app.label.dod3") },
    { ok: recs.some((r) => !r.ration), label: t("app.label.dod4") },
    { ok: recs.some((r) => r.approvedBy), label: t("app.label.dod5") },
    { ok: recs.some((r) => r.servedAt), label: t("app.label.dod6") },
    { ok: events.some((e) => e.type === "sync") || pending > 0, label: t("app.label.dod7") },
    { ok: events.some((e) => e.syncStatus === "failed" || e.syncStatus === "conflict"), label: t("app.label.dod8") },
    { ok: casesOk === cases.length, label: t("app.label.dod9", { ok: casesOk, total: cases.length }) },
    { ok: signoffs.length > 0, label: t("app.label.dod10") },
    { ok: recs.every((r) => r.evidence.length > 0), label: t("app.label.dod11") },
    { ok: energy.autonomyPercent > 0 && feed.some((f) => f.available), label: t("app.label.dod12") },
  ];
  const done = dod.filter((d) => d.ok).length;

  function exportPack() {
    downloadEvidence(
      buildEvidencePack({
        network,
        lastSyncedAt,
        animals,
        recs,
        events,
        weights,
        feed,
        energy,
        signoffs,
      }),
    );
    toast.success(t("app.preuve.toastExporte"));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gold">
            {t("app.label.kicker")}
          </p>
          <h1 className="mt-2 font-display text-4xl">{t("app.label.title")}</h1>
          <p className="mt-3 max-w-2xl text-muted">
            {t("app.label.lead", { farm: FARM.name })}
          </p>
          <p className="mt-2 text-xs text-subtle">
            {t("app.label.meta", { doc: FARM.document, engine: ENGINE_VERSION })} <TimeText iso={lastSyncedAt} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer />
            {t("app.label.imprimer")}
          </Button>
          <Button onClick={exportPack}>{t("app.label.exportJson")}</Button>
        </div>
      </header>

      <Card className="border-gold/30 bg-gold/5">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle>{t("app.label.dodTitle")}</CardTitle>
            <Badge tone={done >= 10 ? "ok" : "gold"}>
              {done}/{dod.length}
            </Badge>
          </div>
          <CardDesc>{t("app.label.dodDesc")}</CardDesc>
        </CardHeader>
        <ul className="space-y-2">
          {dod.map((d) => (
            <li key={d.label} className="flex gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                  d.ok ? "bg-leaf/20 text-leaf" : "bg-surface-2 text-subtle",
                )}
              >
                {d.ok ? <Check className="size-3.5" aria-hidden="true" /> : <Minus className="size-3.5" aria-hidden="true" />}
              </span>
              <p className="text-sm">{d.label}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.label.matriceTitle")}</CardTitle>
          <CardDesc>{t("app.label.matriceDesc")}</CardDesc>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-start text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">{t("app.label.thAxe")}</th>
                <th className="py-2 pr-3 font-medium">{t("app.label.thContribution")}</th>
                <th className="py-2 font-medium">{t("app.label.thEtat")}</th>
              </tr>
            </thead>
            <tbody>
              {LABEL_MATRIX.map((row) => (
                <tr key={row.axis} className="border-t border-border align-top">
                  <td className="py-3 pr-3 font-medium">{row.axis}</td>
                  <td className="py-3 pr-3 text-muted">
                    {row.contribution}
                    <p className="mt-1 text-xs text-subtle">{row.note}</p>
                  </td>
                  <td className="py-3">
                    <Badge
                      tone={
                        row.status === "demonstrable" || row.status === "honest"
                          ? "ok"
                          : row.status === "conditional"
                            ? "warn"
                            : "gold"
                      }
                    >
                      {t(`app.label.statuses.${row.status}`)}
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
          <CardTitle>{t("app.label.fileTitle")}</CardTitle>
          <CardDesc>{t("app.label.fileDesc")}</CardDesc>
        </CardHeader>
        <ul className="space-y-2">
          {EVIDENCE_FILE.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
              <span>
                <span className="font-mono text-xs text-gold">{e.id}</span> {e.item}
              </span>
              <Badge tone={e.inProduct ? "ok" : "warn"}>
                {e.inProduct ? t("app.label.dansPoc") : t("app.label.horsProduit")}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("app.label.capTitle")}</CardTitle>
          </CardHeader>
          <ul className="space-y-2 text-sm">
            {MVP_FEATURES.map((f) => (
              <li key={f.id}>
                <span className="font-mono text-xs text-gold">{f.id}</span> {f.title}
                <p className="text-xs text-subtle">{f.why}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("app.label.objectifsTitle")}</CardTitle>
            <CardDesc>{t("app.label.objectifsDesc")}</CardDesc>
          </CardHeader>
          <ul className="space-y-2 text-sm">
            {BUSINESS_OBJECTIVES.map((b) => (
              <li key={b.id}>
                <span className="font-mono text-xs text-gold">{b.id}</span> {b.title}
                <p className="text-xs text-subtle">{b.target}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.label.signaturesTitle")}</CardTitle>
          <CardDesc>{t("app.label.signaturesDesc")}</CardDesc>
        </CardHeader>
        {signoffs.length === 0 ? (
          <p className="text-sm text-muted">
            {t("app.label.noSignature")}{" "}
            <Link to="/verification" className="text-gold">
              {t("app.label.openVerification")}
            </Link>
            {t("app.label.signatureHint")}
          </p>
        ) : (
          <ul className="space-y-3">
            {signoffs.map((s) => (
              <li key={s.id} className="text-sm">
                <p>
                  {s.name} · {s.specialty} · {s.passed}/{s.total}
                </p>
                <p className="text-xs text-muted">
                  {s.protocol} · <TimeText iso={s.signedAt} />
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.label.p0Title")}</CardTitle>
          <CardDesc>{t("app.label.p0Desc")}</CardDesc>
        </CardHeader>
        <ul className="space-y-1 text-sm text-muted">
          {OPEN_P0.map((q) => (
            <li key={q}>— {q}</li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.label.pasTitle")}</CardTitle>
        </CardHeader>
        <ul className="space-y-2 text-sm text-muted">
          <li>{t("app.label.m1")}</li>
          <li>{t("app.label.m2", { engine: ENGINE_VERSION })}</li>
          <li>{t("app.label.m3")}</li>
          <li>{t("app.label.m4")}</li>
        </ul>
      </Card>

      <div className="flex flex-wrap gap-2 no-print">
        <Button asChild>
          <Link to="/preuve">{t("app.label.rejouer")}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/vision">{t("app.label.vision")}</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/journal">{t("app.preuve.openJournal")}</Link>
        </Button>
      </div>
    </div>
  );
}
