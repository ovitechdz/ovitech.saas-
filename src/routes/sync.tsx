import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncChip } from "@/components/sync-chip";
import { buildBackup, parseBackup, pickFarmData } from "@/lib/backup";
import { pendingCount, useFarmStore, type FarmData } from "@/lib/store";
import { TimeText } from "@/components/time-text";
import { useAppT } from "@/i18n/hooks";

export const Route = createFileRoute("/sync")({ component: SyncPage });

function SyncPage() {
  const t = useAppT();
  const network = useFarmStore((s) => s.network);
  const events = useFarmStore((s) => s.events);
  const animals = useFarmStore((s) => s.animals);
  const recs = useFarmStore((s) => s.recs);
  const lastSyncedAt = useFarmStore((s) => s.lastSyncedAt);
  const pending = useFarmStore((s) => pendingCount(s));
  const syncAll = useFarmStore((s) => s.syncAll);
  const retryEvent = useFarmStore((s) => s.retryEvent);
  const markConflict = useFarmStore((s) => s.markConflict);
  const resolveConflict = useFarmStore((s) => s.resolveConflict);
  const failNext = useFarmStore((s) => s.failNextSync);
  const setFailNext = useFarmStore((s) => s.setFailNextSync);
  const resetDemo = useFarmStore((s) => s.resetDemo);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<FarmData | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function downloadBackup() {
    setExporting(true);
    try {
      const state = pickFarmData(useFarmStore.getState());
      const raw = await buildBackup(state);
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ovitech-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("app.backup.errorRead"));
    } finally {
      setExporting(false);
    }
  }

  async function onFilePicked(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast.error(t("app.backup.errorRead"));
      return;
    }
    const parsed = await parseBackup(text);
    if (!parsed.ok) {
      toast.error(t("app.backup.invalid", { reason: parsed.error }));
      return;
    }
    setPendingRestore(parsed.data);
  }

  function applyRestore() {
    if (!pendingRestore) return;
    useFarmStore.setState(pendingRestore);
    setPendingRestore(null);
    toast.success(t("app.backup.done"));
  }

  async function runSync() {
    if (network === "offline") {
      toast.error(t("app.sync.toastNoReseau"));
      return;
    }
    setBusy(true);
    const res = await syncAll();
    setBusy(false);
    if (res.failed) toast.error(t("app.sync.toastEchec", { count: res.failed }));
    else toast.success(t("app.sync.toastSynchro", { count: res.synced }));
  }

  const openEvents = events.filter((e) =>
    ["local", "pending", "failed", "conflict", "syncing"].includes(e.syncStatus),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">{t("app.sync.kicker")}</p>
        <h1 className="mt-2 font-display text-4xl">{t("app.sync.title")}</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {t("app.sync.lead")}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{t("app.sync.etatReseau")}</p>
          <p className="mt-2 font-display text-2xl">{network === "online" ? t("app.common.enLigne") : t("app.common.horsLigne")}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{t("app.sync.fileOuverte")}</p>
          <p className="mt-2 font-display text-2xl tabular">{pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{t("app.sync.derniereSynchro")}</p>
          <p className="mt-2 text-sm"><TimeText iso={lastSyncedAt} /></p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={runSync} disabled={busy}>
          {busy ? t("app.sync.syncEnCours") : t("app.sync.syncNow")}
        </Button>
        <Button variant="outline" onClick={() => setFailNext(!failNext)}>
          {failNext ? t("app.sync.echecArme") : t("app.sync.simulerEchec")}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const candidate = events.find((e) => e.syncStatus === "pending" || e.syncStatus === "local");
            if (!candidate) {
              toast.message(t("app.sync.toastNoLocal"));
              return;
            }
            markConflict(candidate.id);
            toast.message(t("app.sync.toastConflit"));
          }}
        >
          {t("app.sync.simulerConflit")}
        </Button>
        <Button variant="ghost" onClick={() => resetDemo()}>
          {t("app.sync.reset")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.backup.title")}</CardTitle>
          <CardDesc>{t("app.backup.exportDesc")}</CardDesc>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={downloadBackup} disabled={exporting}>
            {exporting ? t("app.sync.syncEnCours") : t("app.backup.exportBtn")}
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            {t("app.backup.pickFile")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onFilePicked}
          />
          <span className="text-xs text-muted">{t("app.backup.importDesc")}</span>
        </div>
        {pendingRestore && (
          <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium">{t("app.backup.confirmTitle")}</p>
            <p className="mt-1 text-sm text-muted">
              {t("app.backup.confirmLead", {
                current: animals.length,
                pending,
                incoming: pendingRestore.animals.length,
              })}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={applyRestore}>
                {t("app.backup.restoreBtn")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPendingRestore(null)}>
                {t("app.backup.cancelBtn")}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.sync.fileTitle")}</CardTitle>
          <CardDesc>{t("app.sync.fileDesc")}</CardDesc>
        </CardHeader>
        {openEvents.length === 0 ? (
          <p className="text-sm text-muted">{t("app.sync.rien")}</p>
        ) : (
          <ul className="space-y-3">
            {openEvents.map((e) => (
              <li key={e.id} className="flex flex-col gap-2 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm">{e.label}</p>
                  <p className="text-xs text-muted">{e.detail}</p>
                  {e.error && <p className="text-xs text-danger">{e.error}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SyncChip status={e.syncStatus} />
                  {e.syncStatus === "failed" && (
                    <Button size="sm" variant="outline" onClick={() => retryEvent(e.id)}>
                      {t("app.sync.relancer")}
                    </Button>
                  )}
                  {e.syncStatus === "conflict" && (
                    <>
                      <Button size="sm" onClick={() => resolveConflict(e.id, "local")}>
                        {t("app.sync.garderLocal")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resolveConflict(e.id, "drop")}>
                        {t("app.sync.versionCentrale")}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.sync.recsTitle")}</CardTitle>
        </CardHeader>
        <ul className="space-y-2 text-sm">
          {recs.slice(0, 8).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs">{r.id}</span>
              <SyncChip status={r.syncStatus} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
