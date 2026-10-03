import type { StateCreator } from "zustand";
import type { FarmState } from "./index.ts";
import { deductFeed, feedCovers } from "../feed-stock.ts";
import { computeRecommendation } from "../nutrition-engine.ts";
import { canServe } from "../ration.ts";
import type { NutritionRec } from "../types.ts";
import { EVENTS_MAX, RECS_MAX, trimSynced } from "./trim.ts";
import { defaultStatus, uid } from "./uid.ts";

export interface EngineSlice {
  runEngine: (animalId: string) => NutritionRec;
  runEngineForPen: (pen: string) => NutritionRec[];
  approveRec: (recId: string) => void;
  serveRec: (recId: string) => { ok: boolean; reason?: string };
  servePen: (pen: string) => { served: number; skipped: number };
}

/** Transition pure d'une distribution : marque la rec servie, débite les
 *  stocks, écrit l'événement. Ne lit rien d'autre du store — testable. */
export function serveTransition(
  s: Pick<FarmState, "recs" | "feed" | "events" | "network">,
  opts: { rec: NutritionRec; now: string; who: string; code: string },
): { recs: NutritionRec[]; feed: FarmState["feed"]; events: FarmState["events"] } {
  const ration = opts.rec.ration!;
  return {
    recs: trimSynced(
      s.recs.map((r) =>
        r.id === opts.rec.id ? { ...r, servedAt: opts.now, servedBy: opts.who } : r,
      ),
      RECS_MAX,
    ),
    feed: deductFeed(s.feed, ration.forageKg, ration.concentrateKg),
    events: trimSynced(
      [
        {
          id: uid("ev"),
          type: "distribution",
          animalId: opts.rec.animalId,
          at: opts.now,
          label: `Ration distribuée ${opts.code}`,
          detail: `${ration.forageKg} kg fourrage · ${ration.concentrateKg} kg conc. · ${opts.who}`,
          syncStatus: defaultStatus(s.network),
        },
        ...s.events,
      ],
      EVENTS_MAX,
    ),
  };
}

/** Transition atomique d'un lot de distributions : un seul tuple `set()`,
 *  un seul débit de stock agrégé (impossible de laisser un état partiel).
 *  Les recs référencées doivent déjà être passées par `feedCovers`. */
export function serveBatchTransition(
  s: Pick<FarmState, "recs" | "feed" | "events" | "network">,
  opts: {
    recs: NutritionRec[];
    now: string;
    who: string;
    codes: Map<string, string>;
  },
): { recs: NutritionRec[]; feed: FarmState["feed"]; events: FarmState["events"] } {
  const ids = new Set(opts.recs.map((r) => r.id));
  const forageKg = opts.recs.reduce((t, r) => t + (r.ration?.forageKg ?? 0), 0);
  const concentrateKg = opts.recs.reduce(
    (t, r) => t + (r.ration?.concentrateKg ?? 0),
    0,
  );
  return {
    recs: trimSynced(
      s.recs.map((r) =>
        ids.has(r.id) ? { ...r, servedAt: opts.now, servedBy: opts.who } : r,
      ),
      RECS_MAX,
    ),
    feed: deductFeed(s.feed, forageKg, concentrateKg),
    events: trimSynced(
      [
        ...opts.recs.map((r) => ({
          id: uid("ev"),
          type: "distribution" as const,
          animalId: r.animalId,
          at: opts.now,
          label: `Ration distribuée ${opts.codes.get(r.animalId) ?? r.animalId}`,
          detail: `${r.ration!.forageKg} kg fourrage · ${r.ration!.concentrateKg} kg conc. · ${opts.who}`,
          syncStatus: defaultStatus(s.network),
        })),
        ...s.events,
      ],
      EVENTS_MAX,
    ),
  };
}

