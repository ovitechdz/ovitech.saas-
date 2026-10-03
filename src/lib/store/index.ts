import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { indexedDbStorage } from "../indexed-db-storage.ts";
import type {
  Animal,
  EnergySnapshot,
  ExpertSignoff,
  FarmEvent,
  FeedLot,
  HealthEvent,
  KpiPoint,
  NetworkState,
  NutritionRec,
  Role,
  SyncStatus,
  WeightRecord,
} from "../types.ts";
import { createAnimalSlice, type AnimalSlice } from "./animals.ts";
import { createCoreSlice, type CoreSlice } from "./core.ts";
import { createEngineSlice, type EngineSlice } from "./engine.ts";
import { createFeedSlice, type FeedSlice } from "./feed.ts";
import { createHealthSlice, type HealthSlice } from "./health.ts";
import { seedState } from "./seed-state.ts";
import { createSignoffSlice, type SignoffSlice } from "./signoffs.ts";
import { createSyncSlice, type SyncSlice } from "./sync.ts";

/** Données du store (source unique : seedState). Les actions vivent dans les
 *  slices (animals/core/engine/feed/signoffs/sync) — ce fichier ne fait que composer. */
export interface FarmData {
  role: Role;
  network: NetworkState;
  currentFarmId: string;
  animals: Animal[];
  events: FarmEvent[];
  healthEvents: HealthEvent[];
  recs: NutritionRec[];
  feed: FeedLot[];
  energy: EnergySnapshot;
  kpiSeries: KpiPoint[];
  weights: WeightRecord[];
  signoffs: ExpertSignoff[];
  lastSyncedAt: string | null;
  failNextSync: boolean;
}

export type FarmState = FarmData &
  AnimalSlice &
  CoreSlice &
  EngineSlice &
  FeedSlice &
  HealthSlice &
  SignoffSlice &
  SyncSlice & {
    resetDemo: () => void;
    setCurrentFarmId: (farmId: string) => void;
  };
export const useFarmStore = create<FarmState>()(
  persist(
    (set, get, api) => ({
      ...seedState(),
      ...createCoreSlice(set, get, api),
      ...createAnimalSlice(set, get, api),
      ...createFeedSlice(set, get, api),
      ...createEngineSlice(set, get, api),
      ...createSyncSlice(set, get, api),
      ...createSignoffSlice(set, get, api),
      ...createHealthSlice(set, get, api),
      setCurrentFarmId: (farmId) => set({ currentFarmId: farmId }),
      resetDemo: () => set({ ...seedState() }),
    }),
    {
      name: "ovitech-farm-v5",
      storage: createJSONStorage(() => indexedDbStorage()),
      skipHydration: true,
      version: 3,
      migrate: (persisted, _version) => {
        const p = persisted as Partial<FarmData> | undefined;
        const arrays: Array<keyof FarmData> = [
          "animals",
          "events",
          "healthEvents",
          "recs",
          "feed",
          "energy",
          "kpiSeries",
          "weights",
          "signoffs",
        ];
        const complete =
          p !== null &&
          typeof p === "object" &&
          arrays.every((k) => Array.isArray(p[k]));
        if (!complete) return seedState();
        return {
          ...seedState(),
          ...(persisted as FarmData),
        };
      },
      partialize: (s) => ({
        role: s.role,
        network: s.network,
        animals: s.animals,
        events: s.events,
        healthEvents: s.healthEvents,
        recs: s.recs,
        feed: s.feed,
        energy: s.energy,
        kpiSeries: s.kpiSeries,
        weights: s.weights,
        signoffs: s.signoffs,
        currentFarmId: s.currentFarmId,
        lastSyncedAt: s.lastSyncedAt,
        failNextSync: s.failNextSync,
      }),
    },
  ),
);

export function resetStoreForSsr() {
  useFarmStore.setState(seedState());
}

export function pendingCount(
  s: Pick<FarmState, "events" | "healthEvents" | "recs" | "weights">,
) {
  const open = (st: SyncStatus) =>
    st === "local" ||
    st === "pending" ||
    st === "failed" ||
    st === "conflict" ||
    st === "syncing";
  return (
    s.events.filter((e) => open(e.syncStatus)).length +
    s.healthEvents.filter((h) => open(h.syncStatus)).length +
    s.recs.filter((r) => open(r.syncStatus)).length +
    s.weights.filter((w) => open(w.syncStatus)).length
  );
}

export { adgFromHistory, nextAnimalCode } from "./animals.ts";
export type { ScanOutcome } from "./animals.ts";
export { trimSynced } from "./trim.ts";

