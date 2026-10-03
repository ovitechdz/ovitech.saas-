import type { StateCreator } from 'zustand';
import type { FarmState } from './index.ts';

export interface SyncSlice {
  syncAll: () => Promise<{ synced: number; failed: number; conflicts: number }>;
  retryEvent: (id: string) => void;
  markConflict: (id: string) => void;
  resolveConflict: (id: string, keep: 'local' | 'drop') => void;
}

export const createSyncSlice: StateCreator<FarmState, [], [], SyncSlice> = (set, get) => {
  let syncInFlight = false;
  const openStatuses = ['local', 'pending', 'failed', 'conflict', 'syncing'] as const;
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
          ...state.events.filter((e) => openStatuses.includes(e.syncStatus as typeof openStatuses[number])),
          ...state.healthEvents.filter((h) => openStatuses.includes(h.syncStatus as typeof openStatuses[number])),
          ...state.recs.filter((r) => openStatuses.includes(r.syncStatus as typeof openStatuses[number])),
          ...state.weights.filter((w) => openStatuses.includes(w.syncStatus as typeof openStatuses[number])),
        ];
        if (pending.length === 0) {
          return { synced: 0, failed: 0, conflicts: 0 };
        }
        set((s) => ({
          events: s.events.map((e) => (openStatuses.includes(e.syncStatus as typeof openStatuses[number]) ? { ...e, syncStatus: 'synced', error: undefined } : e)),
          healthEvents: s.healthEvents.map((h) => (openStatuses.includes(h.syncStatus as typeof openStatuses[number]) ? { ...h, syncStatus: 'synced' } : h)),
          recs: s.recs.map((r) => (openStatuses.includes(r.syncStatus as typeof openStatuses[number]) ? { ...r, syncStatus: 'synced' } as any : r)),
          weights: s.weights.map((w) => (openStatuses.includes(w.syncStatus as typeof openStatuses[number]) ? { ...w, syncStatus: 'synced' } : w)),
          lastSyncedAt: new Date().toISOString(),
        } as any));
        const failed = pending.filter((it) => it.syncStatus === 'failed').length;
        const conflicts = pending.filter((it) => it.syncStatus === 'conflict').length;
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