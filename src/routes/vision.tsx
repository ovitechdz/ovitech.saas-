import { createFileRoute } from "@tanstack/react-router";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectCharts } from "@/components/project-charts";
import { TeamSection } from "@/components/team-section";
import { FARM } from "@/lib/seed";
import { useAppLang, useAppT } from "@/i18n/hooks";

export const Route = createFileRoute("/vision")({ component: VisionPage });

const PILLARS = [
  { name: "Hybrid Feed Production", roleKey: "vision.pillars.p1role" },
  { name: "Data-Driven Nutrition Engine", roleKey: "vision.pillars.p2role" },
  { name: "Smart Energy Management", roleKey: "vision.pillars.p3role" },
  { name: "Connected Livestock Intelligence", roleKey: "vision.pillars.p4role" },
];

const DECISIONS = [
  ["FD-01", "vision.decisions.d01"],
  ["FD-02", "vision.decisions.d02"],
  ["FD-03", "vision.decisions.d03"],
  ["FD-04", "vision.decisions.d04"],
  ["FD-05", "vision.decisions.d05"],
  ["FD-06", "vision.decisions.d06"],
  ["FD-07", "vision.decisions.d07"],
  ["FD-08", "vision.decisions.d08"],
  ["FD-09", "vision.decisions.d09"],
] as const;

const ROADMAP = [
  { phase: "MVP", titleKey: "vision.roadmap.r1title", bodyKey: "vision.roadmap.r1body" },
  { phase: "Growth", titleKey: "vision.roadmap.r2title", bodyKey: "vision.roadmap.r2body" },
  { phase: "Enterprise", titleKey: "vision.roadmap.r3title", bodyKey: "vision.roadmap.r3body" },
];

const LABEL = [
  { id: "a1", nowKey: "vision.label.a1now", needKey: "vision.label.a1need" },
  { id: "a2", nowKey: "vision.label.a2now", needKey: "vision.label.a2need" },
  { id: "a3", nowKey: "vision.label.a3now", needKey: "vision.label.a3need" },
  { id: "a4", nowKey: "vision.label.a4now", needKey: "vision.label.a4need" },
];

function VisionPage() {
  const t = useAppT();
  const { lang } = useAppLang();
  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-3xl space-y-10">
        <header>
          <p className="text-xs uppercase tracking-[0.22em] text-gold">{FARM.document}</p>
          <h1 className="mt-2 font-display text-4xl">{t("vision.title")}</h1>
          <p className="mt-4 text-lg text-muted">{t("vision.lead")}</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>{t("vision.plateforme.title")}</CardTitle>
            <CardDesc>{t("vision.plateforme.desc")}</CardDesc>
          </CardHeader>
          <ul className="space-y-2 text-sm text-muted">
            <li>{t("vision.plateforme.li1")}</li>
            <li>{t("vision.plateforme.li2")}</li>
            <li>{t("vision.plateforme.li3")}</li>
            <li>{t("vision.plateforme.li4")}</li>
            <li>{t("vision.plateforme.li5")}</li>
            <li>{t("vision.plateforme.li6")}</li>
          </ul>
        </Card>

        <section>
          <h2 className="font-display text-2xl">{t("vision.pillars.title")}</h2>
          <div className="mt-4 grid gap-3">
            {PILLARS.map((p, i) => (
              <Card key={p.name} className="p-4">
                <p className="font-mono text-xs text-gold">0{i + 1}</p>
                <p className="mt-1 font-display text-lg">{p.name}</p>
                <p className="mt-1 text-sm text-muted">{t(p.roleKey)}</p>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl">{t("vision.decisions.title")}</h2>
          <ul className="mt-4 space-y-3">
            {DECISIONS.map(([id, key]) => (
              <li key={id} className="flex gap-3 text-sm">
                <span className="w-14 shrink-0 font-mono text-gold">{id}</span>
                <span className="text-muted">{t(key)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl">{t("vision.roadmap.title")}</h2>
          <div className="mt-4 grid gap-3">
            {ROADMAP.map((r) => (
              <Card key={r.phase} className="p-4">
                <p className="font-mono text-xs uppercase tracking-wider text-gold">{r.phase}</p>
                <p className="mt-1 font-display text-lg">{t(r.titleKey)}</p>
                <p className="mt-1 text-sm text-muted">{t(r.bodyKey)}</p>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl">{t("vision.label.title")}</h2>
          <p className="mt-2 text-sm text-muted">{t("vision.label.lead")}</p>
          <div className="mt-4 grid gap-3">
            {LABEL.map((row) => (
              <Card key={row.id} className="p-4">
                <p className="font-display text-lg">{t(`vision.label.${row.id}`)}</p>
                <p className="mt-1 text-sm text-fg">{t(row.nowKey)}</p>
                <p className="mt-1 text-xs text-subtle">
                  {t("vision.label.needPrefix")}
                  {t(row.needKey)}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <ProjectCharts lang={lang} />

        <TeamSection lang={lang} />

        <Card>
          <CardHeader>
            <CardTitle>{t("vision.equation.title")}</CardTitle>
          </CardHeader>
          <p className="font-display text-xl leading-snug" dir={lang === "ar" ? "rtl" : "ltr"}>
            {t("vision.equation.formula")}
          </p>
          <p className="mt-3 text-sm text-muted">{t("vision.equation.note")}</p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("vision.horsMvp.title")}</CardTitle>
          </CardHeader>
          <ul className="space-y-2 text-sm text-muted">
            <li>{t("vision.horsMvp.li1")}</li>
            <li>{t("vision.horsMvp.li2")}</li>
            <li>{t("vision.horsMvp.li3")}</li>
            <li>{t("vision.horsMvp.li4")}</li>
            <li>{t("vision.horsMvp.li5")}</li>
          </ul>
        </Card>

        <p className="text-xs text-subtle">{t("vision.footerNote")}</p>
      </div>
    </div>
  );
}