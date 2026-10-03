import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncChip } from "@/components/sync-chip";
import { TimeText } from "@/components/time-text";
import { useFarmStore } from "@/lib/store";
import { useAppT, useAppLang } from "@/i18n/hooks";
import { pickFarmData } from "@/lib/backup";
import { generateRapportJour } from "@/lib/journal-pdf";
import { loadPdfMake, renderPdfBuffer } from "@/lib/pdf-engine";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/journal")({ component: JournalPage });

function JournalPage() {
  const t = useAppT();
  const { lang } = useAppLang();
  const [busy, setBusy] = useState(false);
  const events = useFarmStore((s) => s.events);
  const recs = useFarmStore((s) => s.recs);
  const animals = useFarmStore((s) => s.animals);

  const errors = events.filter(
    (e) =>
      e.type === "erreur" ||
      e.syncStatus === "failed" ||
      e.syncStatus === "conflict" ||
      Boolean(e.error),
  );
  const refusals = recs.filter((r) => !r.ration);
  const identityFails = events.filter(
    (e) =>
      e.type === "erreur" &&
      (e.error === "Identité absente du registre" ||
        e.error === "Signal RFID illisible"),
  );

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
      await generateRapportJour({
        t,
        lang,
        data: pickFarmData(useFarmStore.getState()),
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
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gold">{t("app.journal.kicker")}</p>
          <h1 className="mt-2 font-display text-4xl">{t("app.journal.title")}</h1>
          <p className="mt-2 max-w-2xl text-muted">
            {t("app.journal.lead")}
          </p>
        </div>
        <Button size="lg" onClick={onRapport} disabled={busy}>
          <Download className="size-4" />
          {busy ? t("app.rapport.pdfBusy") : t("app.rapport.export")}
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat k={t("app.journal.incidents")} v={String(errors.length)} />
        <Stat k={t("app.journal.refusMoteur")} v={String(refusals.length)} />
        <Stat k={t("app.journal.identites")} v={String(identityFails.length)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.journal.incidentsTitle")}</CardTitle>
          <CardDesc>{t("app.journal.incidentsDesc")}</CardDesc>
        </CardHeader>
        {errors.length === 0 ? (
          <p className="text-sm text-muted">
            {t("app.journal.noIncidents")}{" "}
            <Link to="/sync" className="text-gold">
              Sync
            </Link>
          </p>
        ) : (
          <ul className="space-y-3">
            {errors.slice(0, 40).map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-0">
                <div>
                  <p className="text-sm">{e.label}</p>
                  <p className="text-xs text-muted">{e.detail}</p>
                  {e.error && <p className="text-xs text-danger">{e.error}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <SyncChip status={e.syncStatus} />
                  <span className="font-mono text-xs text-subtle">
                    <TimeText iso={e.at} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.journal.refusTitle")}</CardTitle>
          <CardDesc>
            {t("app.journal.refusDesc")}
          </CardDesc>
        </CardHeader>
        {refusals.length === 0 ? (
          <p className="text-sm text-muted">{t("app.journal.noRefus")}</p>
        ) : (
          <ul className="space-y-2">
            {refusals.map((r) => {
              const code = animals.find((a) => a.id === r.animalId)?.code ?? r.animalId;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link to="/troupeau/$id" params={{ id: r.animalId }} className="font-mono text-gold">
                    {code}
                  </Link>
                  <span className="text-xs text-muted">{r.missingInputs.join(", ")}</span>
                  <Badge tone="danger">{t("app.confidence." + r.confidence)}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/sync">{t("app.journal.openSync")}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/preuve">{t("app.journal.openPreuve")}</Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{k}</p>
      <p className="mt-2 font-display text-2xl tabular">{v}</p>
    </Card>
  );
}
