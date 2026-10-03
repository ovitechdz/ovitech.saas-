const outboxAnimal = async (animal: any, op: any, farmId: string, mutationId?: string) => {
  const m = mutationId || uid("mut");
  const rec: any = {id: uid("obx"), mutation_id: m, entity_type: "animal" as const, entity_id: animal.id, operation: op, payload: animal, farm_id: farmId, created_at: new Date().toISOString(), attempt_count: 0, status: "PENDING" as const, last_error: null};
  try { await addOutbox(rec as any); } catch (e) { console.error("[ovitech] outbox add failed", e); }
  return m;
};

import type { StateCreator } from "zustand";
import type { FarmState } from "./index.ts";
import { DAY_MS, round3 } from "../numeric.ts";
import type { Animal, FarmEvent, NewAnimalInput, WeightRecord } from "../types.ts";
import { EVENTS_MAX, WEIGHTS_MAX, trimSynced } from "./trim.ts";
import { defaultStatus, uid } from './uid.ts';
import { MAX_WEIGHT_KG } from '../validation.ts';
import { addOutbox } from '../indexed-db-storage.ts';

export function isWeight(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n) && n > 0 && n <= MAX_WEIGHT_KG;
}

export function isBcs(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n) && n >= 1 && n <= 5;
}

const NOTES_LIMIT = 500;

export type ScanOutcome =
  | { kind: "ok"; animal: Animal }
  | { kind: "unknown"; query: string }
  | { kind: "unreadable"; reason: string };

export function adgFromHistory(records: WeightRecord[], animalId: string): number | null {
  const list = records
    .filter((w) => w.animalId === animalId)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  if (list.length < 2) return null;
  const n0 = list[0];
  const n1 = list[1];
  if (n0 === undefined || n1 === undefined) return null;
  const days = (new Date(n0.at).getTime() - new Date(n1.at).getTime()) / DAY_MS;
  if (days < 0.5) return null;
  return round3((n0.kg - n1.kg) / days);
}

export function nextAnimalCode(animals: Animal[]): string {
  const nums = animals
    .map((a) => Number.parseInt(a.code.replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n));
  const next = Math.max(2400, ...nums, 2400) + 1;
  return `OV-${next}`;
}

export interface AnimalSlice {
  resolveScan: (query: string) => ScanOutcome;
  recordScan: (animal: Animal) => FarmEvent;
  logScanFailure: (
    kind: "unknown" | "unreadable",
    query: string,
    reason?: string,
  ) => FarmEvent;
  captureAnimal: (
    animalId: string,
    patch: { weightKg?: number | null; bcs?: number | null; notes?: string },
  ) => Animal | undefined;
  registerAnimal: (input: NewAnimalInput) => Animal;
  moveAnimal: (animalId: string, pen: string) => Animal | undefined;
}

