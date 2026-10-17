import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Building2,
  Coins,
  Cpu,
  Dna,
  Download,
  ExternalLink,
  Gauge,
  Heart,
  HeartHandshake,
  HeartPulse,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ScanLine,
  ShieldCheck,
  Sprout,
  Target,
  TrendingUp,
  Warehouse,
  Wheat,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CONTACT } from "@/lib/contact";
import { generateDossier } from "@/lib/dossier-pdf";
import { referenceNumber, referencesByLayer } from "@/lib/project-references";
import { FARM } from "@/lib/seed";
import { useAppLang, useAppT } from "@/i18n/hooks";

export const Route = createFileRoute("/investisseurs")({ component: InvestisseursPage });

const LAYERS = [
  { icon: Wheat, title: "l1Title", body: "l1Body", tech: false },
  { icon: Warehouse, title: "l2Title", body: "l2Body", tech: false },
  { icon: HeartPulse, title: "l3Title", body: "l3Body", tech: false },
  { icon: Dna, title: "l4Title", body: "l4Body", tech: false },
  { icon: HeartHandshake, title: "l5Title", body: "l5Body", tech: false },
  { icon: TrendingUp, title: "l6Title", body: "l6Body", tech: false },
  { icon: Cpu, title: "l7Title", body: "l7Body", tech: true },
] as const;

const MODEL = ["modelP1", "modelP2", "modelP3", "modelP4", "modelP5", "modelP6"] as const;

const PLATFORM = [
  { icon: ScanLine, key: "platformF1" },
  { icon: Coins, key: "platformF2" },
  { icon: Wheat, key: "platformF3" },
  { icon: ShieldCheck, key: "platformF4" },
  { icon: Activity, key: "platformF5" },
  { icon: Gauge, key: "platformF6" },
] as const;

const STATS = [
  { icon: MapPin, label: "statSiteLabel", value: "statSite" },
  { icon: Heart, label: "statFlockLabel", value: "statFlock" },
  { icon: Gauge, label: "statModelLabel", value: "statModel" },
  { icon: Cpu, label: "statToolLabel", value: "statTool" },
] as const;

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl">{title}</h2>
        {lead ? <p className="mt-1 max-w-3xl text-sm text-muted">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}

function FarmScene() {
  return (
    <svg viewBox="0 0 320 200" className="h-auto w-full" aria-hidden="true">
      <defs>
        <linearGradient id="inv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-leaf)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--color-gold)" stopOpacity="0.05" />
        </linearGradient>
        <g id="inv-sheep">
          <ellipse cx="0" cy="0" rx="15" ry="10" className="fill-muted" />
          <circle cx="13" cy="-6" r="6" className="fill-muted" />
          <line x1="-8" y1="7" x2="-8" y2="17" className="stroke-subtle" strokeWidth="3" />
          <line x1="5" y1="7" x2="5" y2="17" className="stroke-subtle" strokeWidth="3" />
        </g>
      </defs>
      <rect x="0" y="0" width="320" height="200" rx="16" fill="url(#inv-sky)" />
      <line x1="16" y1="168" x2="304" y2="168" className="stroke-leaf" strokeOpacity="0.5" strokeWidth="2" />
      <polygon points="40,120 80,90 120,120" className="fill-gold" fillOpacity="0.22" stroke="var(--color-gold)" strokeWidth="2" strokeLinejoin="round" />
      <rect x="52" y="120" width="56" height="48" className="fill-surface-2" stroke="var(--color-gold)" strokeOpacity="0.6" strokeWidth="2" />
      <rect x="72" y="132" width="16" height="36" className="fill-gold" fillOpacity="0.25" />
      <use href="#inv-sheep" x="170" y="152" />
      <use href="#inv-sheep" x="215" y="156" />
      <use href="#inv-sheep" x="258" y="150" />
      <line x1="270" y1="120" x2="270" y2="90" className="stroke-gold" strokeOpacity="0.7" strokeWidth="2" />
      <line x1="262" y1="112" x2="278" y2="102" className="stroke-gold" strokeOpacity="0.7" strokeWidth="2" />
      <g className="stroke-gold" strokeOpacity="0.6" strokeWidth="1.5" fill="none">
        <path d="M232 42 L262 24 L292 42" />
        <path d="M232 42 L262 60 L292 42" />
        <path d="M232 42 L232 60" />
        <path d="M292 42 L292 60" />
      </g>
      <circle cx="232" cy="42" r="3.5" className="fill-gold" />
      <circle cx="292" cy="42" r="3.5" className="fill-gold" />
      <circle cx="262" cy="24" r="3.5" className="fill-gold" />
      <circle cx="262" cy="60" r="3.5" className="fill-gold" />
      <line x1="232" y1="60" x2="292" y2="60" className="stroke-gold" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 4" />
    </svg>
  );
}

