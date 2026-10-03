import { useCallback, useContext } from "react";
import i18n from "i18next";
import { I18nContext } from "./context";
import { frDoc } from "./core";
import { translatePath } from "./resolve";

export { useAppLang } from "./context";

/**
 * Traducteur interpolé du namespace `app.*`.
 *
 * Hors `<I18nProvider>` (erreur racine, boundary au-dessus du provider) ou
 * côté serveur, on lit le réplica FR — jamais de crash ni de clé brute.
 */
export function useAppT() {
  const ctx = useContext(I18nContext);
  const lang = ctx?.lang ?? "fr";
  return useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      if (!ctx || typeof window === "undefined") {
        return translatePath(frDoc, key, vars) ?? key;
      }
      return i18n.t(key, {
        lng: lang,
        returnNull: false,
        defaultValue: "",
        ...vars,
      });
    },
    [ctx, lang],
  );
}