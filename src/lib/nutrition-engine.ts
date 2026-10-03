import { ENGINE_VERSION, type Animal, type NutritionRec, type Ration, type Stage } from "./types.ts";
import { ageMonths } from "./format.ts";
import { round0, round1 } from "./numeric.ts";

/**
 * Data-Driven Nutrition Engine — modèle de référence v0.9
 *
 * Ce n'est PAS un modèle d'apprentissage automatique. C'est un moteur
 * déterministe, traçable, inspiré des besoins énergétiques ovins
 * (métabolisme, croissance, lactation). Chaque recommandation cite
 * ses entrées. Si une entrée obligatoire manque, le moteur refuse
 * d'émettre une ration — il n'invente pas.
 *
 * Formules (ordre de grandeur, à valider par un expert nutrition) :
 *   ME entretien (MJ/j) ≈ 0.40 × Poids^0.75
 *   ME croissance ≈ 23 MJ / kg de GMQ visé
 *   ME lactation  ≈ 5.0 MJ / kg de lait (hypothèse 1.1 kg si lactation)
 *   IMS max ≈ 3.8 % PV (jeune) / 3.2 % PV (adulte)
 */

const ME_MAINT_COEFF = 0.4;
const ME_PER_KG_GAIN = 23;
const ME_PER_KG_MILK = 5;
const MILK_KG_DEFAULT = 1.1;
const FORAGE_ME = 8.5;
const CONC_ME = 12.5;
const FORAGE_CP = 12;
const CONC_CP = 18;

const ADG_TARGET: Record<Stage, number> = {
  agneau: 0.22,
  croissance: 0.18,
  engraissement: 0.24,
  brebis_entretien: 0,
  brebis_gestation: 0.04,
  brebis_lactation: 0,
  belier: 0,
};

