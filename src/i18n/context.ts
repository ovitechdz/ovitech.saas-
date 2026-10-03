import { createContext, useContext } from "react";
import type { Lang } from "./core";

export interface I18nContextValue {
  lang: Lang;
  ready: boolean;
  apply: (next: Lang) => Promise<void>;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useAppLang(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useAppLang doit être utilisé sous <I18nProvider>");
  }
  return ctx;
}