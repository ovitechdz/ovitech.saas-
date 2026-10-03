import { createFileRoute } from "@tanstack/react-router";
import { Download, Handshake, Mail, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTACT } from "@/lib/contact";
import { generateDossier } from "@/lib/dossier-pdf";
import { FARM } from "@/lib/seed";
import { useAppLang, useAppT } from "@/i18n/hooks";

export const Route = createFileRoute("/investisseurs")({ component: InvestisseursPage });

const PILLAR_NAMES = [
  "Hybrid Feed Production",
  "Data-Driven Nutrition Engine",
  "Smart Energy Management",
  "Connected Livestock Intelligence",
];

const PROOF_KEYS = ["proofS1", "proofS2", "proofS3", "proofS4", "proofS5"];

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
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="relative overflow-hidden rounded-2xl border border-leaf/30 bg-gradient-to-br from-leaf/15 via-bg-elevated to-gold/10 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">
            {FARM.document} · {t("investisseurs.kicker")}
          </p>
          <h1 className="mt-2 font-display text-4xl">{t("investisseurs.title")}</h1>
          <p className="mt-4 max-w-2xl text-muted">{t("investisseurs.lead")}</p>
        </header>

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

        <section>
          <h2 className="font-display text-2xl">{t("investisseurs.pillarsTitle")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PILLAR_NAMES.map((name, i) => (
              <Card key={name} className="p-4">
                <p className="font-mono text-xs text-gold">0{i + 1}</p>
                <p className="mt-1 font-display text-lg">{name}</p>
                <p className="mt-1 text-sm text-muted">{t(`vision.pillars.p${i + 1}role`)}</p>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl">{t("investisseurs.proofTitle")}</h2>
          <Card className="mt-4 p-5">
            <ul className="space-y-2 text-sm text-muted">
              {PROOF_KEYS.map((k) => (
                <li key={k} className="flex gap-2">
                  <span className="text-gold">•</span>
                  <span>{t(`investisseurs.${k}`)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-border pt-3 text-xs text-subtle">
              {t("investisseurs.honestNote", { version: "DDNE-REF-0.9" })}
            </p>
          </Card>
        </section>

        <section>
          <h2 className="font-display text-2xl">{t("investisseurs.roadmapTitle")}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(["r1", "r2", "r3"] as const).map((ph) => (
              <Card key={ph} className="p-4">
                <p className="font-mono text-xs uppercase tracking-wider text-gold">
                  {ph === "r1" ? "MVP" : ph === "r2" ? "Growth" : "Enterprise"}
                </p>
                <p className="mt-2 font-display text-lg">{t(`vision.roadmap.${ph}title`)}</p>
                <p className="mt-1 text-sm text-muted">{t(`vision.roadmap.${ph}body`)}</p>
              </Card>
            ))}
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>{t("investisseurs.labelTitle")}</CardTitle>
            <CardDesc>{t("investisseurs.labelLead")}</CardDesc>
          </CardHeader>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex gap-2">
              <Badge tone="ok">{t("investisseurs.labelOk")}</Badge>
              <span>{t("investisseurs.labelOkBody")}</span>
            </li>
            <li className="flex gap-2">
              <Badge tone="gold">{t("investisseurs.labelNext")}</Badge>
              <span>{t("investisseurs.labelNextBody")}</span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-subtle">{t("investisseurs.disclaimer")}</p>
        </Card>

        <Card className="border-leaf/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="size-5 text-leaf" />
              {t("investisseurs.contactTitle")}
            </CardTitle>
            <CardDesc>{t("investisseurs.contactLead")}</CardDesc>
          </CardHeader>
          <div className="space-y-2 text-sm">
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