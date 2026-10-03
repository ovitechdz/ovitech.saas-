import { Link } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { runAllCases } from "@/lib/engine-cases";
import { useFarmStore } from "@/lib/store";
import { useAppT } from "@/i18n/hooks";
import { ENGINE_VERSION } from "@/lib/types";
import { cn } from "@/lib/cn";

export function EngineCasesPanel({ embedded = false }: { embedded?: boolean }) {
  const t = useAppT();
  const animals = useFarmStore((s) => s.animals);
  const resetDemo = useFarmStore((s) => s.resetDemo);
  const results = runAllCases(animals);
  const passed = results.filter((r) => r.ok).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{t("app.engineCases.title", { version: ENGINE_VERSION })}</CardTitle>
            <CardDesc>{t("app.engineCases.desc")}</CardDesc>
          </div>
          <Badge tone={passed === results.length ? "ok" : "warn"}>
            {t("app.engineCases.badge", { passed, total: results.length })}
          </Badge>
        </div>
      </CardHeader>
      <ul className="space-y-3">
        {results.map((r) => (
          <li key={r.id} className="flex gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                r.ok ? "bg-leaf/20 text-leaf" : "bg-danger/15 text-danger",
              )}
            >
              {r.ok ? <Check className="size-3.5" aria-hidden="true" /> : <Minus className="size-3.5" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-mono text-xs text-gold">{r.id}</span>{" "}
                {r.title}
                <span className="text-muted"> · {r.code}</span>
              </p>
              <p className="text-xs text-subtle">{r.why}</p>
              {!r.ok && (
                <p className="mt-1 text-xs text-danger">{r.fails.join(" · ")}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      {passed < results.length && (
        <p className="mt-4 text-xs text-muted">{t("app.engineCases.hint")}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {!embedded && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/verification">{t("app.engineCases.ouverture")}</Link>
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => resetDemo()}>
          {t("app.engineCases.reinitialiser")}
        </Button>
      </div>
    </Card>
  );
}