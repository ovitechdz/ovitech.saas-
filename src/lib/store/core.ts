import type { StateCreator } from "zustand";
import type { FarmState } from "./index.ts";
import type { NetworkState, Role } from "../types.ts";
import { EVENTS_MAX, trimSynced } from "./trim.ts";
import { uid } from "./uid.ts";

export interface CoreSlice {
  setRole: (role: Role) => void;
  setNetwork: (network: NetworkState) => void;
  setFailNextSync: (v: boolean) => void;
}

export const createCoreSlice: StateCreator<FarmState, [], [], CoreSlice> = (
  set,
  get,
) => ({
  setRole: (role) => set({ role }),
  setNetwork: (network) => {
    const prev = get().network;
    set({ network });
    if (network === "offline" && prev !== "offline") {
      set((s) => ({
        events: trimSynced(
          [
            {
              id: uid("ev"),
              type: "erreur",
              animalId: null,
              at: new Date().toISOString(),
              label: "Réseau coupé",
              detail: "Mode Offline First — le travail local continue",
              syncStatus: "local",
            },
            ...s.events,
          ],
          EVENTS_MAX,
        ),
      }));
    }
  },
  setFailNextSync: (v) => set({ failNextSync: v }),
});