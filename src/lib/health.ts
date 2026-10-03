import type { Animal, NutritionRec, WeightRecord } from "./types.ts";
import { DAY_MS } from "./numeric.ts";
import { gestationInfo } from "./format.ts";

/**
 * Santé & vigilance — signaux déterministes bâtis sur les données déjà
 * présentes dans la console (registre animal, historiques de poids, dernière
 * sortie moteur). Aucun modèle d'apprentissage, aucun diagnostic médical :
 * la console lève des SIGNALEMENTS ; la décision (et la revue vétérinaire)
 * reste humaine.
 */
export const HEALTH_SCAN_STALE_DAYS = 3;
export const HEALTH_WEIGHT_LOSS_RATIO = 0.06;
export const HEALTH_LOW_NEC_ALERT = 2.0;
export const HEALTH_LOW_NEC_WATCH = 2.5;
export const HEALTH_LAMBING_WINDOW_DAYS = 10;

export type HealthLevel = "ok" | "suivi" | "alerte";
export type HealthSignalId = "poids" | "nec" | "scan" | "gestation" | "refus";

export interface HealthSignal {
  id: HealthSignalId;
  level: HealthLevel;
}

export interface AnimalHealth {
  status: HealthLevel;
  signals: HealthSignal[];
  vetReview: boolean;
}

const RANK: Record<HealthLevel, number> = { ok: 0, suivi: 1, alerte: 2 };

function push(signals: HealthSignal[], id: HealthSignalId, level: HealthLevel) {
  signals.push({ id, level });
}

export function computeAnimalHealth(
  animal: Animal,
  weights: WeightRecord[],
  latestRec: NutritionRec | undefined,
  now = Date.now(),
): AnimalHealth {
  const signals: HealthSignal[] = [];

  const history = weights
    .filter((w) => w.animalId === animal.id)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  if (history.length >= 2) {
    const w0 = history[0]!;
    const w1 = history[1]!;
    if (
      w0.kg < w1.kg &&
      w0.kg <= w1.kg * (1 - HEALTH_WEIGHT_LOSS_RATIO)
    ) {
      push(signals, "poids", "alerte");
    }
  }

  if (animal.bcs != null && animal.bcs < HEALTH_LOW_NEC_WATCH) {
    push(
      signals,
      "nec",
      animal.bcs < HEALTH_LOW_NEC_ALERT ? "alerte" : "suivi",
    );
  }

  if (!animal.lastScanAt) {
    push(signals, "scan", "suivi");
  } else if (now - new Date(animal.lastScanAt).getTime() > HEALTH_SCAN_STALE_DAYS * DAY_MS) {
    push(signals, "scan", "suivi");
  }

  const gest = gestationInfo(animal.stage, animal.notes);
  if (
    gest &&
    gest.remaining != null &&
    gest.remaining <= HEALTH_LAMBING_WINDOW_DAYS
  ) {
    push(signals, "gestation", "suivi");
  }

  if (latestRec && !latestRec.ration) {
    push(signals, "refus", "alerte");
  }

  let status: HealthLevel = "ok";
  for (const s of signals) {
    if (RANK[s.level] > RANK[status]) status = s.level;
  }

  return {
    status,
    signals,
    vetReview: signals.some((s) => s.level === "alerte"),
  };
}