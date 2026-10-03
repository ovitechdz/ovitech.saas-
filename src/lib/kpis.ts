import type { Animal, FeedLot, NutritionRec, WeightRecord } from "./types.ts";
import { DAY_MS } from "./numeric.ts";
import { concentratePrice, foragePrice, forageStock as totalForageStock } from "./feed.ts";

export function latestRecByAnimal(recs: NutritionRec[]): Map<string, NutritionRec> {
  const map = new Map<string, NutritionRec>();
  for (const r of recs) {
    const prev = map.get(r.animalId);
    if (!prev || prev.createdAt < r.createdAt) map.set(r.animalId, r);
  }
  return map;
}

export function computeFarmKpis(input: {
  animals: Animal[];
  recs: NutritionRec[];
  feed: FeedLot[];
  pending: number;
  energyAutonomy: number;
}) {
  const active = input.animals.filter((a) => a.status === "actif");
  const withWeight = active.filter((a) => a.weightKg != null);
  const withAdg = active.filter((a) => a.adgKg != null);
  const identifiedPct = Math.round(
    (active.filter((a) => a.rfid).length / Math.max(1, active.length)) * 100,
  );
  const meanW =
    withWeight.reduce((s, a) => s + (a.weightKg ?? 0), 0) / Math.max(1, withWeight.length);
  const meanAdg =
    withAdg.reduce((s, a) => s + (a.adgKg ?? 0), 0) / Math.max(1, withAdg.length);
  const recOk = input.recs.filter((r) => r.ration).length;
  const recBlock = input.recs.filter((r) => !r.ration).length;
  const dataDrivenPct = Math.round((recOk / Math.max(1, recOk + recBlock)) * 100);

  const latest = latestRecByAnimal(input.recs);
  const fPrice = foragePrice(input.feed);
  const cPrice = concentratePrice(input.feed);

  let forageNeed = 0;
  let concNeed = 0;
  let rationCost = 0;
  for (const a of active) {
    const rec = latest.get(a.id);
    if (!rec?.ration) continue;
    forageNeed += rec.ration.forageKg;
    concNeed += rec.ration.concentrateKg;
    rationCost +=
      rec.ration.forageKg * fPrice +
      rec.ration.concentrateKg * cPrice;
  }

  const coverDays = forageNeed > 0 ? totalForageStock(input.feed) / forageNeed : null;
  const forageStock = totalForageStock(input.feed);

  const missingWeight = active.filter((a) => a.weightKg == null);
  const lowBcs = active.filter((a) => a.bcs != null && a.bcs < 2.5);
  const staleScan = active.filter((a) => {
    if (!a.lastScanAt) return true;
    return Date.now() - new Date(a.lastScanAt).getTime() > DAY_MS;
  });

  return {
    active,
    identifiedPct,
    meanW,
    meanAdg,
    recOk,
    recBlock,
    dataDrivenPct,
    forageNeed,
    concNeed,
    rationCost,
    forageStock,
    coverDays,
    missingWeight,
    lowBcs,
    staleScan,
    pending: input.pending,
    energyAutonomy: input.energyAutonomy,
  };
}

export function weightsFor(animalId: string, weights: WeightRecord[]) {
  return weights
    .filter((w) => w.animalId === animalId)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
