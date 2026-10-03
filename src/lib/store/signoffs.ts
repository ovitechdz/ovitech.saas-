import type { StateCreator } from "zustand";
import type { FarmState } from "./index.ts";
import type { ExpertSignoff } from "../types.ts";
import { defaultStatus, uid } from "./uid.ts";
import { EVENTS_MAX, trimSynced } from "./trim.ts";

export interface SignoffSlice {
  signProtocol: (input: {
    name: string;
    specialty: ExpertSignoff["specialty"];
    protocol: string;
    notes: string;
    passed: number;
    total: number;
    caseIds: string[];
  }) => ExpertSignoff;
}

export const createSignoffSlice: StateCreator<FarmState, [], [], SignoffSlice> = (
  set,
  get,
) => ({
  signProtocol: (input) => {
    const signoff: ExpertSignoff = {
      id: uid("sig"),
      name: input.name.trim(),
      specialty: input.specialty,
      signedAt: new Date().toISOString(),
      protocol: input.protocol,
      notes: input.notes.trim(),
      engineVersion: "DDNE-REF-0.9",
      passed: input.passed,
      total: input.total,
      caseIds: input.caseIds,
    };
    set((s) => ({
      signoffs: [signoff, ...s.signoffs],
      events: trimSynced(
        [
          {
            id: uid("ev"),
            type: "saisie",
            animalId: null,
            at: signoff.signedAt,
            label: `Protocole signé · ${signoff.name}`,
            detail: `${signoff.specialty} · ${signoff.passed}/${signoff.total} cas · ${signoff.engineVersion}`,
            syncStatus: defaultStatus(get().network),
          },
          ...s.events,
        ],
        EVENTS_MAX,
      ),
    }));
    return signoff;
  },
});