function InvestisseursPage() {
  const t = useAppT();
  const { lang } = useAppLang();
  const [busy, setBusy] = useState(false);

  async function onPdf() {
    setBusy(true);
    try {
      await generateDossier({ t, lang, date: new Date().toISOString().slice(0, 10) });
      toast.success(t("investisseurs.pdfDone"));
    } catch {
      toast.error(t("investisseurs.pdfError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="relative overflow-hidden rounded-2xl border border-leaf/30 bg-gradient-to-br from-leaf/15 via-bg-elevated to-gold/10 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">
            {FARM.document} · {t("project.kicker")}
          </p>
          <div className="mt-2 grid gap-6 md:grid-cols-[1.15fr_1fr] md:items-center">
            <div>
              <h1 className="font-display text-4xl">{t("project.title")}</h1>
              <p className="mt-4 max-w-2xl text-muted">{t("project.lead")}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge tone="leaf">
                  <Sprout className="size-3.5" />
                  {t("project.tagFarm")}
                </Badge>
                <Badge tone="gold">
                  <Cpu className="size-3.5" />
                  {t("project.tagTech")}
                </Badge>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-leaf/25 bg-bg/40">
              <FarmScene />
            </div>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map(({ icon: Icon, label, value }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center gap-2 text-gold">
                <Icon className="size-4" />
                <span className="text-xs uppercase tracking-wider">{t(`project.${label}`)}</span>
              </div>
              <p className="mt-2 font-display text-lg">{t(`project.${value}`)}</p>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button size="lg" onClick={onPdf} disabled={busy}>
            <Download className="size-4" />
            {busy ? t("investisseurs.pdfBusy") : t("investisseurs.pdf")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-green-500/70 text-green-400 hover:bg-green-700/20 hover:text-green-300"
            asChild
          >
            <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" />
              {t("investisseurs.wa")}
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href={`mailto:${CONTACT.email}`}>
              <Mail className="size-4" />
              {t("investisseurs.email")}
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href={`tel:${CONTACT.telIntl}`}>
              <Phone className="size-4" />
              {t("investisseurs.phone")}
            </a>
          </Button>
        </div>

        <Section title={t("project.activityTitle")} lead={t("project.activityLead")}>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                { icon: Sprout, title: "cardActivityTitle", body: "cardActivityBody" },
                { icon: MapPin, title: "cardSiteTitle", body: "cardSiteBody" },
                { icon: Heart, title: "cardFlockTitle", body: "cardFlockBody" },
                { icon: Target, title: "cardGoalTitle", body: "cardGoalBody" },
              ] as const
            ).map(({ icon: Icon, title, body }) => (
              <Card key={title} className="p-5">
                <div className="flex items-center gap-2 text-leaf">
                  <Icon className="size-5" />
                  <h3 className="font-display text-lg">{t(`project.${title}`)}</h3>
                </div>
                <p className="mt-2 text-sm text-muted">{t(`project.${body}`)}</p>
              </Card>
            ))}
          </div>
          <p className="rounded-lg border border-gold/25 bg-gold/5 p-3 text-xs text-subtle">
            {t("project.activityNote")}
          </p>
        </Section>

        <Section title={t("project.modelTitle")} lead={t("project.modelLead")}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODEL.map((key, i) => (
              <Card key={key} className="p-4">
                <span className="font-mono text-xs text-gold">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-2 text-sm text-muted">{t(`project.${key}`)}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section title={t("project.layersTitle")} lead={t("project.layersLead")}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Badge tone="leaf">
                <Sprout className="size-3.5" />
                {t("project.layersActivityLabel")}
              </Badge>
            </div>
            {LAYERS.filter((l) => !l.tech).map(({ icon: Icon, title, body }) => (
              <Card key={title} className="border-leaf/25 p-5">
                <div className="flex items-center gap-2 text-leaf">
                  <Icon className="size-5" />
                  <h3 className="font-display text-lg">{t(`project.${title}`)}</h3>
                </div>
                <p className="mt-2 text-sm text-muted">{t(`project.${body}`)}</p>
              </Card>
            ))}
          </div>
          <div className="grid gap-3">
            <p className="font-mono text-xs uppercase tracking-wider text-gold">
              {t("project.layersTechLabel")}
            </p>
            {LAYERS.filter((layer) => layer.tech).map(({ icon: Icon, title, body }) => (
              <Card key={title} className="border-gold/40 bg-gold/5 p-5">
                <div className="flex items-center gap-2 text-gold">
                  <Icon className="size-5" />
                  <h3 className="font-display text-lg">{t(`project.${title}`)}</h3>
                </div>
                <p className="mt-2 text-sm text-muted">{t(`project.${body}`)}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section title={t("project.feedTitle")} lead={t("project.feedLead")}>
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-leaf">
                <Wheat className="size-5" />
                <h3 className="font-display text-lg">{t("project.feedNowTitle")}</h3>
              </div>
              <p className="mt-2 text-sm text-muted">{t("project.feedNow")}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-gold">
                <TrendingUp className="size-5" />
                <h3 className="font-display text-lg">{t("project.feedAutonomyTitle")}</h3>
              </div>
              <p className="mt-2 text-sm text-muted">{t("project.feedAutonomy")}</p>
            </Card>
          </div>
          <ul className="grid gap-2 sm:grid-cols-3">
            {(["feedP1", "feedP2", "feedP3"] as const).map((k) => (
              <li key={k} className="flex gap-2 rounded-lg border border-border bg-surface p-3 text-sm text-muted">
                <Sprout className="mt-0.5 size-4 shrink-0 text-leaf" />
                <span>{t(`project.${k}`)}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t("project.flockTitle")} lead={t("project.flockLead")}>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                { icon: Heart, key: "flockHerd" },
                { icon: HeartPulse, key: "flockHealth" },
                { icon: Dna, key: "flockRepro" },
                { icon: HeartHandshake, key: "flockWelfare" },
              ] as const
            ).map(({ icon: Icon, key }) => (
              <div key={key} className="flex gap-3 rounded-lg border border-border bg-surface p-4">
                <Icon className="mt-0.5 size-5 shrink-0 text-leaf" />
                <p className="text-sm text-muted">{t(`project.${key}`)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-subtle">{t("project.flockNow")}</p>
        </Section>

        <Section title={t("project.opsTitle")} lead={t("project.opsLead")}>
          <div className="grid gap-3 md:grid-cols-3">
            {(
              [
                { icon: TrendingUp, key: "opsProduction" },
                { icon: Coins, key: "opsCosts" },
                { icon: Gauge, key: "opsKpi" },
              ] as const
            ).map(({ icon: Icon, key }) => (
              <Card key={key} className="p-5">
                <Icon className="size-5 text-gold" />
                <p className="mt-2 text-sm text-muted">{t(`project.${key}`)}</p>
              </Card>
            ))}
          </div>
          <p className="rounded-lg border border-gold/25 bg-gold/5 p-3 text-xs text-subtle">
            {t("project.opsNote")}
          </p>
        </Section>

        <Section title={t("project.platformTitle")} lead={t("project.platformLead")}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM.map(({ icon: Icon, key }) => (
              <div key={key} className="flex gap-3 rounded-lg border border-leaf/25 bg-surface p-4">
                <Icon className="mt-0.5 size-4 shrink-0 text-gold" />
                <p className="text-sm text-muted">{t(`project.${key}`)}</p>
              </div>
            ))}
          </div>
          <p className="rounded-lg border border-border bg-surface-2 p-3 text-xs text-subtle">
            {t("project.platformNote")}
          </p>
        </Section>

        <Section title={t("project.roadmapTitle")} lead={t("project.roadmapLead")}>
          <div className="grid gap-3 md:grid-cols-3">
            {(["R1", "R2", "r3"] as const).map((_ph, i) => {
              const n = i + 1;
              return (
                <Card key={n} className="p-5">
                  <div className="flex items-center gap-2 text-gold">
                    {i === 0 ? <Sprout className="size-5" /> : i === 1 ? <ShieldCheck className="size-5" /> : <Building2 className="size-5" />}
                    <span className="font-mono text-xs uppercase tracking-wider">{t(`project.roadmapR${n}Title`)}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{t(`project.roadmapR${n}Body`)}</p>
                </Card>
              );
            })}
          </div>
          <Card className="border-gold/30 p-5">
            <div className="flex items-center gap-2 text-gold">
              <Coins className="size-5" />
              <h3 className="font-display text-lg">{t("project.investTitle")}</h3>
            </div>
            <p className="mt-2 text-sm text-muted">{t("project.investBody")}</p>
            <p className="mt-2 text-xs text-subtle">{t("project.investNote")}</p>
          </Card>
        </Section>

        <Section title={t("project.evidenceTitle")}>
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="p-5">
              <Badge tone="ok">{t("project.evidenceShown")}</Badge>
              <p className="mt-3 text-sm text-muted">{t("project.evidenceShownBody")}</p>
            </Card>
            <Card className="p-5">
              <Badge tone="gold">{t("project.evidenceToProve")}</Badge>
              <p className="mt-3 text-sm text-muted">{t("project.evidenceToProveBody")}</p>
            </Card>
          </div>
          <p className="text-xs text-subtle">{t("project.evidenceNote")}</p>
        </Section>

        <Section title={t("project.refsTitle")} lead={t("project.refsLead")}>
          <p className="text-xs text-subtle">{t("project.refsLayersNote")}</p>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7].map((layer) => {
              const refs = referencesByLayer(layer);
              if (!refs.length) return null;
              const tech = layer === 7;
              return (
                <div key={layer} className="space-y-2">
                  {tech ? (
                    <Badge tone="gold">
                      <Cpu className="size-3.5" />
                      {t("project.l7Title")}
                    </Badge>
                  ) : (
                    <Badge tone="leaf">
                      <Sprout className="size-3.5" />
                      {t(`project.l${layer}Title`)}
                    </Badge>
                  )}
                  <ul className="space-y-2">
                    {refs.map((ref) => (
                      <li
                        key={`${layer}-${ref.id}`}
                        className="rounded-lg border border-border bg-surface p-3 text-sm text-muted"
                      >
                        <span className="font-medium">#{referenceNumber(ref)}</span> {ref.citation}
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-gold hover:underline"
                          >
                            <ExternalLink className="size-3.5" />
                            {ref.source} · {t("project.refsSource")}
                          </a>
                          {ref.verified ? (
                            <span className="text-[11px] text-leaf">{t("project.refsVerified")}</span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 size-5 shrink-0 text-gold" />
              <p className="text-sm text-muted">{t("project.refsFramework")}</p>
            </div>
            <p className="mt-3 border-t border-border pt-3 text-xs text-subtle">{t("project.refsNote")}</p>
          </Card>
        </Section>

        <Card className="border-leaf/40">
          <div className="flex items-center gap-2">
            <HeartHandshake className="size-5 text-leaf" />
            <h2 className="font-display text-xl">{t("investisseurs.contactTitle")}</h2>
          </div>
          <p className="mt-1 text-sm text-muted">{t("investisseurs.contactLead")}</p>
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <Mail className="size-4 text-muted" />
              <a href={`mailto:${CONTACT.email}`} className="hover:text-gold">
                {CONTACT.email}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-4 text-muted" />
              <a href={`tel:${CONTACT.telIntl}`} className="hover:text-gold">
                {CONTACT.phoneDisplay}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <MessageCircle className="size-4 text-muted" />
              <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-gold">
                +{CONTACT.whatsapp}
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
