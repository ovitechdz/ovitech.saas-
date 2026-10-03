/**
 * Sauvegarde / restauration complète de la ferme — fichier JSON portable
 * (offline-first, sans serveur). Sérialise exactement l'état persisté
 * (`partialize` du store : les 13 clés de `FarmData`), signé par un checksum
 * SHA-256 sur l'état canonique, versionné pour évolution de format.
 *
 * Couche : client (page `/sync`), pur et testé en node (`src/lib/backup.test.ts`).
 * Aucune dépendance navigateur à l'import (TextEncoder) ; `crypto.subtle`
 * existant dans les deux runtimes.
 */
import type { FarmData, FarmState } from "./store/index.ts";
import { ENGINE_VERSION } from "./types.ts";

export const BACKUP_FORMAT = "ovitech-backup";
export const BACKUP_VERSION = 1;

/** Clés persistées (miroir du `partialize` du store — ne pas diverger). */
const PERSISTED_KEYS = [
  "role",
  "network",
  "animals",
  "events",
  "healthEvents",
  "recs",
  "feed",
  "energy",
  "kpiSeries",
  "weights",
  "signoffs",
  "lastSyncedAt",
  "currentFarmId",
  "failNextSync",
] as const;

const ARRAY_KEYS = [
  "animals",
  "events",
  "healthEvents",
  "recs",
  "feed",
  "kpiSeries",
  "weights",
  "signoffs",
] as const satisfies readonly (keyof FarmData)[];

/** Bornes de sécurité sur les volumes importés (fichier tiers potentiel). */
const MAX_ARRAY_LENGTH = 50_000;
const MAX_TOTAL_LENGTH = 200_000;

export type ParseBackupResult =
  | { ok: true; data: FarmData }
  | { ok: false; code: string; error: string };

/** Extrait l'état persisté (les actions et l'uid runtime sont exclus). */
export function pickFarmData(s: FarmState): FarmData {
  return {
    role: s.role,
    network: s.network,
    currentFarmId: s.currentFarmId,
    animals: s.animals,
    events: s.events,
    healthEvents: s.healthEvents,
    recs: s.recs,
    feed: s.feed,
    energy: s.energy,
    kpiSeries: s.kpiSeries,
    weights: s.weights,
    signoffs: s.signoffs,
    lastSyncedAt: s.lastSyncedAt,
    failNextSync: s.failNextSync,
  };
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

function canonical(state: FarmData): string {
  return JSON.stringify(state);
}

export interface BackupPayload {
  format: string;
  version: number;
  exportedAt: string;
  engine: string;
  checksum: string;
  state: FarmData;
}

export async function buildBackup(state: FarmData): Promise<string> {
  const canonicalState = canonical(state);
  const payload: BackupPayload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    engine: ENGINE_VERSION,
    checksum: await sha256Hex(canonicalState),
    state,
  };
  return JSON.stringify(payload, null, 2);
}

function isFarmDataCandidate(value: unknown): value is FarmData {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.role !== "string") return false;
  if (record.network !== "online" && record.network !== "offline") return false;
  if (record.energy === null || typeof record.energy !== "object") return false;
  for (const key of ARRAY_KEYS) {
    if (!Array.isArray(record[key])) return false;
    const len = (record[key] as unknown[]).length;
    if (len > MAX_ARRAY_LENGTH) return false;
  }
  const total = ARRAY_KEYS.reduce(
    (sum, key) => sum + (record[key] as unknown[]).length,
    0,
  );
  if (total > MAX_TOTAL_LENGTH) return false;
  if (record.lastSyncedAt !== null && typeof record.lastSyncedAt !== "string") {
    return false;
  }
  if (typeof record.failNextSync !== "boolean") return false;
  for (const key of PERSISTED_KEYS) {
    if (!(key in record)) return false;
  }
  return true;
}

/** Analyse et valide un fichier de sauvegarde (format, version, checksum, structure). */
export async function parseBackup(raw: string): Promise<ParseBackupResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, code: "json", error: "JSON invalide" };
  }
  if (parsed === null || typeof parsed !== "object") {
    return { ok: false, code: "shape", error: "structure invalide" };
  }
  const p = parsed as Record<string, unknown>;
  if (p.format !== BACKUP_FORMAT) {
    return { ok: false, code: "format", error: `format inattendu: ${String(p.format)}` };
  }
  if (p.version !== BACKUP_VERSION) {
    return {
      ok: false,
      code: "version",
      error: `version de fichier ${String(p.version)} non prise en charge (attendu ${BACKUP_VERSION})`,
    };
  }
  if (!isFarmDataCandidate(p.state)) {
    return { ok: false, code: "structure", error: "données de ferme invalides" };
  }
  if (typeof p.checksum !== "string" || p.checksum.length === 0) {
    return { ok: false, code: "checksum", error: "checksum absent" };
  }
  const expected = await sha256Hex(canonical(p.state));
  if (expected !== p.checksum) {
    return {
      ok: false,
      code: "checksum",
      error: "intégrité du fichier non vérifiée (checksum différent)",
    };
  }
  return { ok: true, data: p.state as FarmData };
}