export function computeRecommendation(
  animal: Animal,
  feed: { forageAvailable: boolean; concentrateAvailable: boolean },
): Omit<NutritionRec, "id" | "createdAt" | "syncStatus" | "approvedBy" | "servedAt" | "servedBy"> {
  const missing: string[] = [];
  const evidence: string[] = [];
  const notes: string[] = [];

  if (animal.weightKg == null || !Number.isFinite(animal.weightKg) || animal.weightKg <= 0) {
    missing.push("poids vif (kg)");
  }
  if (animal.bcs == null || !Number.isFinite(animal.bcs)) {
    missing.push("note d'état corporel (NEC 1–5)");
  }
  if (!feed.forageAvailable && !feed.concentrateAvailable) {
    missing.push("contexte fourrager (aucun lot disponible)");
  }

  evidence.push(`Identité ${animal.code} / RFID ${animal.rfid}`);
  evidence.push(`Stade ${animal.stage} · race ${animal.breed}`);
  evidence.push(`Moteur ${ENGINE_VERSION} — règles déterministes, non IA`);

  if (missing.length > 0) {
    return {
      animalId: animal.id,
      engineVersion: ENGINE_VERSION,
      ration: null,
      notes: [
        "Recommandation non émise : une entrée obligatoire est absente.",
        "Le moteur refuse d'inventer une ration sans identité nutritionnelle complète.",
      ],
      confidence: "insuffisante",
      missingInputs: missing,
      evidence,
    };
  }

  const w = animal.weightKg as number;
  const bcs = animal.bcs as number;
  const age = ageMonths(animal.birthDate);
  evidence.push(`Poids vif ${w.toFixed(1)} kg · NEC ${bcs.toFixed(1)} · âge ${age} mois`);

  const maint = ME_MAINT_COEFF * Math.pow(w, 0.75);
  evidence.push(`ME entretien = 0.40 × ${w}^0.75 = ${maint.toFixed(2)} MJ/j`);

  let extra = 0;
  const adg = ADG_TARGET[animal.stage];
  if (adg > 0) {
    extra += adg * ME_PER_KG_GAIN;
    evidence.push(`ME croissance = ${adg} kg GMQ visé × ${ME_PER_KG_GAIN} = ${(adg * ME_PER_KG_GAIN).toFixed(1)} MJ/j`);
  }
  if (animal.stage === "brebis_lactation") {
    extra += MILK_KG_DEFAULT * ME_PER_KG_MILK;
    evidence.push(`ME lactation = ${MILK_KG_DEFAULT} kg lait × ${ME_PER_KG_MILK} = ${(MILK_KG_DEFAULT * ME_PER_KG_MILK).toFixed(1)} MJ/j`);
  }

  let bcsAdj = 0;
  if (bcs < 2.5) {
    bcsAdj = maint * 0.12;
    notes.push("NEC basse : ration majorée pour reconstituer les réserves.");
    evidence.push(`Ajustement NEC < 2.5 : +${bcsAdj.toFixed(2)} MJ/j`);
  } else if (bcs > 4) {
    bcsAdj = -maint * 0.08;
    notes.push("NEC élevée : concentrés réduits pour éviter l'engraissement excessif.");
    evidence.push(`Ajustement NEC > 4 : ${bcsAdj.toFixed(2)} MJ/j`);
  }

  const meNeed = Math.max(maint * 0.85, maint + extra + bcsAdj);
  evidence.push(`ME totale visée = ${meNeed.toFixed(1)} MJ/j`);

  const young = age < 12 || animal.stage === "agneau" || animal.stage === "croissance" || animal.stage === "engraissement";
  const dmiMax = w * (young ? 0.038 : 0.032);
  evidence.push(`IMS plafond ≈ ${(young ? 3.8 : 3.2)} % PV = ${dmiMax.toFixed(2)} kg/j`);

  let concShare = 0.28;
  if (animal.stage === "engraissement" || animal.stage === "agneau") concShare = 0.48;
  if (animal.stage === "brebis_lactation") concShare = 0.38;
  if (animal.stage === "brebis_entretien" || animal.stage === "belier") concShare = 0.18;
  if (!feed.concentrateAvailable) {
    concShare = 0;
    notes.push("Concentré indisponible : ration 100 % fourrage, énergie à surveiller.");
  }
  if (!feed.forageAvailable) {
    concShare = Math.min(0.7, concShare + 0.25);
    notes.push("Fourrage limité : part de concentré relevée, risque d'acidose — fractionner.");
  }

  let dmi = Math.min(dmiMax, meNeed / (concShare * CONC_ME + (1 - concShare) * FORAGE_ME));
  dmi = Math.min(dmiMax, Math.max(0.6, dmi));

  const concentrateKg = round1(dmi * concShare);
  const forageKg = round1(dmi - concentrateKg);
  const mineralG = round0(w * 0.35 + (animal.stage === "brebis_lactation" ? 8 : 0));
  const waterL = round1(w * 0.09 + (animal.stage === "brebis_lactation" ? 2.5 : 0.8));
  const meMj = round1(forageKg * FORAGE_ME + concentrateKg * CONC_ME);
  const cpPercent = round1(
    ((forageKg * FORAGE_CP + concentrateKg * CONC_CP) / Math.max(dmi, 0.1)),
  );

  const ration: Ration = {
    forageKg,
    concentrateKg,
    mineralG,
    waterL,
    cpPercent,
    meMj,
    dmiKg: round1(dmi),
  };

  notes.push("Recommandation d'aide à la décision — l'exécution reste humaine.");
  if (animal.stage === "engraissement") {
    notes.push("Objectif carcasse : maintenir le GMQ sans dépasser NEC 4.");
  }
  if (animal.adgKg != null && adg > 0 && animal.adgKg < adg * 0.7) {
    notes.push("GMQ observé inférieur à la cible : vérifier parasitisme, eau et accès à l'auge.");
  }

  const confidence: NutritionRec["confidence"] =
    animal.adgKg == null ? "moyenne" : "haute";
  if (confidence === "moyenne") {
    notes.push("Confiance moyenne : GMQ non renseigné, cible de stade utilisée.");
  }

  evidence.push(
    `Ration ${forageKg} kg fourrage + ${concentrateKg} kg concentré · ${meMj} MJ · MAT ${cpPercent} %`,
  );

  return {
    animalId: animal.id,
    engineVersion: ENGINE_VERSION,
    ration,
    notes,
    confidence,
    missingInputs: [],
    evidence,
  };
}
