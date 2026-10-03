import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFarmStore } from "@/lib/store";
import { latestRecByAnimal, weightsFor } from "@/lib/kpis";
import { computeAnimalHealth, type AnimalHealth } from "@/lib/health";
import { HealthStatusBadge } from "@/components/health-status";
import { ageLabel, formatKg } from "@/lib/format";
import { TimeText } from "@/components/time-text";
import type { Stage } from "@/lib/types";
import { PENS } from "@/lib/seed";
import { useAppT, useAppLang } from "@/i18n/hooks";
import { pickFarmData } from "@/lib/backup";
import { generateRapport } from "@/lib/rapport-pdf";
import { loadPdfMake, renderPdfBuffer } from "@/lib/pdf-engine";
import { Download } from "lucide-react";

export const Route = createFileRoute("/troupeau/")({ component: TroupeauPage });

function TroupeauPage() {
  const t = useAppT();
  const animals = useFarmStore((s) => s.animals);
  const weights = useFarmStore((s) => s.weights);
  const recs = useFarmStore((s) => s.recs);
  const role = useFarmStore((s) => s.role);
  const runEngineForPen = useFarmStore((s) => s.runEngineForPen);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<Stage | "all">("all");
  const [pen, setPen] = useState<string>("all");
  const [group, setGroup] = useState(false);

  const { lang } = useAppLang();
  const [busy, setBusy] = useState(false);

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
      await generateRapport({
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

  const list = useMemo(() => {
    return animals.filter((a) => {
      if (a.status !== "actif") return false;
      if (stage !== "all" && a.stage !== stage) return false;
      if (pen !== "all" && a.pen !== pen) return false;
      const hay = `${a.code} ${a.rfid} ${a.breed} ${a.pen}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [animals, q, stage, pen]);

  const latest = useMemo(() => latestRecByAnimal(recs), [recs]);
  const healthById = useMemo(() => {
    const map = new Map<string, AnimalHealth>();
    for (const a of animals) {
      map.set(a.id, computeAnimalHealth(a, weightsFor(a.id, weights), latest.get(a.id)));
    }
    return map;
  }, [animals, weights, latest]);

  const stages = Array.from(new Set(animals.map((a) => a.stage)));
  const byPen = PENS.map((p) => ({
    pen: p,
    items: list.filter((a) => a.pen === p),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
<header className="flex flex-wrap items-start justify-between gap-4">
  <div>
    <p className="text-xs uppercase tracking-[0.22em] text-gold">
      {t("app.troupeau.kicker")}
    </p>
    <h1 className="mt-2 font-display text-4xl">{t("app.troupeau.title")}</h1>
    <p className="mt-2 max-w-2xl text-muted">
      {t("app.troupeau.lead")}
    </p>
  </div>
  <Button size="lg" onClick={onRapport} disabled={busy}>
    <Download className="size-4" />
    {busy ? t("app.rapport.pdfBusy") : t("app.rapport.export")}
  </Button>
</header>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("app.troupeau.placeholder")}
            aria-label={t("app.troupeau.placeholder")}
            className="md:max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            <FilterChip active={!group} onClick={() => setGroup(false)}>
              {t("app.troupeau.cartess")}
            </FilterChip>
            <FilterChip active={group} onClick={() => setGroup(true)}>
              {t("app.troupeau.parParcs")}
            </FilterChip>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={stage === "all"} onClick={() => setStage("all")}>
            {t("app.troupeau.tousStades")}
          </FilterChip>
          {stages.map((s) => (
            <FilterChip key={s} active={stage === s} onClick={() => setStage(s)}>
              {t("app.stages." + s)}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={pen === "all"} onClick={() => setPen("all")}>
            {t("app.troupeau.tousParcs")}
          </FilterChip>
          {PENS.map((p) => (
            <FilterChip key={p} active={pen === p} onClick={() => setPen(p)}>
              {p}
            </FilterChip>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted">{t("app.troupeau.compte", { count: list.length })}</p>

      {group ? (
        <div className="space-y-8">
          {byPen.map((g) => (
            <section key={g.pen}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl">
                  {g.pen}{" "}
                  <span className="text-sm text-muted">· {g.items.length}</span>
                </h2>
                {role === "production" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const recs = runEngineForPen(g.pen);
                      const ok = recs.filter((r) => r.ration).length;
                      toast.message(
                        t("app.troupeau.toastParc", {
                          pen: g.pen,
                          ok,
                          ref: recs.length - ok,
                        }),
                      );
                    }}
                  >
                    {t("app.troupeau.calcParc")}
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {g.items.map((a) => (
                  <AnimalCard key={a.id} a={a} health={healthById.get(a.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((a) => (
            <AnimalCard key={a.id} a={a} health={healthById.get(a.id)} />
          ))}
        </div>
      )}

      {list.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted">
          {t("app.troupeau.aucun")}
        </Card>
      )}
    </div>
  );
}

function AnimalCard({ a, health }: { a: { id: string; code: string; rfid: string; stage: Stage; weightKg: number | null; bcs: number | null; birthDate: string; pen: string; lastScanAt: string | null; adgKg: number | null }; health?: AnimalHealth }) {
  const t = useAppT();
  return (
    <Link to="/troupeau/$id" params={{ id: a.id }}>
      <Card className="h-full transition-colors duration-150 hover:border-gold/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-xl">{a.code}</p>
            <p className="font-mono text-xs text-muted">{a.rfid}</p>
          </div>
          <Badge tone="leaf">{t("app.stages." + a.stage)}</Badge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-xs text-subtle">{t("app.common.poids")}</dt>
            <dd className="tabular">{formatKg(a.weightKg)}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">{t("app.common.nec")}</dt>
            <dd>{a.bcs ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">{t("app.common.age")}</dt>
            <dd>{ageLabel(a.birthDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">{t("app.common.gmq")}</dt>
            <dd className="tabular">{a.adgKg != null ? `${a.adgKg.toFixed(2)} kg/j` : "—"}</dd>
          </div>
        </dl>
        {health && health.status !== "ok" && (
          <div className="mt-3">
            <HealthStatusBadge health={health} />
          </div>
        )}
        <p className="mt-3 text-xs text-subtle">
          {a.pen} · {t("app.common.scanSuffix")} <TimeText iso={a.lastScanAt} />
        </p>
      </Card>
    </Link>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        active
          ? "h-9 rounded-full bg-gold px-3 text-xs text-gold-fg"
          : "h-9 rounded-full border border-border px-3 text-xs text-muted hover:text-fg"
      }
    >
      {children}
    </button>
  );
}