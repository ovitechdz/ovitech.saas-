import type { FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Radio, ShieldAlert, WifiOff } from "lucide-react";
import { useAppT } from "@/i18n/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { RecCard } from "@/components/rec-card";
import { nextAnimalCode, useFarmStore, type ScanOutcome } from "@/lib/store";
import { BREEDS, PENS } from "@/lib/seed";
import { ageLabel, formatKg } from "@/lib/format";
import { STAGES, type Animal, type NutritionRec, type Sex, type Stage } from "@/lib/types";
import { bcsSchema, newAnimalSchema, weightSchema } from "@/lib/validation";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/scan")({ component: ScanPage });

type Step = "idle" | "scanning" | "result";

const PRESETS = [
  { q: "2401", labelKey: null },
  { q: "2410", labelKey: "app.scan.sansPoids" },
  { q: "E280-1160-0003", labelKey: null },
  { q: "9999", labelKey: "app.scan.presetInconnu" },
  { q: "ERR", labelKey: "app.scan.presetIllisible" },
];

function ScanPage() {
  const t = useAppT();
  const network = useFarmStore((s) => s.network);
  const animals = useFarmStore((s) => s.animals);
  const resolveScan = useFarmStore((s) => s.resolveScan);
  const recordScan = useFarmStore((s) => s.recordScan);
  const logScanFailure = useFarmStore((s) => s.logScanFailure);
  const captureAnimal = useFarmStore((s) => s.captureAnimal);
  const registerAnimal = useFarmStore((s) => s.registerAnimal);
  const runEngine = useFarmStore((s) => s.runEngine);

  const [query, setQuery] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [weight, setWeight] = useState("");
  const [bcs, setBcs] = useState("");
  const [notes, setNotes] = useState("");
  const [rec, setRec] = useState<NutritionRec | null>(null);
  const [saved, setSaved] = useState(false);
  const [enroll, setEnroll] = useState(false);
  const [enrollCode, setEnrollCode] = useState("");
  const [enrollSex, setEnrollSex] = useState<Sex>("F");
  const [enrollBreed, setEnrollBreed] = useState<string>(BREEDS[0]);
  const [enrollStage, setEnrollStage] = useState<Stage>("croissance");
  const [enrollPen, setEnrollPen] = useState<string>(PENS[0]);
  const [enrollBirth, setEnrollBirth] = useState("2024-06-01");

  const suggestedCode = useMemo(() => nextAnimalCode(animals), [animals]);

  function startScan(value: string) {
    setRec(null);
    setSaved(false);
    setEnroll(false);
    setStep("scanning");
    window.setTimeout(() => {
      const result = resolveScan(value);
      setOutcome(result);
      if (result.kind === "ok") {
        setAnimal(result.animal);
        setWeight(result.animal.weightKg != null ? String(result.animal.weightKg) : "");
        setBcs(result.animal.bcs != null ? String(result.animal.bcs) : "");
        setNotes(result.animal.notes);
        recordScan(result.animal);
        toast.message(t("app.scan.toastConfirme", { code: result.animal.code }));
      } else if (result.kind === "unknown") {
        setAnimal(null);
        setEnrollCode(suggestedCode);
        logScanFailure("unknown", value);
        toast.error(t("app.scan.toastInconnu"));
      } else {
        setAnimal(null);
        logScanFailure("unreadable", value, result.reason);
        toast.error(t("app.scan.toastIllisible"));
      }
      setStep("result");
    }, 900);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    startScan(query);
  }

  function saveAndRecommend() {
    if (!animal) return;
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
    const w = wParsed.data;
    const b = bParsed.data;
    const updated = captureAnimal(animal.id, {
      weightKg: w,
      bcs: b,
      notes,
    });
    if (updated) setAnimal(updated);
    const next = runEngine(animal.id);
    setRec(next);
    setSaved(true);
    if (next.ration) toast.success(t("app.scan.toastEmit"));
    else toast.message(t("app.scan.toastBlocage"));
  }

  function createIdentity(e: FormEvent) {
    e.preventDefault();
    const rfid = (outcome?.kind === "unknown" ? outcome.query : query).trim();
    const parsed = newAnimalSchema.safeParse({
      rfid,
      code: enrollCode || suggestedCode,
      weight,
      bcs,
    });
    if (!parsed.success) {
      toast.error(t("app.scan.toastIdentite"));
      return;
    }
    try {
      const created = registerAnimal({
        rfid: parsed.data.rfid,
        code: parsed.data.code,
        sex: enrollSex,
        breed: enrollBreed,
        birthDate: enrollBirth,
        stage: enrollStage,
        pen: enrollPen,
        weightKg: parsed.data.weight,
        bcs: parsed.data.bcs,
        notes,
      });
      setAnimal(created);
      setOutcome({ kind: "ok", animal: created });
      setEnroll(false);
      setWeight(created.weightKg != null ? String(created.weightKg) : "");
      setBcs(created.bcs != null ? String(created.bcs) : "");
      toast.success(t("app.scan.toastCree", { code: created.code }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("app.scan.toastImpossible"));
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">{t("app.scan.kicker")}</p>
        <h1 className="mt-2 font-display text-4xl">{t("app.scan.title")}</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {t("app.scan.lead")}
        </p>
      </header>

      <Card className="relative overflow-hidden">
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-40",
            step === "scanning" && "bg-gold/10",
          )}
        />
        <div className="relative">
          <div className="mb-6 flex items-center justify-center">
            <div className="relative flex size-28 items-center justify-center rounded-full border border-gold/40">
              {step === "scanning" && (
                <>
                  <span className="orb-ring" aria-hidden="true" />
                  <span className="orb-ring orb-ring-delay" aria-hidden="true" />
                </>
              )}
              <Radio className={cn("size-10 text-gold", step === "scanning" && "animate-pulse")} />
            </div>
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
            <Label htmlFor="rfid">{t("app.scan.labelRfid")}</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="rfid"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("app.scan.placeholderRfid")}
                autoComplete="off"
                className="font-mono"
              />
              <Button type="submit" disabled={step === "scanning"}>
                {step === "scanning" ? t("app.scan.lecture") : t("app.scan.btnScan")}
              </Button>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.q}
                type="button"
                className="h-9 rounded-full border border-border px-3 text-xs text-muted hover:text-fg"
                onClick={() => {
                  setQuery(p.q);
                  startScan(p.q);
                }}
              >
                {p.q === "2410"
                  ? `OV-2410 ${t("app.scan.sansPoids")}`
                  : p.labelKey
                    ? t(p.labelKey)
                    : p.q === "2401"
                      ? "OV-2401"
                      : "RFID 0003"}
              </button>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-subtle">
            <Badge tone="warn">{t("app.scan.simule")}</Badge> {t("app.scan.simuleSub")}
          </p>
          {network === "offline" && (
            <p className="mt-4 flex items-center gap-2 text-sm text-warn">
              <WifiOff className="size-4" />
              {t("app.scan.offline")}
            </p>
          )}
        </div>
      </Card>

      {outcome?.kind === "unknown" && (
        <Card className="border-danger/40">
          <div className="flex gap-3">
            <ShieldAlert className="size-5 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <CardTitle>{t("app.scan.inconnuTitle")}</CardTitle>
              <CardDesc>
                {t("app.scan.inconnuDesc", { query: outcome.query })}
              </CardDesc>
              {!enroll ? (
                <Button className="mt-4" variant="outline" onClick={() => setEnroll(true)}>
                  {t("app.scan.enrollBtn")}
                </Button>
              ) : (
                <form onSubmit={createIdentity} className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="ecode">{t("app.scan.enrollCode")}</Label>
                    <Input
                      id="ecode"
                      className="font-mono"
                      value={enrollCode}
                      onChange={(e) => setEnrollCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="esex">{t("app.common.sexe")}</Label>
                    <NativeSelect
                      id="esex"
                      value={enrollSex}
                      onChange={(e) => setEnrollSex(e.target.value as Sex)}
                    >
                      <option value="F">{t("app.sexe.F")}</option>
                      <option value="M">{t("app.sexe.M")}</option>
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ebreed">{t("app.common.race")}</Label>
                    <NativeSelect
                      id="ebreed"
                      value={enrollBreed}
                      onChange={(e) => setEnrollBreed(e.target.value)}
                    >
                      {BREEDS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estage">{t("app.common.stade")}</Label>
                    <NativeSelect
                      id="estage"
                      value={enrollStage}
                      onChange={(e) => setEnrollStage(e.target.value as Stage)}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {t("app.stages." + s)}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="epen">{t("app.common.parc")}</Label>
                    <NativeSelect
                      id="epen"
                      value={enrollPen}
                      onChange={(e) => setEnrollPen(e.target.value)}
                    >
                      {PENS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="ebirth">{t("app.scan.enrollNaissance")}</Label>
                    <Input
                      id="ebirth"
                      type="date"
                      value={enrollBirth}
                      onChange={(e) => setEnrollBirth(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit">{t("app.scan.enrollSubmit")}</Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </Card>
      )}

      {outcome?.kind === "unreadable" && (
        <Card className="border-warn/40">
          <CardTitle>{t("app.scan.illisibleTitle")}</CardTitle>
          <CardDesc>{t("app.scan.illisibleDesc", { reason: outcome.reason })}</CardDesc>
        </Card>
      )}

      {animal && outcome?.kind === "ok" && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{animal.code}</CardTitle>
              <Badge tone="leaf">{t("app.stages." + animal.stage)}</Badge>
              <span className="font-mono text-xs text-muted">{animal.rfid}</span>
            </div>
            <CardDesc>
              {animal.breed} · {animal.sex === "F" ? t("app.sexe.F") : t("app.sexe.M")} · {ageLabel(animal.birthDate)} ·{" "}
              {animal.pen}
            </CardDesc>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="w">{t("app.scan.poidsLabel")}</Label>
              <Input
                id="w"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={t("app.scan.poidsPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b">{t("app.scan.bcsLabel")}</Label>
              <Input
                id="b"
                inputMode="decimal"
                value={bcs}
                onChange={(e) => setBcs(e.target.value)}
                placeholder={t("app.scan.bcsPlaceholder")}
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="n">{t("app.scan.notesLabel")}</Label>
            <Input
              id="n"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("app.scan.notesPlaceholder")}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={saveAndRecommend}>{t("app.scan.saveMoteur")}</Button>
            <Button variant="outline" asChild>
              <Link to="/troupeau/$id" params={{ id: animal.id }}>
                {t("app.scan.dossierAnimal")}
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {saved && rec && <RecCard rec={rec} code={animal?.code} />}

      {animal && (
        <p className="text-xs text-subtle">
          {t("app.scan.poidsActuel", { weight: formatKg(animal.weightKg), bcs: animal.bcs ?? "—" })}
        </p>
      )}
    </div>
  );
}