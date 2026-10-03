import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { EngineCasesPanel } from "@/components/engine-cases-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { TimeText } from "@/components/time-text";
import { runAllCases } from "@/lib/engine-cases";
import { useFarmStore } from "@/lib/store";
import { ENGINE_VERSION } from "@/lib/types";
import { signoffSchema } from "@/lib/validation";
import { useAppT } from "@/i18n/hooks";

export const Route = createFileRoute("/verification")({
  component: VerificationPage,
});

function VerificationPage() {
  const t = useAppT();
  const animals = useFarmStore((s) => s.animals);
  const signoffs = useFarmStore((s) => s.signoffs);
  const signProtocol = useFarmStore((s) => s.signProtocol);
  const results = runAllCases(animals);
  const passed = results.filter((r) => r.ok).length;

  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState<"nutrition" | "elevage">("nutrition");
  const [notes, setNotes] = useState("");

  function onSign(e: FormEvent) {
    e.preventDefault();
    const parsed = signoffSchema.safeParse({ name });
    if (!parsed.success) {
      toast.error(t("app.verification.toastNom"));
      return;
    }
    signProtocol({
      name: parsed.data.name,
      specialty,
      protocol: "TC-01 à TC-07 · DDNE-REF-0.9",
      notes,
      passed,
      total: results.length,
      caseIds: results.filter((r) => r.ok).map((r) => r.id),
    });
    toast.success(t("app.verification.toastConsigne"));
    setName("");
    setNotes("");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">{t("app.verification.kicker")}</p>
        <h1 className="mt-2 font-display text-4xl">{t("app.verification.title")}</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {t("app.verification.lead", { version: ENGINE_VERSION })}
        </p>
      </header>

      <EngineCasesPanel embedded />

      <Card>
        <CardHeader>
          <CardTitle>{t("app.verification.signTitle")}</CardTitle>
          <CardDesc>{t("app.verification.signDesc")}</CardDesc>
        </CardHeader>
        <form className="space-y-4" onSubmit={onSign}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ex-name">{t("app.verification.nom")}</Label>
              <Input
                id="ex-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("app.verification.nomPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ex-spec">{t("app.verification.specialite")}</Label>
              <NativeSelect
                id="ex-spec"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value as "nutrition" | "elevage")}
              >
                <option value="nutrition">{t("app.verification.specNutrition")}</option>
                <option value="elevage">{t("app.verification.specElevage")}</option>
              </NativeSelect>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ex-notes">{t("app.verification.reserves")}</Label>
            <Input
              id="ex-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("app.verification.reservesPlaceholder")}
            />
          </div>
          <Button type="submit" disabled={passed < results.length}>
            {t("app.verification.signBtn", { passed, total: results.length })}
          </Button>
          {passed < results.length && (
            <p className="text-xs text-warn">
              {t("app.verification.signHint")}
            </p>
          )}
        </form>
        {signoffs.length > 0 && (
          <ul className="mt-6 space-y-3 border-t border-border pt-4">
            {signoffs.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p>
                    {s.name}{" "}
                    <Badge tone="ok">
                    {s.specialty === "nutrition"
                      ? t("app.verification.specNutrition")
                      : t("app.verification.specElevage")}
                  </Badge>
                  </p>
                  <p className="text-xs text-muted">
                    {s.protocol} · {s.passed}/{s.total}
                    {s.notes ? ` · ${s.notes}` : ""}
                  </p>
                </div>
                <span className="font-mono text-xs text-subtle">
                  <TimeText iso={s.signedAt} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.verification.auDelaTitle")}</CardTitle>
          <CardDesc>{t("app.verification.auDelaDesc")}</CardDesc>
        </CardHeader>
        <ul className="space-y-2 text-sm text-muted">
          <li>{t("app.verification.b1")}</li>
          <li>{t("app.verification.b2")}</li>
          <li>{t("app.verification.b3")}</li>
        </ul>
      </Card>
    </div>
  );
}
