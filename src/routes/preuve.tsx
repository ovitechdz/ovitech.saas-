import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { EngineCasesPanel } from "@/components/engine-cases-panel";
import { GoldenPath } from "@/components/golden-path";
import { ProofReplay } from "@/components/proof-replay";
import { pendingCount, useFarmStore } from "@/lib/store";
import { buildEvidencePack, downloadEvidence } from "@/lib/evidence";
import { FARM } from "@/lib/seed";
import { ENGINE_VERSION } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useAppT } from "@/i18n/hooks";

export const Route = createFileRoute("/preuve")({ component: PreuvePage });

function PreuvePage() {
  const t = useAppT();
  const events = useFarmStore((s) => s.events);
  const recs = useFarmStore((s) => s.recs);
  const animals = useFarmStore((s) => s.animals);
  const network = useFarmStore((s) => s.network);
  const pending = useFarmStore((s) => pendingCount(s));
  const feed = useFarmStore((s) => s.feed);
  const weights = useFarmStore((s) => s.weights);
  const lastSyncedAt = useFarmStore((s) => s.lastSyncedAt);
  const energy = useFarmStore((s) => s.energy);
  const signoffs = useFarmStore((s) => s.signoffs);

  const checks = [
    {
      ok: events.some((e) => e.type === "scan"),
      label: t("app.preuve.ch1"),
      hint: t("app.preuve.ch1h"),
    },
    {
      ok: events.some((e) => e.type === "identite") || animals.length > 0,
      label: t("app.preuve.ch2"),
      hint: t("app.preuve.ch2h"),
    },
    {
      ok: network === "offline" || events.some((e) => e.syncStatus === "local"),
      label: t("app.preuve.ch3"),
      hint: t("app.preuve.ch3h"),
    },
    {
      ok: recs.some((r) => r.ration),
      label: t("app.preuve.ch4"),
      hint: `MVP-F04 · ${ENGINE_VERSION}`,
    },
    {
      ok: recs.some((r) => !r.ration),
      label: t("app.preuve.ch5"),
      hint: t("app.preuve.ch5h"),
    },
    {
      ok: recs.some((r) => r.approvedBy),
      label: t("app.preuve.ch6"),
      hint: t("app.preuve.ch6h"),
    },
    {
      ok: recs.some((r) => r.servedAt),
      label: t("app.preuve.ch7"),
      hint: t("app.preuve.ch7h"),
    },
    {
      ok: events.some((e) => e.type === "sync") || pending > 0,
      label: t("app.preuve.ch8"),
      hint: t("app.preuve.ch8h"),
    },
    {
      ok: events.some((e) => e.syncStatus === "failed" || e.syncStatus === "conflict" || e.type === "erreur"),
      label: t("app.preuve.ch9"),
      hint: t("app.preuve.ch9h"),
    },
    {
      ok: feed.some((f) => !f.available) || recs.some((r) => r.notes.some((n) => n.includes("Concentré") || n.includes("Fourrage"))),
      label: t("app.preuve.ch10"),
      hint: t("app.preuve.ch10h"),
    },
    {
      ok: recs.every((r) => r.evidence.length > 0),
      label: t("app.preuve.ch11"),
      hint: t("app.preuve.ch11h"),
    },
    {
      ok: weights.length >= 2,
      label: t("app.preuve.ch12"),
      hint: t("app.preuve.ch12h"),
    },
  ];

  const done = checks.filter((c) => c.ok).length;

  function exportPack() {
    const pack = buildEvidencePack({
      network,
      lastSyncedAt,
      animals,
      recs,
      events,
      weights,
      feed,
      energy,
      signoffs,
    });
    downloadEvidence(pack);
    toast.success(t("app.preuve.toastExporte"));
  }

  async function copyPack() {
    const pack = buildEvidencePack({
      network,
      lastSyncedAt,
      animals,
      recs,
      events,
      weights,
      feed,
      energy,
      signoffs,
    });
    try {
      await navigator.clipboard.writeText(JSON.stringify(pack, null, 2));
      toast.success(t("app.preuve.toastCopie"));
    } catch {
      toast.error(t("app.preuve.toastCopieFail"));
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">{FARM.document}</p>
        <h1 className="mt-2 font-display text-4xl">{t("app.preuve.title")}</h1>
        <p className="mt-3 text-muted">{t("app.preuve.lead")}</p>
      </header>

      <GoldenPath />

      <ProofReplay />

      <EngineCasesPanel />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle>{t("app.preuve.equationTitle")}</CardTitle>
            <Badge tone={done >= 8 ? "ok" : "gold"}>
              {t("app.preuve.equationBadge", { done, total: checks.length })}
            </Badge>
          </div>
          <CardDesc>{t("app.preuve.equationDesc")}</CardDesc>
        </CardHeader>
        <ul className="space-y-3">
          {checks.map((c) => (
            <li key={c.label} className="flex gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                  c.ok ? "bg-leaf/20 text-leaf" : "bg-surface-2 text-subtle",
                )}
              >
                {c.ok ? <Check className="size-3.5" aria-hidden="true" /> : <Minus className="size-3.5" aria-hidden="true" />}
              </span>
              <div>
                <p className="text-sm">{c.label}</p>
                <p className="text-xs text-subtle">{c.hint}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.preuve.exportTitle")}</CardTitle>
          <CardDesc>{t("app.preuve.exportDesc")}</CardDesc>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <Button onClick={exportPack}>{t("app.preuve.downloadJson")}</Button>
          <Button variant="outline" onClick={() => void copyPack()}>
            {t("app.preuve.copier")}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.preuve.pasTitle")}</CardTitle>
        </CardHeader>
        <ul className="space-y-2 text-sm text-muted">
          <li>{t("app.preuve.n1", { version: ENGINE_VERSION })}</li>
          <li>{t("app.preuve.n2")}</li>
          <li>{t("app.preuve.n3")}</li>
          <li>{t("app.preuve.n4")}</li>
          <li>{t("app.preuve.n5")}</li>
        </ul>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{t("app.preuve.reseau")}</p>
          <p className="mt-2 font-display text-xl">{network === "online" ? t("app.common.enLigne") : t("app.common.horsLigne")}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{t("app.sync.fileOuverte")}</p>
          <p className="mt-2 font-display text-xl tabular">{pending}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/scan">{t("app.preuve.lancerScan")}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/sync">{t("app.preuve.testerSynchro")}</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/label">{t("app.preuve.openLabel")}</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/journal">{t("app.preuve.openJournal")}</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/vision">{t("app.preuve.lireVision")}</Link>
        </Button>
      </div>
    </div>
  );
}
