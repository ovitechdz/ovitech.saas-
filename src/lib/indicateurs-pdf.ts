import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { formatDzd, formatKg } from "./format";
import { computeFarmKpis, latestRecByAnimal, weightsFor } from "./kpis";
import { computeAnimalHealth, type HealthLevel } from "./health";
import { downloadPdfBuffer, loadPdfMake, renderPdfBuffer } from "./pdf-engine";
import type { FarmData } from "./store";
import { ENGINE_VERSION, type KpiPoint } from "./types";

const REPORT_REF = "OVT-REPORT-02";

export interface IndicateursInput {
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: string;
  data: FarmData;
  kpis: ReturnType<typeof computeFarmKpis>;
  series: KpiPoint[];
  date: string;
}

export async function generateRapportInd(input: IndicateursInput): Promise<void> {
  const { t, lang, data, kpis, series, date } = input;
  const ar = lang === "ar";

  const latest = latestRecByAnimal(data.recs);
  const body = data.animals
    .filter((a) => a.status === "actif")
    .map((animal) => ({
      health: computeAnimalHealth(animal, weightsFor(animal.id, data.weights), latest.get(animal.id)),
    }));
  const countHealth = (status: HealthLevel) => body.filter((b) => b.health.status === status).length;

  const text = (value: string, style?: string, overrides?: object): Content =>
    ({
      text: value,
      rtl: ar,
      style: [style ?? (ar ? "arBody" : "body")],
      ...overrides,
    }) as Content;

  const summary = (label: string, value: string): Content => [
    text(`${label} : `, "statLabel"),
    text(value, "statValue", { margin: [0, 0, 0, 3] }),
  ];

  const gmq = `${kpis.meanAdg.toFixed(2)} kg/j`;
  const cover =
    kpis.coverDays != null ? `${Math.round(kpis.coverDays)} j` : "—";

  const doc: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    info: {
      title: `OVITECH — ${t("app.rapportInd.title")}`,
      author: "OVITECH",
      subject: `${REPORT_REF} — ${date}`,
    },
    defaultStyle: {
      font: ar ? "Amiri" : "Roboto",
      fontSize: 10,
      lineHeight: 1.4,
    },
    styles: {
      h1: { fontSize: 22, bold: true, color: "#3B5C42", margin: [0, 0, 0, 4] },
      kicker: {
        fontSize: 9,
        color: "#A3823C",
        characterSpacing: 1.4,
        margin: [0, 0, 0, 10],
      },
      h2: { fontSize: 13, bold: true, color: "#3B5C42", margin: [0, 0, 0, 6] },
      body: { margin: [0, 0, 0, 6], color: "#2A2A2A" },
      arBody: { margin: [0, 0, 0, 6], color: "#2A2A2A", alignment: "right" },
      statLabel: { fontSize: 10, color: "#5A5A5A", margin: [0, 0, 0, 3] },
      statValue: { fontSize: 10, bold: true, color: "#2A2A2A" },
      small: { fontSize: 8, color: "#8A8A8A", margin: [0, 10, 0, 0] },
      th: { fontSize: 8.5, bold: true, color: "#3B5C42" },
      td: { fontSize: 8.5, color: "#2A2A2A" },
    },
    footer: (currentPage, pageCount) => ({
      text: `${REPORT_REF} · ${ENGINE_VERSION} — ${t("app.rapport.footer")} · ${currentPage.toString()} / ${pageCount.toString()}`,
      style: "small",
      margin: [40, 0, 40, 20],
      alignment: "center",
    }),
    content: [
      text("OVITECH", "h1"),
      text(`${REPORT_REF} · ${ENGINE_VERSION} · ${date}`, "kicker"),
      text(t("app.rapportInd.title"), "h2"),
      text(t("app.rapportInd.lead", { herd: kpis.active.length, identified: kpis.identifiedPct, gmq }), "body"),
      summary(t("app.rapport.total"), `${kpis.active.length}`),
      summary(t("app.rapportInd.kpiIdent"), `${kpis.identifiedPct} %`),
      summary(t("app.rapport.poidsMoyen"), formatKg(kpis.meanW)),
      summary(t("app.rapportInd.gmq"), gmq),
      summary(t("app.rapportInd.dataPilote"), `${kpis.dataDrivenPct} %`),
      summary(t("app.rapportInd.refus"), `${kpis.recBlock}`),
      summary(t("app.rapportInd.couverture"), cover),
      summary(t("app.rapportInd.coutRation"), formatDzd(kpis.rationCost)),
      text(t("app.rapportInd.santeTitle"), "h2"),
      summary(t("app.rapport.total"), `${body.length}`),
      summary(t("app.health.status.ok"), `${countHealth("ok")}`),
      summary(t("app.rapport.suivi"), `${countHealth("suivi")}`),
      summary(t("app.rapport.alertes"), `${countHealth("alerte")}`),
      text(t("app.rapportInd.econTitle"), "h2"),
      summary(t("app.rapportInd.forageBesoin"), formatKg(kpis.forageNeed)),
      summary(t("app.rapportInd.concBesoin"), formatKg(kpis.concNeed)),
      summary(t("app.rapportInd.stockFourrage"), formatKg(kpis.forageStock)),
      summary(t("app.rapportInd.couvertureJours"), cover),
      text(t("app.rapportInd.gmqTitle"), "h2"),
      {
        table: {
          headerRows: 1,
          widths: [90, 120, 90, 120],
          body: [
            [
              text(t("app.rapportInd.thJour"), "th"),
              text(t("app.rapportInd.thAdg"), "th"),
              text(t("app.rapportInd.thIdent"), "th"),
              text(t("app.rapportInd.thCout"), "th"),
            ],
            ...series.slice(-14).map((p) => [
              text(p.day, "td"),
              text(`${p.adg.toFixed(2)} kg/j`, "td"),
              text(`${p.identified.toFixed(0)} %`, "td"),
              text(formatDzd(p.feedCost), "td"),
            ]),
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#D6D6D6",
          vLineColor: () => "#E8E8E8",
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 4,
          paddingBottom: () => 4,
          fillColor: (rowIndex) => (rowIndex === 0 ? "#F2F5F1" : null),
        },
      },
      text(t("app.rapportInd.noteData", { version: ENGINE_VERSION }), "small"),
    ],
  };

  const api = await loadPdfMake();
  const buffer = await renderPdfBuffer(api, doc);
  downloadPdfBuffer(buffer, `OVITECH-rapport-indicateurs-${date}-${lang}.pdf`);
}