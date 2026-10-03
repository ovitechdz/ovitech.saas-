import i18n from "i18next";
import { useAppLang } from "@/i18n/hooks";
import { frDoc, LANGS, langLabel, LANG_STORAGE_KEY, type Lang } from "@/i18n/core";
import { translatePath } from "@/i18n/resolve";

export type PresentationLang = Lang;

export { LANGS, langLabel, LANG_STORAGE_KEY };

/** t(lang, "pres.*") : clés aplanies des sections présentation.
 *  Côté SSR la lecture se fait sur le réplica FR (sortie française idéntique),
 *  côté client sur le bundle i18next actif. */
export function t(lang: PresentationLang, key: string): string {
  const path = `pres.${key}`;
  if (typeof window === "undefined") {
    return translatePath(frDoc, path) ?? key;
  }
  return i18n.t(path, { lng: lang, returnNull: false, defaultValue: key });
}

export function usePresentationLang(): [PresentationLang, (lang: PresentationLang) => void] {
  const { lang, apply } = useAppLang();
  return [lang, (next: PresentationLang) => void apply(next)];
}