import type { StateCreator } from 'zustand';
import type { SyncStatus } from '../types.ts';
import type { FarmState } from './index.ts';

export interface SyncSlice {
  syncAll: () => Promise<{ synced: number; failed: number; conflicts: number }>;
  retryEvent: (id: string) => void;
  markConflict: (id: string) => void;
  resolveConflict: (id: string, keep: 'local' | 'drop') => void;
}

export const createSyncSlice: StateCreator<FarmState, [], [], SyncSlice> = (set, get) => {
  let syncInFlight = false;
  // Seuls `local`/`pending` sont poussés automatiquement. `failed` exige
  // `retryEvent` et `conflict` exige `resolveConflict` : les écraser en
  // `synced` perdrait la résolution explicite de l'utilisateur et viderait la
  // file d'erreurs sans qu'aucune action ne l'ait décidé.
  const syncable = ['local', 'pending'] as const;
  const isSyncable = (st: SyncStatus) => (syncable as readonly SyncStatus[]).includes(st);
  const countByStatus = (state: FarmState, status: SyncStatus) =>
    state.events.filter((e) => e.syncStatus === status).length +
    state.healthEvents.filter((h) => h.syncStatus === status).length +
    state.recs.filter((r) => r.syncStatus === status).length +
    state.weights.filter((w) => w.syncStatus === status).length;
  return {
    syncAll: async () => {
      if (syncInFlight) return { synced: 0, failed: 0, conflicts: 0 };
      if (get().network === 'offline') {
        return { synced: 0, failed: 0, conflicts: 0 };
      }
      const fail = get().failNextSync;
      if (fail) {
        set({ failNextSync: false });
        return { synced: 0, failed: 0, conflicts: 0 };
      }
      syncInFlight = true;
      try {
        const state = get();
        const pending = [
          ...state.events.filter((e) => isSyncable(e.syncStatus)),
          ...state.healthEvents.filter((h) => isSyncable(h.syncStatus)),
          ...state.recs.filter((r) => isSyncable(r.syncStatus)),
          ...state.weights.filter((w) => isSyncable(w.syncStatus)),
        ];
        const failed = countByStatus(state, 'failed');
        const conflicts = countByStatus(state, 'conflict');
        if (pending.length === 0) {
          return { synced: 0, failed, conflicts };
        }
        set((s) => ({
          events: s.events.map((e) => (isSyncable(e.syncStatus) ? { ...e, syncStatus: 'synced', error: undefined } : e)),
          healthEvents: s.healthEvents.map((h) => (isSyncable(h.syncStatus) ? { ...h, syncStatus: 'synced' } : h)),
          recs: s.recs.map((r) => (isSyncable(r.syncStatus) ? { ...r, syncStatus: 'synced' } as any : r)),
          weights: s.weights.map((w) => (isSyncable(w.syncStatus) ? { ...w, syncStatus: 'synced' } : w)),
          lastSyncedAt: new Date().toISOString(),
        } as any));
        return { synced: pending.length, failed, conflicts };
      } finally {
        syncInFlight = false;
      }
    },
    retryEvent: (id) => {
      set((s) => ({
        events: s.events.map((e) => (e.id === id ? { ...e, syncStatus: 'pending', error: undefined } : e)),
        healthEvents: s.healthEvents.map((h) => (h.id === id ? { ...h, syncStatus: 'pending' } : h)),
        recs: s.recs.map((r) => (r.id === id ? { ...r, syncStatus: 'pending' } : r)),
        weights: s.weights.map((w) => (w.id === id ? { ...w, syncStatus: 'pending' } : w)),
      }));
    },
    markConflict: (id) => {
      set((s) => ({
        events: s.events.map((e) => (e.id === id ? { ...e, syncStatus: 'conflict', error: 'Conflit detecte' } : e)),
        healthEvents: s.healthEvents.map((h) => (h.id === id ? { ...h, syncStatus: 'conflict' } : h)),
        recs: s.recs.map((r) => (r.id === id ? { ...r, syncStatus: 'conflict' } : r)),
        weights: s.weights.map((w) => (w.id === id ? { ...w, syncStatus: 'conflict' } : w)),
      }));
    },
    resolveConflict: (id, keep) => {
      set((s) => {
        if (keep === 'drop') {
          return {
            events: s.events.filter((e) => e.id !== id),
            healthEvents: s.healthEvents.filter((h) => h.id !== id),
            recs: s.recs.filter((r) => r.id !== id),
            weights: s.weights.filter((w) => w.id !== id),
          };
        }
        const suffix = ' · conservation locale';
        return {
          events: s.events.map((e) => (e.id === id ? { ...e, syncStatus: 'pending', error: undefined, detail: e.detail.includes('conservation locale') ? e.detail : `${e.detail}${suffix}` } : e)),
          healthEvents: s.healthEvents.map((h) => (h.id === id ? { ...h, syncStatus: 'pending', note: h.note.includes('conservation locale') ? h.note : `${h.note}${suffix}` } : h)),
          recs: s.recs.map((r) => {
            if (r.id !== id) return r;
            const recNotes = r.notes.includes('conservation locale') ? r.notes : [...r.notes, 'conservation locale'];
            return { ...r, syncStatus: 'pending', notes: recNotes } as any;
          }),
          weights: s.weights.map((w) => (w.id === id ? { ...w, syncStatus: 'pending', source: w.source.includes('conservation locale') ? w.source : `${w.source}${suffix}` } : w)),
        } as any;
      });
    },
  };
};