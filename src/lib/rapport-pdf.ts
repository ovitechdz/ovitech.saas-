import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { formatKg, gestationInfo } from "./format";
import { computeAnimalHealth } from "./health";
import { latestRecByAnimal, weightsFor } from "./kpis";
import { downloadPdfBuffer, loadPdfMake, renderPdfBuffer } from "./pdf-engine";
import type { FarmData } from "./store";
import { ENGINE_VERSION, type Animal } from "./types";

const REPORT_REF = "OVT-REPORT-01";

const STATUS_COLOR = {
  ok: "#3B5C42",
  suivi: "#A3823C",
  alerte: "#B45431",
} as const;

export interface RapportInput {
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: string;
  data: FarmData;
  date: string;
}

export function buildRapportRows(
  animals: Animal[],
  weights: FarmData["weights"],
  recs: FarmData["recs"],
) {
  const latest = latestRecByAnimal(recs);
  return animals
    .filter((a) => a.status === "actif")
    .map((animal) => {
      const health = computeAnimalHealth(
        animal,
        weightsFor(animal.id, weights),
        latest.get(animal.id),
      );
      const gest = gestationInfo(animal.stage, animal.notes);
      return { animal, health, gest };
    })
    .sort((a, b) => a.animal.code.localeCompare(b.animal.code));
}

export async function generateRapport(input: RapportInput): Promise<void> {
  const { t, lang, data, date } = input;
  const ar = lang === "ar";

  const rows = buildRapportRows(data.animals, data.weights, data.recs);
  const alertes = rows.filter((r) => r.health.status === "alerte").length;
  const suivi = rows.filter((r) => r.health.status === "suivi").length;
  const gestantes = rows.filter((r) => r.gest?.day != null).length;
  const poids = rows
    .map((r) => r.animal.weightKg)
    .filter((n): n is number => n != null && Number.isFinite(n));
  const poidsMoyen = poids.length ? poids.reduce((a, b) => a + b, 0) / poids.length : 0;

  const text = (value: string, style?: string, overrides?: object): Content =>
    ({
      text: value,
      rtl: ar,
      style: [style ?? (ar ? "arBody" : "body")],
      ...overrides,
    }) as Content;

  const cell = (
    value: string | number,
    style: string,
    color?: string,
  ): Content =>
    ({
      text: String(value),
      rtl: ar,
      style,
      ...(color ? { color } : {}),
    }) as Content;

  const th = (value: string): Content =>
    cell(value, "th", "#3B5C42");

  const summary = (label: string, value: string): Content => [
    text(`${label} : `, "statLabel"),
    text(value, "statValue", { margin: [0, 0, 0, 3] }),
  ];

  const doc: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    info: {
      title: `OVITECH — ${t("app.rapport.title")}`,
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
      text(t("app.rapport.title"), "h2"),
      text(t("app.rapport.lead", { count: rows.length, alertes }), "body"),
      summary(t("app.rapport.total"), `${rows.length}`),
      summary(t("app.rapport.poidsMoyen"), formatKg(poidsMoyen)),
      summary(t("app.rapport.alertes"), `${alertes}`),
      summary(t("app.rapport.suivi"), `${suivi}`),
      summary(t("app.rapport.gestantes"), `${gestantes}`),
      text(t("app.rapport.animaux"), "h2"),
      {
        table: {
          headerRows: 1,
          widths: [70, 30, 110, 46, 36, 52, 80],
          body: [
            [
              th(t("app.common.code")),
              th(t("app.common.sexe")),
              th(t("app.common.stade")),
              th(t("app.common.poids")),
              th(t("app.common.nec")),
              th(t("app.rapport.gestJ")),
              th(t("app.rapport.sante")),
            ],
            ...rows.map(({ animal, health, gest }) => [
              cell(animal.code, "td"),
              cell(t(`app.sexe.${animal.sex}`), "td"),
              cell(t(`app.stages.${animal.stage}`), "td"),
              cell(formatKg(animal.weightKg), "td"),
              cell(animal.bcs != null ? animal.bcs.toFixed(1) : "—", "td"),
              cell(gest?.day != null ? t("app.animal.gestJ", { day: gest.day }) : "—", "td"),
              cell(t(`app.health.status.${health.status}`), "td", STATUS_COLOR[health.status]),
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
      text(t("app.rapport.noteData", { version: ENGINE_VERSION }), "small"),
    ],
  };

  const api = await loadPdfMake();
  const buffer = await renderPdfBuffer(api, doc);
  downloadPdfBuffer(buffer, `OVITECH-rapport-${date}-${lang}.pdf`);
}