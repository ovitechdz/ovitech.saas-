import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppLang, useAppT } from "@/i18n/hooks";

export interface DeviceStat {
  key: string;
  value: string | number;
  sub?: string;
}

export function DevicePage({
  device,
  icon: Icon,
  stats,
  children,
}: {
  device: "cameras" | "portails" | "balance" | "iot";
  icon: LucideIcon;
  stats: DeviceStat[];
  children?: ReactNode;
}) {
  const t = useAppT();
  const { lang } = useAppLang();
  const base = `app.ecosysteme.${device}`;
  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.22em] text-gold">
            {t("app.ecosysteme.kicker")}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Icon className="size-8 text-gold" />
            <h1 className="font-display text-4xl">{t(`${base}.title`)}</h1>
          </div>
          <p className="mt-2 max-w-2xl text-muted">{t(`${base}.lead`)}</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>{t(`${base}.roleTitle`)}</CardTitle>
            <CardDesc>{t(`${base}.roleDesc`)}</CardDesc>
          </CardHeader>
          <p className="text-sm leading-relaxed text-muted">{t(`${base}.role`)}</p>
          <Badge tone="muted" className="mt-4">
            {t("app.ecosysteme.simulationBadge")}
          </Badge>
          <p className="mt-2 text-xs text-subtle">{t("app.ecosysteme.simulationDesc")}</p>
        </Card>

        <section>
          <h2 className="font-display text-xl">{t("app.ecosysteme.stats")}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => (
              <Card key={s.key} className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted">{t(s.key)}</p>
                <p className="mt-1 font-display text-3xl tabular">{s.value}</p>
                {s.sub && <p className="mt-1 text-xs text-subtle">{s.sub}</p>}
              </Card>
            ))}
          </div>
        </section>

        {children}

        <p className="text-sm">
          <Link to="/ecosysteme" className="text-gold underline-offset-4 hover:underline">
            {t("app.ecosysteme.back")}
          </Link>
        </p>
      </div>
    </div>
  );
}