export const createAnimalSlice: StateCreator<FarmState, [], [], AnimalSlice> = (
  set,
  get,
) => ({

  resolveScan: (query) => {
    const q = query.trim().toUpperCase();
    if (!q || q.includes("?") || q === "ERR" || q === "ERROR") {
      return { kind: "unreadable", reason: "Signal RFID illisible ou vide" };
    }
    const animal = get().animals.find(
      (a) =>
        a.rfid.toUpperCase() === q ||
        a.code.toUpperCase() === q ||
        a.rfid.replace(/-/g, "") === q.replace(/-/g, "") ||
        a.code.replace("OV-", "") === q.replace("OV-", "") ||
        a.rfid.endsWith(q) ||
        a.code.endsWith(q),
    );
    if (!animal) return { kind: "unknown", query };
    return { kind: "ok", animal };
  },
  recordScan: (animal) => {
    const ev: FarmEvent = {
      id: uid("ev"),
      type: "scan",
      animalId: animal.id,
      at: new Date().toISOString(),
      label: `Scan RFID ${animal.code}`,
      detail: `Identité confirmée · ${animal.pen}`,
      syncStatus: defaultStatus(get().network),
    };
    set((s) => ({
      events: trimSynced([ev, ...s.events], EVENTS_MAX),
      animals: s.animals.map((a) =>
        a.id === animal.id ? { ...a, lastScanAt: ev.at } : a,
      ),
    }));
    return ev;
  },
  logScanFailure: (kind, query, reason) => {
    const ev: FarmEvent = {
      id: uid("ev"),
      type: "erreur",
      animalId: null,
      at: new Date().toISOString(),
      label: kind === "unknown" ? "RFID inconnu" : "RFID illisible",
      detail: reason ?? `Requête « ${query} » — aucun animal rattaché`,
      syncStatus: defaultStatus(get().network),
      error: kind === "unreadable" ? "Signal RFID illisible" : "Identité absente du registre",
    };
    set((s) => ({ events: trimSynced([ev, ...s.events], EVENTS_MAX) }));
    return ev;
  },
  captureAnimal: (animalId, patch) => {
    const weight = isWeight(patch.weightKg) ? patch.weightKg : null;
    const bcs = isBcs(patch.bcs) ? patch.bcs : null;
    const notes =
      typeof patch.notes === "string"
        ? patch.notes.trim().slice(0, NOTES_LIMIT)
        : null;
    if (weight == null && bcs == null && notes == null) {
      return get().animals.find((a) => a.id === animalId);
    }
    let next: Animal | undefined;
    const now = new Date().toISOString();
    const ev = {
      id: uid("ev"),
      type: "saisie" as const,
      animalId,
      at: now,
      label: "Saisie terrain",
      detail:
        [
          weight != null ? `${weight} kg` : null,
          bcs != null ? `NEC ${bcs}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Mise à jour",
      syncStatus: defaultStatus(get().network),
    };
    set((s) => {
      let weights = s.weights;
      const animals = s.animals.map((a) => {
        if (a.id !== animalId) return a;
        next = {
          ...a,
          ...(weight != null ? { weightKg: weight } : {}),
          ...(bcs != null ? { bcs } : {}),
          ...(notes != null ? { notes } : {}),
        };
        return next;
      });
      if (weight != null) {
        weights = [
          {
            id: uid("wt"),
            animalId,
            kg: weight,
            at: now,
            syncStatus: defaultStatus(s.network),
            source: "terrain",
          },
          ...weights,
        ];
        const adg = adgFromHistory(weights, animalId);
        animals.forEach((a, i) => {
          if (a.id === animalId) {
            animals[i] = { ...a, adgKg: adg };
            next = animals[i];
          }
        });
      }
      return {
        animals,
        weights: trimSynced(weights, WEIGHTS_MAX),
        events: trimSynced([ev, ...s.events], EVENTS_MAX),
      };
    });
    if (next) {
      const farmId = get().currentFarmId || "farm-1";
      void outboxAnimal(next, "update", farmId);
    }
    return next;
  },
  registerAnimal: (input) => {
    const rfid = input.rfid.trim().toUpperCase();
    const code = input.code.trim().toUpperCase();
    if (!rfid || !code) {
      throw new Error("RFID et code requis");
    }
    if (input.weightKg != null && !isWeight(input.weightKg)) {
      throw new Error("Poids vif invalide (0–" + MAX_WEIGHT_KG + " kg)");
    }
    if (input.bcs != null && !isBcs(input.bcs)) {
      throw new Error("Note d'état corporel invalide (1–5)");
    }
    if (input.birthDate && new Date(input.birthDate).getTime() > Date.now()) {
      throw new Error("Date de naissance dans le futur");
    }
    const taken = get().animals.some(
      (a) => a.rfid.toUpperCase() === rfid || a.code.toUpperCase() === code,
    );
    if (taken) {
      throw new Error("RFID ou code déjà attribué");
    }
    const now = new Date().toISOString();
    const animal: Animal = {
      id: uid("an"),
      rfid,
      code,
      sex: input.sex,
      breed: input.breed,
      birthDate: input.birthDate,
      weightKg: input.weightKg,
      bcs: input.bcs,
      stage: input.stage,
      pen: input.pen,
      status: "actif",
      lastScanAt: now,
      adgKg: null,
      notes: input.notes ?? "",
    };
    const ev = {
      id: uid("ev"),
      type: "identite" as const,
      animalId: animal.id,
      at: now,
      label: `Identité créée ${animal.code}`,
      detail: `RFID ${animal.rfid} · ${animal.pen}`,
      syncStatus: defaultStatus(get().network),
    };
    const weightRow: WeightRecord | null =
      input.weightKg != null && input.weightKg > 0
        ? {
            id: uid("wt"),
            animalId: animal.id,
            kg: input.weightKg,
            at: now,
            syncStatus: defaultStatus(get().network),
            source: "terrain",
          }
        : null;
    set((s) => ({
      animals: [animal, ...s.animals],
      events: trimSynced([ev, ...s.events], EVENTS_MAX),
      weights: weightRow ? trimSynced([weightRow, ...s.weights], WEIGHTS_MAX) : s.weights,
    }));
    const farmId = get().currentFarmId || "farm-1";
    void outboxAnimal(animal, "create", farmId);
    return animal;
  },
  moveAnimal: (animalId, pen) => {
    const animal = get().animals.find((a) => a.id === animalId);
    if (!animal || animal.pen === pen) return animal;
    const now = new Date().toISOString();
    const next = { ...animal, pen };
    set((s) => ({
      animals: s.animals.map((a) => (a.id === animalId ? next : a)),
      events: trimSynced(
        [
          {
            id: uid("ev"),
            type: "transfert",
            animalId,
            at: now,
            label: `Transfert ${animal.code}`,
            detail: `${animal.pen} → ${pen}`,
            syncStatus: defaultStatus(s.network),
          },
          ...s.events,
        ],
        EVENTS_MAX,
      ),
    }));
    const farmId = get().currentFarmId || 'farm-1';
    void outboxAnimal(next, 'update', farmId);
    return next;
  },
});






