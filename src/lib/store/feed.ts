import type { StateCreator } from "zustand";
import type { FarmState } from "./index.ts";
import { defaultStatus, uid } from "./uid.ts";
import { EVENTS_MAX, trimSynced } from "./trim.ts";

export interface FeedSlice {
  setFeedAvailable: (id: string, available: boolean) => void;
  adjustFeedStock: (id: string, deltaKg: number) => void;
}

export const createFeedSlice: StateCreator<FarmState, [], [], FeedSlice> = (
  set,
  get,
) => ({
  setFeedAvailable: (id, available) => {
    const lot = get().feed.find((f) => f.id === id);
    set((s) => ({
      feed: s.feed.map((f) => (f.id === id ? { ...f, available } : f)),
      events: trimSynced(
        [
          {
            id: uid("ev"),
            type: "saisie",
            animalId: null,
            at: new Date().toISOString(),
            label: available
              ? `Lot disponible · ${lot?.name ?? id}`
              : `Lot indisponible · ${lot?.name ?? id}`,
            detail: "Contexte fourrager mis à jour pour le moteur",
            syncStatus: defaultStatus(s.network),
          },
          ...s.events,
        ],
        EVENTS_MAX,
      ),
    }));
  },
  adjustFeedStock: (id, deltaKg) => {
    if (deltaKg === 0) return;
    const lot = get().feed.find((f) => f.id === id);
    set((s) => ({
      feed: s.feed.map((f) =>
        f.id === id ? { ...f, stockKg: Math.max(0, f.stockKg + deltaKg) } : f,
      ),
      events: trimSynced(
        [
          {
            id: uid("ev"),
            type: "saisie",
            animalId: null,
            at: new Date().toISOString(),
            label: `Stock ajusté · ${lot?.name ?? id} (${deltaKg > 0 ? "+" : ""}${deltaKg} kg)`,
            detail: "Unité fourragère : stock manuel corrigé pour le moteur",
            syncStatus: defaultStatus(s.network),
          },
          ...s.events,
        ],
        EVENTS_MAX,
      ),
    }));
  },
});