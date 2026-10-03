import type { SyncStatus } from "../types.ts";

/** Changement volontaire de périmètre : le sync serveur n'existe pas encore,
 *  donc on borne localement les tableaux d'événements pour éviter une
 *  croissance illimitée d'IndexedDB. On ne purge JAMAIS un élément non
 *  synchronisé (local/pending/failed/conflict/syncing). */
export const EVENTS_MAX = 400;
export const RECS_MAX = 200;
export const WEIGHTS_MAX = 200;

type SyncRow = { id: string; syncStatus: SyncStatus; at?: string };

/** Liste au plus `max` éléments : on retire d'abord les plus anciens éléments
 *  déjà `synced`. Ne supprime jamais un élément en attente. */
export function trimSynced<T extends SyncRow>(list: T[], max: number): T[] {
  if (list.length <= max) return list;
  const pending = list.filter((x) => x.syncStatus !== "synced");
  const synced = list
    .filter((x) => x.syncStatus === "synced")
    .sort(
      (a, b) =>
        new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime(),
    );
  const roof = Math.max(max - pending.length, 0);
  if (synced.length <= roof) return list;
  const dropped = new Set(synced.slice(roof).map((x) => x.id));
  return list.filter((x) => !dropped.has(x.id));
}