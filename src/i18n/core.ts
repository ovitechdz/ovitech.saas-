import type { I18nTree } from "./resolve";
import fr from "./locales/fr.json";

export type Lang = "fr" | "en" | "ar";
export type NonFrLang = Exclude<Lang, "fr">;

export const LANGS: readonly Lang[] = ["fr", "en", "ar"];
export const LANG_STORAGE_KEY = "ovitech-presentation-lang";

const LANG_LABELS: Record<Lang, string> = {
  fr: "FR",
  en: "EN",
  ar: "ع",
};

export function langLabel(lang: Lang): string {
  return LANG_LABELS[lang];
}

export function isLang(value: string | null | undefined): value is Lang {
  return value === "fr" || value === "en" || value === "ar";
}

export function readStoredLang(): Lang {
  if (typeof window === "undefined") return "fr";
  try {
    const value = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(value)) return value;
  } catch {
    // stockage indisponible — le défaut reste FR.
  }
  return "fr";
}

export const frDoc = fr as I18nTree;

/** Bundles chargés à la demande uniquement (code-splitting par locale). */
export type LocaleBundle = { default: I18nTree };
export const LAZY_BUNDLES: Record<NonFrLang, () => Promise<LocaleBundle>> = {
  en: () => import("./locales/en.json"),
  ar: () => import("./locales/ar.json"),
};

export function dirFor(lang: Lang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}