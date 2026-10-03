import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, Input, Label } from "@/components/ui/input";
import { RecCard } from "@/components/rec-card";
import { SyncChip } from "@/components/sync-chip";
import { useFarmStore } from "@/lib/store";
import { latestRecByAnimal, weightsFor } from "@/lib/kpis";
import { computeAnimalHealth } from "@/lib/health";
import { HealthSignals, HealthStatusBadge } from "@/components/health-status";
import { ageLabel, formatKg, gestationInfo } from "@/lib/format";
import { TimeText } from "@/components/time-text";
import { bcsSchema, weightSchema } from "@/lib/validation";
import { PENS } from "@/lib/seed";
import type { HealthEventType } from "@/lib/types";
import { useAppT } from "@/i18n/hooks";
import { useShallow } from "zustand/react/shallow";

export const Route = createFileRoute("/troupeau/$id")({ component: AnimalPage });

const axis = { fill: "var(--color-muted)", fontSize: 11 };
const tooltipStyle = {
  background: "var(--color-navy-800)",
  border: "1px solid var(--color-gold-700)",
  borderRadius: 8,
  color: "var(--color-ink-100)",
};

function AnimalPage() {
  const { id } = Route.useParams();
  const t = useAppT();
  const [hydrated, setHydrated] = useState(false);
  const animal = useFarmStore((s) => s.animals.find((a) => a.id === id));
  const recs = useFarmStore(useShallow((s) => s.recs.filter((r) => r.animalId === id)));
  const events = useFarmStore(useShallow((s) => s.events.filter((e) => e.animalId === id)));
  const weights = useFarmStore(useShallow((s) => weightsFor(id, s.weights)));
  const runEngine = useFarmStore((s) => s.runEngine);
  const moveAnimal = useFarmStore((s) => s.moveAnimal);
  const captureAnimal = useFarmStore((s) => s.captureAnimal);
  const addHealthEvent = useFarmStore((s) => s.addHealthEvent);
  const healthEvents = useFarmStore(useShallow((s) => s.healthEvents.filter((h) => h.animalId === id)));
  const [pen, setPen] = useState(animal?.pen ?? "");
  const [weight, setWeight] = useState("");
  const [bcs, setBcs] = useState("");
  const [healthType, setHealthType] = useState<HealthEventType>("examen");
  const [healthNote, setHealthNote] = useState("");

  useEffect(() => {
    const persist = useFarmStore.persist;
    if (!persist) {
      setHydrated(true);
      return;
    }
    const markHydrated = () => setHydrated(true);
    const unsubscribe = persist.onFinishHydration(markHydrated);
    if (persist.hasHydrated()) markHydrated();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!animal) return;
    setPen(animal.pen);
    setWeight(animal.weightKg != null ? String(animal.weightKg) : "");
    setBcs(animal.bcs != null ? String(animal.bcs) : "");
  }, [animal, animal?.pen, animal?.weightKg, animal?.bcs]);

  if (!animal && !hydrated) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center" role="status" aria-live="polite">
        {t("app.loading.title")}
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="font-display text-3xl">{t("app.animal.introuvable")}</h1>
        <p className="mt-2 text-muted">{t("app.animal.introuvableDesc")}</p>
        <Button className="mt-6" asChild>
          <Link to="/troupeau">{t("app.animal.retour")}</Link>
        </Button>
      </div>
    );
  }

  const record = animal;

  const chart = weights.map((w) => ({
    day: w.at.slice(0, 10),
    kg: w.kg,
  }));
  const gest = gestationInfo(record.stage, record.notes);
  const latestRec = latestRecByAnimal(recs).get(id);
  const health = computeAnimalHealth(record, weights, latestRec);

  function saveMeasures() {
    const wParsed = weightSchema.safeParse(weight);
    if (!wParsed.success) {
      toast.error(t("app.scan.toastPoids"));
      return;
    }
    const bParsed = bcsSchema.safeParse(bcs);
    if (!bParsed.success) {
      toast.error(t("app.scan.toastNec"));
      return;
    }
    captureAnimal(record.id, { weightKg: wParsed.data, bcs: bParsed.data });
    toast.success(t("app.animal.toastSaisie"));
  }

  function saveHealthEvent() {
    if (!healthNote.trim()) {
      toast.error(t("app.health.toastRequired"));
      return;
    }
    addHealthEvent({ animalId: record.id, type: healthType, note: healthNote.trim() });
    setHealthNote("");
    toast.success(t("app.health.toastAdded"));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="text-sm text-muted">
        <Link to="/troupeau" className="text-gold">
          {t("app.troupeau.title")}
        </Link>{" "}
        / {animal.code}
      </p>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">{animal.code}</h1>
          <p className="mt-1 font-mono text-sm text-muted">{animal.rfid}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/scan">{t("app.common.scan")}</Link>
          </Button>
          <Button
            onClick={() => {
              const rec = runEngine(animal.id);
              if (rec.ration) toast.success(t("app.animal.toastEmit"));
              else toast.message(t("app.animal.toastInsuffisant"));
            }}
          >
            {t("app.animal.relancer")}
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact k={t("app.common.race")} v={animal.breed} />
        <Fact k={t("app.animal.sexeAge")} v={`${animal.sex === "F" ? t("app.sexe.F") : t("app.sexe.M")} · ${ageLabel(animal.birthDate)}`} />
        <Fact k={t("app.common.poids")} v={formatKg(animal.weightKg)} />
        <Fact k={t("app.common.nec")} v={animal.bcs != null ? String(animal.bcs) : "—"} />
        <Fact k={t("app.common.stade")} v={t("app.stages." + animal.stage)} />
        <Fact k={t("app.common.parc")} v={animal.pen} />
        <Fact k={t("app.common.gmq")} v={animal.adgKg != null ? `${animal.adgKg.toFixed(2)} kg/j` : "—"} />
        <Fact k={t("app.animal.dernierScan")} v={<TimeText iso={animal.lastScanAt} />} />
      </div>

      {gest && (
        <Card className="border-gold/30 bg-gold/5">
          <p className="text-xs uppercase tracking-wider text-gold">{t("app.animal.gestation")}</p>
          <p className="mt-2 font-display text-2xl">
            {gest.day != null ? t("app.animal.gestJ", { day: gest.day }) : t("app.animal.gestConfirme")}
          </p>
          <p className="mt-1 text-sm text-muted">
            {gest.remaining != null
              ? t("app.animal.gestRestant", { remaining: gest.remaining, term: gest.term })
              : t("app.animal.gestTerme", { term: gest.term })}
          </p>
        </Card>
      )}

      {animal.notes && (
        <p className="text-sm text-muted">{t("app.animal.note", { note: animal.notes })}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("app.animal.captureTitle")}</CardTitle>
          <CardDesc>
            {t("app.animal.captureDesc")}
          </CardDesc>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="aw">{t("app.scan.poidsLabel")}</Label>
            <Input
              id="aw"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ab">{t("app.scan.bcsLabel")}</Label>
            <Input
              id="ab"
              inputMode="decimal"
              value={bcs}
              onChange={(e) => setBcs(e.target.value)}
            />
          </div>
        </div>
        <Button className="mt-4" onClick={saveMeasures}>
          {t("app.animal.saveCapteur")}
        </Button>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.health.sectionTitle")}</CardTitle>
          <CardDesc>{t("app.health.eventsDesc")}</CardDesc>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <HealthStatusBadge health={health} />
          {health.vetReview && <Badge tone="danger">{t("app.health.vetReview")}</Badge>}
        </div>
        {health.vetReview && (
          <p className="mt-2 text-xs text-muted">{t("app.health.vetReviewNote")}</p>
        )}
        <div className="mt-5">
          <h3 className="text-sm font-medium">{t("app.health.signalsTitle")}</h3>
          {health.signals.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("app.health.noSignals")}</p>
          ) : (
            <HealthSignals health={health} className="mt-2" />
          )}
        </div>
        <div className="mt-6">
          <h3 className="text-sm font-medium">{t("app.health.eventsTitle")}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {healthEvents.length === 0 && (
              <li className="text-xs text-muted">{t("app.health.emptyEvents")}</li>
            )}
            {healthEvents.map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-3">
                <div>
                  <p>
                    <Badge tone="muted">{t(`app.health.event.${h.type}`)}</Badge>{" "}
                    <span>{h.note}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{h.by}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <SyncChip status={h.syncStatus} />
                  <span className="font-mono text-xs text-subtle">
                    <TimeText iso={h.at} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6">
          <h3 className="text-sm font-medium">{t("app.health.addEvent")}</h3>
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <NativeSelect
                value={healthType}
                onChange={(e) => setHealthType(e.target.value as HealthEventType)}
                aria-label={t("app.health.addEvent")}
              >
                {(["examen", "traitement", "naissance", "observation"] as const).map((k) => (
                  <option key={k} value={k}>
                    {t(`app.health.event.${k}`)}
                  </option>
                ))}
              </NativeSelect>
              <Input
                value={healthNote}
                onChange={(e) => setHealthNote(e.target.value)}
                placeholder={t("app.health.notePlaceholder")}
                aria-label={t("app.health.note")}
              />
            </div>
            <Button className="sm:w-fit" onClick={saveHealthEvent}>
              {t("app.health.saveEvent")}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.animal.transfertTitle")}</CardTitle>
          <CardDesc>{t("app.animal.transfertDesc")}</CardDesc>
        </CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row">
          <NativeSelect
            value={pen || animal.pen}
            onChange={(e) => setPen(e.target.value)}
            aria-label={t("app.animal.transfertTitle")}
          >
            {PENS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </NativeSelect>
          <Button
            variant="outline"
            onClick={() => {
              const next = moveAnimal(animal.id, pen || animal.pen);
              if (next) toast.success(t("app.animal.toastTransfere", { pen: next.pen }));
            }}
          >
            {t("app.animal.saveTransfert")}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.animal.historiqueTitle")}</CardTitle>
          <CardDesc>
            {t("app.animal.historiqueDesc")}
          </CardDesc>
        </CardHeader>
        {chart.length < 2 ? (
          <p className="text-sm text-muted">
            {t("app.animal.deuxPesees")}
          </p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
              <LineChart data={chart}>
                <CartesianGrid stroke="var(--color-navy-700)" vertical={false} />
                <XAxis dataKey="day" tick={axis} tickFormatter={(d) => String(d).slice(5)} />
                <YAxis tick={axis} domain={["auto", "auto"]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="kg" name={t("app.animal.poidsKg")} stroke="var(--color-green-400)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <ul className="mt-4 space-y-2 text-sm">
          {[...weights].reverse().map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-3">
              <span className="tabular">{w.kg.toFixed(1)} kg</span>
              <span className="text-xs text-muted">
                <TimeText iso={w.at} /> · {w.source}
              </span>
              <SyncChip status={w.syncStatus} />
            </li>
          ))}
        </ul>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-xl">{t("app.animal.recsTitle")}</h2>
        <p className="text-sm text-muted">
          {t("app.animal.recsDesc")}
        </p>
        {recs.length === 0 ? (
          <p className="text-sm text-muted">{t("app.animal.recsEmpty")}</p>
        ) : (
          recs.map((r) => <RecCard key={r.id} rec={r} compact />)
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.animal.journalTitle")}</CardTitle>
        </CardHeader>
        <ul className="space-y-3">
          {events.length === 0 && <li className="text-sm text-muted">{t("app.animal.journalEmpty")}</li>}
          {events.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p>{e.label}</p>
                <p className="text-xs text-muted">{e.detail}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <SyncChip status={e.syncStatus} />
                <span className="font-mono text-xs text-subtle"><TimeText iso={e.at} /></span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{k}</p>
      <p className="mt-1 text-sm">{v}</p>
    </Card>
  );
}
