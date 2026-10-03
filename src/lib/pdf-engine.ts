import amiriData from "@/assets/fonts/amiri-regular.ttf?inline";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

type PdfMakeApi = {
  fonts?: Record<string, unknown>;
  addVirtualFileSystem(vfs: Record<string, string>): void;
  createPdf(def: TDocumentDefinitions): {
    getBuffer(): Promise<Uint8Array<ArrayBuffer>>;
  };
};

const FONTS = {
  Roboto: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Medium.ttf",
    italics: "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf",
  },
  Amiri: {
    normal: "amiri-regular.ttf",
    bold: "amiri-regular.ttf",
    italics: "amiri-regular.ttf",
    bolditalics: "amiri-regular.ttf",
  },
};

export async function loadPdfMake(): Promise<PdfMakeApi> {
  const mod = (await import("pdfmake/build/pdfmake")) as unknown as {
    default?: PdfMakeApi;
  };
  const api = (mod.default ?? (mod as unknown as PdfMakeApi)) as PdfMakeApi;
  const fontsMod = (await import("pdfmake/build/vfs_fonts")) as {
    default?: Record<string, string>;
  };
  api.addVirtualFileSystem({
    ...(fontsMod.default ?? {}),
    "amiri-regular.ttf": amiriData.split(",")[1] ?? "",
  });
  api.fonts = FONTS;
  return api;
}

export async function renderPdfBuffer(
  api: PdfMakeApi,
  doc: TDocumentDefinitions,
): Promise<Uint8Array<ArrayBuffer>> {
  const output = api.createPdf({ ...doc, content: doc.content });
  return Promise.race([
    output.getBuffer(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("PDF generation timed out")), 45000),
    ),
  ]);
}

export function downloadPdfBuffer(
  buffer: Uint8Array<ArrayBuffer>,
  filename: string,
) {
  const blob = new Blob([buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}