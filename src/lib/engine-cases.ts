import { computeRecommendation } from "./nutrition-engine.ts";
import type { Animal, NutritionRec } from "./types.ts";

export interface EngineCase {
  id: string;
  title: string;
  why: string;
  animalId: string;
  feed: { forageAvailable: boolean; concentrateAvailable: boolean };
  expect: {
    emits: boolean;
    missingIncludes?: string;
    notesIncludes?: string;
    confidence?: NutritionRec["confidence"];
    minWater?: number;
    concentrateShareMin?: number;
  };
}

export interface CaseResult {
  id: string;
  title: string;
  why: string;
  ok: boolean;
  fails: string[];
  code: string;
  rec: ReturnType<typeof computeRecommendation> | null;
}

export function referenceCases(): EngineCase[] {
  return [
    {
      id: "TC-01",
      title: "Engraissement — dossier complet",
      why: "Identité, poids et NEC présents : le moteur émet une ration, part concentré élevée.",
      animalId: "an-2401",
      feed: { forageAvailable: true, concentrateAvailable: true },
      expect: { emits: true, concentrateShareMin: 0.4, confidence: "haute" },
    },
    {
      id: "TC-02",
      title: "Poids manquant — refus",
      why: "Sans poids vif, aucune ration n'est inventée (OV-2410).",
      animalId: "an-2410",
      feed: { forageAvailable: true, concentrateAvailable: true },
      expect: {
        emits: false,
        missingIncludes: "poids vif",
        confidence: "insuffisante",
      },
    },
    {
      id: "TC-03",
      title: "Lactation — eau et énergie",
      why: "Brebis en lactation : besoin hydrique relevé, ration émise.",
      animalId: "an-2403",
      feed: { forageAvailable: true, concentrateAvailable: true },
      expect: { emits: true, minWater: 7 },
    },
    {
      id: "TC-04",
      title: "NEC basse — majoration",
      why: "NEC < 2.5 : la ration est majorée, la note le dit.",
      animalId: "an-2408",
      feed: { forageAvailable: true, concentrateAvailable: true },
      expect: { emits: true, notesIncludes: "NEC basse" },
    },
    {
      id: "TC-05",
      title: "NEC élevée — concentrés réduits",
      why: "NEC > 4 : le moteur réduit les concentrés, sans cacher la règle.",
      animalId: "an-2411",
      feed: { forageAvailable: true, concentrateAvailable: true },
      expect: { emits: true, notesIncludes: "NEC élevée" },
    },
    {
      id: "TC-06",
      title: "Aucun lot disponible — refus",
      why: "Hybrid Feed : sans contexte fourrager, pas de ration.",
      animalId: "an-2401",
      feed: { forageAvailable: false, concentrateAvailable: false },
      expect: { emits: false, missingIncludes: "contexte fourrager" },
    },
    {
      id: "TC-07",
      title: "Concentré indisponible — adaptation",
      why: "Le moteur reste utilisable en 100 % fourrage, avec alerte.",
      animalId: "an-2401",
      feed: { forageAvailable: true, concentrateAvailable: false },
      expect: { emits: true, notesIncludes: "Concentré indisponible" },
    },
  ];
}

export function runCase(c: EngineCase, animals: Animal[]): CaseResult {
  const animal = animals.find((a) => a.id === c.animalId);
  if (!animal) {
    return {
      id: c.id,
      title: c.title,
      why: c.why,
      ok: false,
      fails: [`Animal ${c.animalId} introuvable dans le registre local`],
      code: c.animalId,
      rec: null,
    };
  }
  const rec = computeRecommendation(animal, c.feed);
  const fails: string[] = [];
  const { expect } = c;

  if (expect.emits && !rec.ration) fails.push("ration attendue, moteur a refusé");
  if (!expect.emits && rec.ration) fails.push("ration émise alors qu'un refus était attendu");

  if (expect.missingIncludes) {
    const hit = rec.missingInputs.some((m) =>
      m.toLowerCase().includes(expect.missingIncludes!.toLowerCase()),
    );
    if (!hit) fails.push(`entrée manquante attendue : ${expect.missingIncludes}`);
  }

  if (expect.notesIncludes) {
    const hit = rec.notes.some((n) => n.includes(expect.notesIncludes!));
    if (!hit) fails.push(`note attendue : « ${expect.notesIncludes} »`);
  }

  if (expect.confidence && rec.confidence !== expect.confidence) {
    fails.push(`confiance ${rec.confidence} ≠ ${expect.confidence}`);
  }

  if (expect.minWater != null) {
    const w = rec.ration?.waterL ?? 0;
    if (w < expect.minWater) fails.push(`eau ${w} L < ${expect.minWater} L`);
  }

  if (expect.concentrateShareMin != null && rec.ration) {
    const share = rec.ration.concentrateKg / Math.max(rec.ration.dmiKg, 0.01);
    if (share < expect.concentrateShareMin) {
      fails.push(`part concentré ${(share * 100).toFixed(0)} % trop basse`);
    }
  }

  return {
    id: c.id,
    title: c.title,
    why: c.why,
    ok: fails.length === 0,
    fails,
    code: animal.code,
    rec,
  };
}

export function runAllCases(animals: Animal[]): CaseResult[] {
  return referenceCases().map((c) => runCase(c, animals));
}
