import type { StateCreator } from "zustand";
import type { FarmState } from "./index.ts";
import type { HealthEvent, HealthEventType, SyncStatus } from "../types.ts";
import { trimSynced } from "./trim.ts";
import { defaultStatus, uid } from "./uid.ts";

export const HEALTH_EVENTS_MAX = 200;

export interface AddHealthEventInput {
  animalId: string;
  type: HealthEventType;
  note: string;
}

export interface HealthSlice {
  healthEvents: HealthEvent[];
  addHealthEvent: (input: AddHealthEventInput) => HealthEvent;
}

export const createHealthSlice: StateCreator<FarmState, [], [], HealthSlice> = (
  set,
  get,
) => ({
  healthEvents: [],
  addHealthEvent: (input) => {
    const who =
      get().role === "production" ? "Resp. production" : "Opérateur terrain";
    const event: HealthEvent = {
      id: uid("he"),
      animalId: input.animalId,
      type: input.type,
      at: new Date().toISOString(),
      by: who,
      note: input.note,
      syncStatus: defaultStatus(get().network) as SyncStatus,
    };
    set((s) => ({
      healthEvents: trimSynced(
        [event, ...s.healthEvents],
        HEALTH_EVENTS_MAX,
      ),
    }));
    return event;
  },
});