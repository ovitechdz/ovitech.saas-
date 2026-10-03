import { useState } from "react";
import { toast } from "sonner";
import { Play, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { useFarmStore } from "@/lib/store";
import { useAppT } from "@/i18n/hooks";

const STEPS = ["step1", "step2", "step3", "step4", "step5"] as const;

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function ProofReplay() {
  const t = useAppT();
  const setNetwork = useFarmStore((s) => s.setNetwork);
  const resolveScan = useFarmStore((s) => s.resolveScan);
  const recordScan = useFarmStore((s) => s.recordScan);
  const runEngine = useFarmStore((s) => s.runEngine);
  const syncAll = useFarmStore((s) => s.syncAll);
  const setFailNext = useFarmStore((s) => s.setFailNextSync);

  const [cursor, setCursor] = useState(0);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  function push(line: string) {
    setLog((prev) => [...prev, line]);
  }

  async function play() {
    if (running) return;
    setRunning(true);
    setLog([]);
    setCursor(0);
    setFailNext(false);

    try {
      setNetwork("offline");
      push(t("app.proofReplay.log.coupure"));
      setCursor(1);
      await wait(450);

      const outcome = resolveScan("2401");
      if (outcome.kind !== "ok") {
        push(t("app.proofReplay.log.introuvable"));
        toast.error(t("app.proofReplay.toast.introuvable"));
        return;
      }
      recordScan(outcome.animal);
      push(t("app.proofReplay.log.identite", { code: outcome.animal.code }));
      setCursor(2);
      await wait(450);

      const rec = runEngine(outcome.animal.id);
      if (rec.ration) {
        push(
          t("app.proofReplay.log.ration", {
            forage: rec.ration.forageKg,
            fourrage: t("app.common.fourrage"),
            concentrate: rec.ration.concentrateKg,
            concentre: t("app.common.concentre"),
            version: rec.engineVersion,
          }),
        );
      } else {
        push(t("app.proofReplay.log.refus", { missing: rec.missingInputs.join(", ") }));
      }
      setCursor(3);
      await wait(450);

      setNetwork("online");
      push(t("app.proofReplay.log.liaison"));
      setCursor(4);
      await wait(450);

      const res = await syncAll();
      if (res.failed) {
        push(t("app.proofReplay.log.echec", { count: res.failed }));
        toast.error(t("app.proofReplay.toast.fail"));
      } else {
        push(t("app.proofReplay.log.synchro", { count: res.synced }));
        toast.success(t("app.proofReplay.toast.rejouee"));
      }
      setCursor(5);
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{t("app.proofReplay.title")}</CardTitle>
            <CardDesc>{t("app.proofReplay.desc")}</CardDesc>
          </div>
          <Badge tone={cursor >= 5 ? "ok" : "gold"}>
            {Math.min(cursor, STEPS.length)}/{STEPS.length}
          </Badge>
        </div>
      </CardHeader>
      <ol className="space-y-2">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full font-mono text-xs",
                i < cursor
                  ? "bg-leaf/20 text-leaf"
                  : i === cursor && running
                    ? "bg-gold/20 text-gold"
                    : "bg-surface-2 text-subtle",
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={i < cursor ? "text-fg" : "text-muted"}>
              {t(`app.proofReplay.${step}`)}
            </span>
          </li>
        ))}
      </ol>
      {log.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-md bg-bg p-3 font-mono text-xs text-muted">
          {log.map((line, i) => (
            <li key={`${i}-${line}`}>{line}</li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => void play()} disabled={running}>
          <Play />
          {running ? t("app.proofReplay.running") : t("app.proofReplay.replay")}
        </Button>
        <Button
          variant="outline"
          disabled={running}
          onClick={() => {
            setCursor(0);
            setLog([]);
          }}
        >
          <RotateCcw />
          {t("app.proofReplay.clear")}
        </Button>
      </div>
    </Card>
  );
}