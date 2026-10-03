import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const TARGETS = {
  locales: resolve("src/i18n/locales"),
  fragments: resolve("scripts/i18n"),
};

const PATCH = {
  fr: {
    common: {
      voirTout: "Voir tout",
      refus: "refus",
      scanSuffix: "scan",
    },
    scan: {
      sansPoids: "(sans poids)",
      presetInconnu: "Inconnu",
      presetIllisible: "Illisible",
    },
    animal: {
      relancer: "Relancer le moteur",
      poidsKg: "Poids kg",
    },
    nutrition: {
      calcBtn: "Calculer {{code}}",
    },
    indicateurs: {
      seriesGmq: "GMQ kg/j",
      seriesIdent: "% identifiés",
    },
    label: {
      signatureHint: "pour consigner un avis de nutrition / élevage.",
    },
    home: {
      hintSolar: "Solaire {{kwh}} kWh",
      herdContext: "Contexte fourrager : {{name}} · {{stock}} kg disponibles.",
    },
    loading: {
      title: "Chargement…",
    },
    notFound: {
      title: "Page introuvable",
      sub: "Cette page n'existe pas ou a été déplacée.",
      home: "Retour à l'accueil",
    },
    error: {
      title: "Une erreur est survenue",
      sub: "Une erreur inattendue s'est produite.",
      retry: "Recharger la page",
    },
  },
  en: {
    common: {
      voirTout: "View all",
      refus: "refused",
      scanSuffix: "scan",
    },
    scan: {
      sansPoids: "(without weight)",
      presetInconnu: "Unknown",
      presetIllisible: "Unreadable",
    },
    animal: {
      relancer: "Rerun the engine",
      poidsKg: "Weight kg",
    },
    nutrition: {
      calcBtn: "Compute {{code}}",
    },
    indicateurs: {
      seriesGmq: "ADG kg/day",
      seriesIdent: "% identified",
    },
    label: {
      signatureHint: "to record a nutrition / livestock opinion.",
    },
    home: {
      hintSolar: "Solar {{kwh}} kWh",
      herdContext: "Forage context: {{name}} · {{stock}} kg available.",
    },
    loading: {
      title: "Loading…",
    },
    notFound: {
      title: "Page not found",
      sub: "This page does not exist or has been moved.",
      home: "Back to home",
    },
    error: {
      title: "Something went wrong",
      sub: "An unexpected error occurred.",
      retry: "Reload the page",
    },
  },
  ar: {
    common: {
      voirTout: "عرض الكل",
      refus: "رفض",
      scanSuffix: "مسح",
    },
    scan: {
      sansPoids: "(بدون وزن)",
      presetInconnu: "غير معروف",
      presetIllisible: "غير مقروء",
    },
    animal: {
      relancer: "إعادة تشغيل المحرك",
      poidsKg: "الوزن كغ",
    },
    nutrition: {
      calcBtn: "حساب {{code}}",
    },
    indicateurs: {
      seriesGmq: "متوسط النمو كغ/يوم",
      seriesIdent: "% محددون",
    },
    label: {
      signatureHint: "لتسجيل رأي في التغذية / تربية الماشية.",
    },
    home: {
      hintSolar: "طاقة شمسية {{kwh}} ك.و.س",
      herdContext: "سياق الأعلاف: {{name}} · {{stock}} كغ متاحة.",
    },
    loading: {
      title: "جارٍ التحميل…",
    },
    notFound: {
      title: "الصفحة غير موجودة",
      sub: "هذه الصفحة غير موجودة أو تم نقلها.",
      home: "العودة إلى الرئيسية",
    },
    error: {
      title: "حدث خطأ",
      sub: "حدث خطأ غير متوقع.",
      retry: "إعادة تحميل الصفحة",
    },
  },
};

function deepMerge(base, extra) {
  const out = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      out[key] = deepMerge(out[key] ?? {}, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

for (const [label, dir] of Object.entries(TARGETS)) {
  for (const lang of ["fr", "en", "ar"]) {
    const file = resolve(dir, label === "fragments" ? `app.${lang}.json` : `${lang}.json`);
    const doc = JSON.parse(await readFile(file, "utf8"));
    doc.app = deepMerge(doc.app, PATCH[lang]);
    await writeFile(file, JSON.stringify(doc, null, 2) + "\n", "utf8");
    console.log(`Patché : ${label}/${file.split(/[\\/]/).pop()}`);
  }
}