export const createEngineSlice: StateCreator<FarmState, [], [], EngineSlice> = (
  set,
  get,
) => ({
  runEngine: (animalId) => {
    const animal = get().animals.find((a) => a.id === animalId);
    if (!animal) {
      throw new Error("Animal introuvable pour le moteur");
    }
    const forageAvailable = get().feed.some(
      (f) => (f.kind === "fourrage" || f.kind === "hybride") && f.available && f.stockKg > 0,
    );
    const concentrateAvailable = get().feed.some(
      (f) => (f.kind === "concentre" || f.kind === "hybride") && f.available && f.stockKg > 0,
    );
    const computed = computeRecommendation(animal, {
      forageAvailable,
      concentrateAvailable,
    });
    const rec: NutritionRec = {
      ...computed,
      id: uid("rec"),
      createdAt: new Date().toISOString(),
      syncStatus: defaultStatus(get().network),
      approvedBy: null,
      servedAt: null,
      servedBy: null,
    };
    const ev = {
      id: uid("ev"),
      type: rec.ration
        ? ("recommandation" as const)
        : ("erreur" as const),
      animalId,
      at: rec.createdAt,
      label: rec.ration
        ? `Ration émise ${animal.code}`
        : `Moteur refusé ${animal.code}`,
      detail: rec.ration
        ? `${rec.engineVersion} · confiance ${rec.confidence}`
        : rec.missingInputs.join(", "),
      syncStatus: rec.syncStatus,
    };
    set((s) => ({
      recs: trimSynced([rec, ...s.recs], RECS_MAX),
      events: trimSynced([ev, ...s.events], EVENTS_MAX),
    }));
    return rec;
  },
  runEngineForPen: (pen) => {
    const ids = get()
      .animals.filter((a) => a.pen === pen && a.status === "actif")
      .map((a) => a.id);
    return ids.map((id) => get().runEngine(id));
  },
  approveRec: (recId) => {
    if (get().role !== "production") return;
    const who = "Resp. production";
    const rec = get().recs.find((r) => r.id === recId);
    if (!rec || rec.approvedBy || !rec.ration) return;
    const code = get().animals.find((a) => a.id === rec.animalId)?.code ?? rec.animalId;
    set((s) => ({
      recs: s.recs.map((r) => (r.id === recId ? { ...r, approvedBy: who } : r)),
      events: trimSynced(
        [
          {
            id: uid("ev"),
            type: "saisie",
            animalId: rec.animalId,
            at: new Date().toISOString(),
            label: `Ration revue ${code}`,
            detail: `Aide à la décision validée · ${who} — stock non débité`,
            syncStatus: defaultStatus(s.network),
          },
          ...s.events,
        ],
        EVENTS_MAX,
      ),
    }));
  },
  serveRec: (recId) => {
    const rec = get().recs.find((r) => r.id === recId);
    if (!rec) return { ok: false, reason: "aucune ration" };
    const gate = canServe(rec);
    if (!gate.ok) return { ok: false, reason: gate.reason };
    if (
      rec.ration &&
      !feedCovers(get().feed, rec.ration.forageKg, rec.ration.concentrateKg)
    ) {
      return { ok: false, reason: "stock fourrager insuffisant" };
    }
    const who = get().role === "field" ? "Opérateur terrain" : "Resp. production";
    const code = get().animals.find((a) => a.id === rec.animalId)?.code ?? rec.animalId;
    const now = new Date().toISOString();
    set((s) => serveTransition(s, { rec, now, who, code }));
    return { ok: true };
  },
  servePen: (pen) => {
    const ids = get()
      .animals.filter((a) => a.pen === pen && a.status === "actif")
      .map((a) => a.id);
    const latest = new Map<string, NutritionRec>();
    for (const r of get().recs) {
      if (!ids.includes(r.animalId)) continue;
      const prev = latest.get(r.animalId);
      if (!prev || prev.createdAt < r.createdAt) latest.set(r.animalId, r);
    }
    const who = get().role === "field" ? "Opérateur terrain" : "Resp. production";
    const now = new Date().toISOString();
    const codes = new Map(
      get().animals.filter((a) => ids.includes(a.id)).map((a) => [a.id, a.code] as const),
    );
    let simulated = get().feed;
    const toServe: NutritionRec[] = [];
    for (const rec of latest.values()) {
      const gate = canServe(rec);
      if (!gate.ok || !rec.ration) continue;
      if (!feedCovers(simulated, rec.ration.forageKg, rec.ration.concentrateKg)) {
        continue;
      }
      simulated = deductFeed(simulated, rec.ration.forageKg, rec.ration.concentrateKg);
      toServe.push(rec);
    }
    if (toServe.length > 0) {
      set((s) => serveBatchTransition(s, { recs: toServe, now, who, codes }));
    }
    return { served: toServe.length, skipped: latest.size - toServe.length };
  },
});