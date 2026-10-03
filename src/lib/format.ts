import type { Lang } from "@/i18n/core";

const TZ = "Africa/Algiers";

const LOCALES: Record<Lang, "fr-DZ" | "en-GB" | "ar-DZ"> = {
  fr: "fr-DZ",
  en: "en-GB",
  ar: "ar-DZ",
};

let current: "fr-DZ" | "en-GB" | "ar-DZ" = "fr-DZ";

/** Appelé par I18nProvider à chaque bascule de langue (hors SSR). */
export function setFormatLang(lang: Lang) {
  current = LOCALES[lang];
}

const dtCache = new Map<string, Intl.DateTimeFormat>();

function dayTimeFmt(): Intl.DateTimeFormat {
  let f = dtCache.get(current);
  if (!f) {
    f = new Intl.DateTimeFormat(current, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: TZ,
    });
    dtCache.set(current, f);
  }
  return f;
}

function dayFmt(): Intl.DateTimeFormat {
  let f = dtCache.get(`day:${current}`);
  if (!f) {
    f = new Intl.DateTimeFormat(current, {
      day: "2-digit",
      month: "short",
      timeZone: TZ,
    });
    dtCache.set(`day:${current}`, f);
  }
  return f;
}

const numCache = new Map<string, Intl.NumberFormat>();

function currencyFmt(): Intl.NumberFormat {
  let f = numCache.get(current);
  if (!f) {
    f = new Intl.NumberFormat(current, {
      style: "currency",
      currency: "DZD",
      maximumFractionDigits: 0,
    });
    numCache.set(current, f);
  }
  return f;
}

const AGE_WORDS: Record<"fr-DZ" | "en-GB" | "ar-DZ", { month: string; year: string }> = {
  "fr-DZ": { month: "mois", year: "ans" },
  "en-GB": { month: "mo", year: "yr" },
  "ar-DZ": { month: "شهر", year: "سنة" },
};

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return dayTimeFmt().format(new Date(iso));
}

export function formatDay(iso: string) {
  return dayFmt().format(new Date(iso));
}

export function formatKg(n: number | null | undefined, digits = 1) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)} kg`;
}

export function formatDzd(n: number) {
  return currencyFmt().format(n);
}

export function ageMonths(birthDate: string, at = new Date()) {
  if (!birthDate) return 0;
  const [y = 0, m = 1] = birthDate.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || y < 1970) return 0;
  const b = new Date(y, m - 1, 1);
  const months = (at.getFullYear() - b.getFullYear()) * 12 + (at.getMonth() - b.getMonth());
  return Math.max(0, months);
}

export function ageLabel(birthDate: string) {
  const m = ageMonths(birthDate);
  const num = (n: number) => new Intl.NumberFormat(current).format(n);
  const words = AGE_WORDS[current] ?? AGE_WORDS["fr-DZ"];
  if (m < 12) return `${num(m)} ${words.month}`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (!r) return `${num(y)} ${words.year}`;
  return `${num(y)} ${words.year} ${num(r)} ${words.month}`;
}

export function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

const SHEEP_GESTATION_DAYS = 150;

export function gestationInfo(stage: string, notes: string) {
  if (stage !== "brebis_gestation") return null;
  const m = notes.match(/J\+(\d+)/i);
  if (!m) return { day: null as number | null, remaining: null as number | null, term: SHEEP_GESTATION_DAYS };
  const day = Number(m[1]);
  return {
    day,
    remaining: Math.max(0, SHEEP_GESTATION_DAYS - day),
    term: SHEEP_GESTATION_DAYS,
  };
}