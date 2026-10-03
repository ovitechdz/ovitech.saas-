import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";
import { RecCard } from "@/components/rec-card";
import { useFarmStore } from "@/lib/store";
import { ENGINE_VERSION } from "@/lib/types";
import { PENS } from "@/lib/seed";
import { useAppT } from "@/i18n/hooks";

export const Route = createFileRoute("/nutrition")({ component: NutritionPage });

type Filter = "all" | "emise" | "refus" | "revue" | "servir";

function NutritionPage() {
  const t = useAppT();
  const recs = useFarmStore((s) => s.recs);
  const animals = useFarmStore((s) => s.animals);
  const runEngine = useFarmStore((s) => s.runEngine);
  const runEngineForPen = useFarmStore((s) => s.runEngineForPen);
  const [pen, setPen] = useState<string>(PENS[0]);
  const [filter, setFilter] = useState<Filter>("all");

  function codeOf(id: string) {
    return animals.find((a) => a.id === id)?.code ?? id;
  }

  const visible = useMemo(() => {
    return recs.filter((r) => {
      if (filter === "emise") return Boolean(r.ration);
      if (filter === "refus") return !r.ration;
      if (filter === "revue") return Boolean(r.ration && !r.approvedBy);
      if (filter === "servir") return Boolean(r.ration && r.approvedBy && !r.servedAt);
      return true;
    });
  }, [recs, filter]);

  const toReview = recs.filter((r) => r.ration && !r.approvedBy).length;
  const toServe = recs.filter((r) => r.ration && r.approvedBy && !r.servedAt).length;
  const refused = recs.filter((r) => !r.ration).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">
          {t("app.nutrition.kicker")}
        </p>
        <h1 className="mt-2 font-display text-4xl">{t("app.nutrition.title")}</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {t("app.nutrition.lead", { version: ENGINE_VERSION })}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.nutrition.modeleTitle")}</CardTitle>
          <CardDesc>{t("app.nutrition.modeleDesc")}</CardDesc>
        </CardHeader>
        <ul className="space-y-2 font-mono text-sm text-muted">
          <li>{t("app.nutrition.f1")}</li>
          <li>{t("app.nutrition.f2")}</li>
          <li>{t("app.nutrition.f3")}</li>
          <li>{t("app.nutrition.f4")}</li>
          <li>{t("app.nutrition.f5")}</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/verification">{t("app.nutrition.verification")}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/ration">{t("app.home.reviewFeuille")}</Link>
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("app.nutrition.parcTitle")}</CardTitle>
          <CardDesc>
            {t("app.nutrition.parcDesc")}
          </CardDesc>
        </CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row">
          <NativeSelect value={pen} onChange={(e) => setPen(e.target.value)} aria-label={t("app.nutrition.parcTitle")}>
            {PENS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </NativeSelect>
          <Button
            variant="outline"
            onClick={() => {
              const out = runEngineForPen(pen);
              const ok = out.filter((r) => r.ration).length;
              toast.message(t("app.troupeau.toastParc", { pen, ok, ref: out.length - ok }));
            }}
          >
            {t("app.nutrition.calcParc")}
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {animals
          .filter((a) => a.status === "actif")
          .slice(0, 8)
          .map((a) => (
            <Button
              key={a.id}
              size="sm"
              variant="outline"
              onClick={() => {
                const rec = runEngine(a.id);
                if (rec.ration) toast.success(t("app.nutrition.toastRation", { code: a.code }));
                else toast.message(t("app.nutrition.toastRefus", { code: a.code, inputs: rec.missingInputs.join(", ") }));
              }}
            >
              {t("app.nutrition.calcBtn", { code: a.code })}
            </Button>
          ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          {t("app.nutrition.filtrerTout")} · {recs.length}
        </FilterChip>
        <FilterChip active={filter === "emise"} onClick={() => setFilter("emise")}>
          {t("app.nutrition.filtrerEmises")}
        </FilterChip>
        <FilterChip active={filter === "refus"} onClick={() => setFilter("refus")}>
          {t("app.nutrition.filtrerRefus")} · {refused}
        </FilterChip>
        <FilterChip active={filter === "revue"} onClick={() => setFilter("revue")}>
          {t("app.nutrition.filtrerRevue")} · {toReview}
        </FilterChip>
        <FilterChip active={filter === "servir"} onClick={() => setFilter("servir")}>
          {t("app.nutrition.filtrerServir")} · {toServe}
        </FilterChip>
      </div>

      <section className="space-y-3">
        {visible.length === 0 && (
          <p className="text-sm text-muted">{t("app.nutrition.aucune")}</p>
        )}
        {visible.map((r) => (
          <RecCard key={r.id} rec={r} code={codeOf(r.animalId)} />
        ))}
      </section>
    </div>
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
