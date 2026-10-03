import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { CONTACT } from "./contact";
import { downloadPdfBuffer, loadPdfMake, renderPdfBuffer } from "./pdf-engine";
import { ENGINE_VERSION } from "./types";

export interface DossierInput {
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: string;
  date: string;
}

export async function generateDossier(input: DossierInput): Promise<void> {
  const { t, lang, date } = input;
  const ar = lang === "ar";

  const text = (value: string, style?: string, overrides?: object): Content =>
    ({
      text: value,
      rtl: ar,
      style: [style ?? (ar ? "arBody" : "body")],
      ...overrides,
    }) as Content;

  const doc: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    info: {
      title: "OVITECH — Dossier investisseurs & Label Startup Algeria",
      author: "OVITECH",
      subject: "Dossier de démonstration OVT-PD-02 v0.9",
    },
    defaultStyle: {
      font: ar ? "Amiri" : "Roboto",
      fontSize: 10.5,
      lineHeight: 1.45,
    },
    styles: {
      h1: { fontSize: 22, bold: true, color: "#3B5C42", margin: [0, 0, 0, 4] },
      kicker: { fontSize: 9, color: "#A3823C", characterSpacing: 1.4, margin: [0, 0, 0, 8] },
      lead: { fontSize: 11, color: "#2A2A2A", margin: [0, 0, 0, 14] },
      h2: { fontSize: 13, bold: true, color: "#3B5C42", margin: [0, 0, 0, 6] },
      body: { margin: [0, 0, 0, 6], color: "#2A2A2A" },
      arBody: { margin: [0, 0, 0, 6], color: "#2A2A2A", alignment: "right" },
      pillarName: { fontSize: 11.5, bold: true, color: "#3B5C42", margin: [0, 6, 0, 1] },
      pillarRole: { fontSize: 9.5, color: "#5A5A5A", margin: [0, 0, 0, 8] },
      small: { fontSize: 8, color: "#8A8A8A" },
      contactRow: { fontSize: 10, color: "#2A2A2A", margin: [0, 0, 0, 3] },
    },
    footer: (currentPage, pageCount) => ({
      text: `OVT-PD-02 · v0.9 — ${t("investisseurs.footer")} · ${currentPage.toString()} / ${pageCount.toString()}`,
      style: "small",
      margin: [40, 0, 40, 20],
      alignment: "center",
    }),
    content: [
      text("OVITECH", "h1"),
      text(`OVT-PD-02 · v0.9 · ${ENGINE_VERSION} · ${date}`, "kicker"),
      text(t("investisseurs.lead"), "lead"),
      text(t("investisseurs.contactLine"), "contactRow"),
      text(`${t("investisseurs.email")} : ${CONTACT.email}`, "contactRow"),
      text(`${t("investisseurs.phone")} : ${CONTACT.phoneDisplay} (WhatsApp : +${CONTACT.whatsapp})`, "contactRow"),
      { text: "", margin: [0, 0, 0, 8] },
      text(t("investisseurs.pillarsTitle"), "h2"),
      ...["p1role", "p2role", "p3role", "p4role"].map((k, i) => [
        text(
          [
            "Hybrid Feed Production",
            "Data-Driven Nutrition Engine",
            "Smart Energy Management",
            "Connected Livestock Intelligence",
          ][i] ?? "",
          "pillarName",
        ),
        text(t(`vision.pillars.${k}`), "pillarRole"),
      ]).flat(),
      text(t("investisseurs.proofTitle"), "h2"),
      ...["proofS1", "proofS2", "proofS3", "proofS4", "proofS5"].map((k) =>
        text(`•  ${t(`investisseurs.${k}`)}`, ar ? "arBody" : "body", { margin: [0, 0, 0, 3] }),
      ),
      text(t("investisseurs.honestNote", { version: ENGINE_VERSION }), "body"),
      text(t("investisseurs.roadmapTitle"), "h2"),
      ...(["r1", "r2", "r3"] as const).map((ph) => [
        text(t(`vision.roadmap.${ph}title`), "pillarName"),
        text(t(`vision.roadmap.${ph}body`), "pillarRole"),
      ]).flat(),
      text(t("investisseurs.disclaimer"), "small"),
      text(t("investisseurs.labelFooter"), "small"),
    ],
  };

  const api = await loadPdfMake();
  const buffer = await renderPdfBuffer(api, doc);
  downloadPdfBuffer(buffer, `OVITECH-dossier-${lang}.pdf`);
}