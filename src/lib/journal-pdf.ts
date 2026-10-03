import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { formatDay, formatDateTime } from "./format";
import { sha256Hex } from "./backup";
import { downloadPdfBuffer, loadPdfMake, renderPdfBuffer } from "./pdf-engine";
import type { FarmData } from "./store";
import { ENGINE_VERSION, type EventType, type SyncStatus } from "./types";

const REPORT_REF = "OVT-REPORT-03";

export interface JournalInput {
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: string;
  data: FarmData;
  date: string;
}

export async function generateRapportJour(input: JournalInput): Promise<void> {
  const { t, lang, data, date } = input;
  const ar = lang === "ar";

  const codes = new Map(data.animals.map((a) => [a.id, a.code]));
  const events = [...data.events]
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const incidents = events.filter(
    (e) =>
      e.type === "erreur" ||
      e.syncStatus === "failed" ||
      e.syncStatus === "conflict" ||
      Boolean(e.error),
  ).length;
  const refusals = data.recs.filter((r) => !r.ration).length;
  const identityFails = events.filter(
    (e) =>
      e.type === "erreur" &&
      (e.error === "Identité absente du registre" ||
        e.error === "Signal RFID illisible"),
  ).length;
  const fingerprint = await sha256Hex(
    events
      .map(
        (e) =>
          `${e.id}|${e.at}|${e.type}|${e.syncStatus}|${e.animalId ?? ""}|${e.label}|${e.detail}`,
      )
      .join("\n"),
  );

  const text = (value: string, style?: string, overrides?: object): Content =>
    ({
      text: value,
      rtl: ar,
      style: [style ?? (ar ? "arBody" : "body")],
      ...overrides,
    }) as Content;

  const summary = (label: string, value: string): Content[] => [
    text(`${label} : `, "statLabel"),
    text(value, "statValue", { margin: [0, 0, 0, 3] }),
  ];

  const typeLabel = (e: EventType) => t(`app.rapportJour.type.${e}`);
  const etatLabel = (s: SyncStatus) => t(`app.rapportJour.etat.${s}`);

  const doc: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    info: {
      title: `OVITECH — ${t("app.rapportJour.title")}`,
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
      mono: { fontSize: 8, font: "Roboto" },
      small: { fontSize: 8, color: "#8A8A8A", margin: [0, 10, 0, 0] },
      th: { fontSize: 8.5, bold: true, color: "#3B5C42" },
      td: { fontSize: 8.5, color: "#2A2A2A" },
      tdErr: { fontSize: 8.5, color: "#B3402F" },
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
      text(t("app.rapportJour.title"), "h2"),
      text(
        t("app.rapportJour.lead", { total: events.length, incidents }),
        "body",
      ),
      summary(t("app.rapportJour.total"), `${events.length}`),
      summary(t("app.journal.incidents"), `${incidents}`),
      summary(t("app.journal.refusMoteur"), `${refusals}`),
      summary(t("app.journal.identites"), `${identityFails}`),
      summary(
        t("app.rapportJour.periode"),
        events.length > 0
          ? `${formatDay(events[0]?.at ?? "")} → ${formatDay(events[events.length - 1]?.at ?? "")}`
          : "—",
      ),
      summary(t("app.rapportJour.empreinte"), fingerprint.slice(0, 24) + "…"),
      ...(fingerprint
        ? [
            {
              text: fingerprint,
              style: "mono",
              margin: [0, 0, 0, 6] as [number, number, number, number],
            } as Content,
          ]
        : []),
      text(t("app.rapportJour.timelineTitle"), "h2"),
      {
        table: {
          headerRows: 1,
          widths: [78, 72, 46, 100, 72],
          body: [
            [
              text(t("app.rapportJour.thDate"), "th"),
              text(t("app.rapportJour.thType"), "th"),
              text(t("app.rapportJour.thEtat"), "th"),
              text(t("app.rapportJour.thDetail"), "th"),
              text(t("app.rapportJour.thDossier"), "th"),
            ],
            ...events.slice(-120).map((e) => [
              text(formatDateTime(e.at), "td"),
              text(typeLabel(e.type), "td"),
              text(etatLabel(e.syncStatus), "td"),
              text(e.error ?? e.label, e.error ? "tdErr" : "td"),
              text(e.animalId ? (codes.get(e.animalId) ?? e.animalId) : "—", "td"),
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
      text(t("app.rapportJour.noteData", { version: ENGINE_VERSION }), "small"),
    ],
  };

  const api = await loadPdfMake();
  const buffer = await renderPdfBuffer(api, doc);
  downloadPdfBuffer(buffer, `OVITECH-rapport-journal-${date}-${lang}.pdf`);
}