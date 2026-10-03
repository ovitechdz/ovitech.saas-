import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import i18n from "i18next";
import { dirFor, frDoc, isLang, LANGS, LANG_STORAGE_KEY, LAZY_BUNDLES, type Lang } from "./core";
import { I18nContext } from "./context";
import { setFormatLang } from "@/lib/format";

// Initialisé UNE FOIS au chargement du module, lecture seule en FR côté SSR
// (contenu constant -> aucune fuite de langue entre requêtes). Le basculement
// EN/AR est exclusivement client (changeLanguage jamais appelé côté serveur).
const sharedInit: Promise<unknown> = i18n.init({
    resources: { fr: { translation: frDoc } },
    lng: "fr",
    fallbackLng: "fr",
    supportedLngs: [...LANGS],
    interpolation: { escapeValue: false },
    returnNull: false,
    react: { useSuspense: false },
  });

async function ensureClientI18n(): Promise<void> {
  await sharedInit;
}

function applyHtmlAttrs(lang: Lang) {
  if (typeof window === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = dirFor(lang);
  setFormatLang(lang);
}

/**
 * Hydration-asynchrone des routes (chunks via de `reactUse(load())`) : une
 * boundary de route peut s'hydrater dans un commit SUIVANT celui de la
 * coquille. Basculer EN/AR entre les deux commits ferait matcher du texte
 * non-FR contre le HTML SSR FR -> erreur d'hydratation React.
 *
 * Ce drain garantit que l'application de la langue stockée n'intervient
 * qu'après `load` + 2 raf + rIC : tous les commits d'hydratation différés
 * se sont déjà posés en FR, et la bascule devient un re-rendu client propre.
 */
function afterHydrationSettled(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => resolve(), { timeout: 400 });
      } else {
        window.setTimeout(resolve, 100);
      }
    };
    const waitPaint = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(finish);
      });
    };
    if (document.readyState === "complete") {
      waitPaint();
    } else {
      const onLoad = () => waitPaint();
      window.addEventListener("load", onLoad, { once: true });
      // Fusible : ne jamais bloquer la langue choisie au-delà de 3 s.
      window.setTimeout(() => {
        window.removeEventListener("load", onLoad);
        finish();
      }, 3000);
    }
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("fr");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await ensureClientI18n();
        const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
        const target = isLang(stored) ? stored : "fr";
        if (target !== "fr") {
          const bundle = await LAZY_BUNDLES[target]().catch(() => null);
          if (!bundle) return; // bundle indisponible — on reste en FR.
          // Préchauffage fait (import en cache) ; on diffère l'application
          // jusqu'à ce que l'hydratation (y compris commits différés) soit
          // posée, sinon baseline FR vs contenu AR -> erreur d'hydratation.
          await afterHydrationSettled();
          if (cancelled) return;
          i18n.addResourceBundle(target, "translation", bundle.default, true, true);
          await i18n.changeLanguage(target);
          if (cancelled) return;
          applyHtmlAttrs(target);
          setLang(target);
        } else if (!cancelled) {
          await i18n.changeLanguage("fr");
          applyHtmlAttrs("fr");
          setLang("fr");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback(
    async (next: Lang) => {
      if (typeof window === "undefined" || next === lang) return;
      if (next === "fr") {
        await ensureClientI18n();
        await i18n.changeLanguage("fr");
      } else {
        await ensureClientI18n();
        const bundle = await LAZY_BUNDLES[next]();
        i18n.addResourceBundle(next, "translation", bundle.default, true, true);
        await i18n.changeLanguage(next);
      }
      applyHtmlAttrs(next);
      setLang(next);
      try {
        window.localStorage.setItem(LANG_STORAGE_KEY, next);
      } catch {
        // stockage indisponible — langue valable pour la session.
      }
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, ready, apply }), [lang, ready, apply]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}