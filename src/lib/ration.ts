import { latestRecByAnimal } from "./kpis.ts";
import { concentratePrice, foragePrice } from "./feed.ts";
import type { Animal, FeedLot, NutritionRec } from "./types.ts";

export interface RationRow {
  animal: Animal;
  rec: NutritionRec | null;
  forageKg: number;
  concentrateKg: number;
  mineralG: number;
  waterL: number;
  cost: number;
  blocked: boolean;
  approved: boolean;
  served: boolean;
}

export interface PenRationGroup {
  pen: string;
  rows: RationRow[];
  forageKg: number;
  concentrateKg: number;
  cost: number;
  blocked: number;
  ready: number;
  served: number;
}

export interface RationSheet {
  groups: PenRationGroup[];
  forageKg: number;
  concentrateKg: number;
  mineralG: number;
  waterL: number;
  cost: number;
  covered: number;
  blocked: number;
  ready: number;
  served: number;
  total: number;
}

export function canServe(rec: NutritionRec | null | undefined): {
  ok: boolean;
  reason?: string;
} {
  if (!rec) return { ok: false, reason: "aucune ration" };
  if (!rec.ration) return { ok: false, reason: "refus moteur" };
  if (!rec.approvedBy) return { ok: false, reason: "revue humaine requise" };
  if (rec.servedAt) return { ok: false, reason: "déjà distribuée" };
  return { ok: true };
}

export function buildRationSheet(
  animals: Animal[],
  recs: NutritionRec[],
  feed: FeedLot[],
): RationSheet {
  const latest = latestRecByAnimal(recs);
  const foragePricePerKg = foragePrice(feed);
  const concPricePerKg = concentratePrice(feed);

  const active = animals.filter((a) => a.status === "actif");
  const byPen = new Map<string, RationRow[]>();

  for (const animal of active) {
    const rec = latest.get(animal.id) ?? null;
    const ration = rec?.ration ?? null;
    const forageKg = ration?.forageKg ?? 0;
    const concentrateKg = ration?.concentrateKg ?? 0;
    const row: RationRow = {
      animal,
      rec,
      forageKg,
      concentrateKg,
      mineralG: ration?.mineralG ?? 0,
      waterL: ration?.waterL ?? 0,
      cost: forageKg * foragePricePerKg + concentrateKg * concPricePerKg,
      blocked: !ration,
      approved: Boolean(rec?.approvedBy),
      served: Boolean(rec?.servedAt),
    };
    const list = byPen.get(animal.pen) ?? [];
    list.push(row);
    byPen.set(animal.pen, list);
  }

  const groups: PenRationGroup[] = [...byPen.entries()]
    .map(([pen, rows]) => ({
      pen,
      rows: rows.sort((a, b) => a.animal.code.localeCompare(b.animal.code)),
      forageKg: rows.reduce((s, r) => s + r.forageKg, 0),
      concentrateKg: rows.reduce((s, r) => s + r.concentrateKg, 0),
      cost: rows.reduce((s, r) => s + r.cost, 0),
      blocked: rows.filter((r) => r.blocked).length,
      ready: rows.filter((r) => r.approved && !r.served && !r.blocked).length,
      served: rows.filter((r) => r.served).length,
    }))
    .sort((a, b) => a.pen.localeCompare(b.pen));

  return {
    groups,
    forageKg: groups.reduce((s, g) => s + g.forageKg, 0),
    concentrateKg: groups.reduce((s, g) => s + g.concentrateKg, 0),
    mineralG: groups.reduce(
      (s, g) => s + g.rows.reduce((x, r) => x + r.mineralG, 0),
      0,
    ),
    waterL: groups.reduce(
      (s, g) => s + g.rows.reduce((x, r) => x + r.waterL, 0),
      0,
    ),
    cost: groups.reduce((s, g) => s + g.cost, 0),
    covered: active.filter((a) => latest.get(a.id)?.ration).length,
    blocked: active.filter((a) => !latest.get(a.id)?.ration).length,
    ready: groups.reduce((s, g) => s + g.ready, 0),
    served: groups.reduce((s, g) => s + g.served, 0),
    total: active.length,
  };
}
