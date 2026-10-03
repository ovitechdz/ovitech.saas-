import {
  animals as seedAnimals,
  energy as seedEnergy,
  events as seedEvents,
  feedLots as seedFeed,
  healthEvents as seedHealthEvents,
  kpiSeries as seedKpis,
  recs as seedRecs,
  weights as seedWeights,
} from "../seed.ts";
import type {
  ExpertSignoff,
  NetworkState,
  Role,
} from "../types.ts";

/** Initial state (copies dérivées du seed, jamais de références partagées).
 *  Source unique de vérité : consommée par le store composé ET par resetDemo. */
export function seedState() {
  return {
    role: "field" as Role,
    network: "online" as NetworkState,
    currentFarmId: "farm-1",
    animals: seedAnimals.map((a) => ({ ...a })),
    events: seedEvents.map((e) => ({ ...e })),
    healthEvents: seedHealthEvents.map((h) => ({ ...h })),
    recs: seedRecs.map((r) => ({
      ...r,
      notes: [...r.notes],
      evidence: [...r.evidence],
      missingInputs: [...r.missingInputs],
      ration: r.ration ? { ...r.ration } : null,
    })),
    feed: seedFeed.map((f) => ({ ...f })),
    energy: { ...seedEnergy, series: seedEnergy.series.map((x) => ({ ...x })) },
    kpiSeries: seedKpis.map((k) => ({ ...k })),
    weights: seedWeights.map((w) => ({ ...w })),
    signoffs: [] as ExpertSignoff[],
    lastSyncedAt: "2026-08-28T09:24:00.000Z" as string | null,
    failNextSync: false,
  };
}
