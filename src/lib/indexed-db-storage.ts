import type { StateStorage } from 'zustand/middleware';

const LOG = '[ovitech]';
const DB_NAME = 'ovitech';
const STORE_NAME = 'persist';
const OUTBOX_STORE = 'outbox';
const DB_VERSION = 2;

export let lastPersistError: { at: string; message: string } | null = null;

export function consumePersistError(): { at: string; message: string } | null {
  const current = lastPersistError;
  lastPersistError = null;
  return current;
}

function recordPersistError(error: unknown): void {
  lastPersistError = {
    at: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const os = db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
        os.createIndex('status', 'status', { unique: false });
        os.createIndex('created_at', 'created_at', { unique: false });
        os.createIndex('entity', ['entity_type', 'entity_id'], { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function toPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function storageFromLocalStorage(): StateStorage {
  const storage = window.localStorage;
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => void storage.setItem(key, value),
    removeItem: (key) => void storage.removeItem(key),
  };
}

function localStorageValue(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function migrateFromLocalStorage(key: string): Promise<string | null> {
  const legacy = localStorageValue(key);
  if (legacy == null) return null;
  try {
    const db = await openDb();
    await toPromise(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(legacy, key));
    db.close();
    try {
      window.localStorage.removeItem(key);
    } catch {
      // The IndexedDB copy is durable; removing the legacy entry is best-effort.
    }
  } catch (error) {
    console.error(LOG + ' migration localStorage IndexedDB echouee (' + key + ')', error);
  }
  return legacy;
}

function idbStorage(): StateStorage {
  return {
    getItem: async (key) => {
      try {
        const db = await openDb();
        const value = await toPromise(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key) as IDBRequest<string | undefined>);
        db.close();
        if (typeof value === 'string') return value;
        return migrateFromLocalStorage(key);
      } catch (error) {
        console.error(LOG + ' lecture IndexedDB echouee (' + key + ')', error);
        return localStorageValue(key);
      }
    },
    setItem: async (key, value) => {
      try {
        const db = await openDb();
        await toPromise(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(value, key));
        db.close();
      } catch (error) {
        console.error(LOG + ' ecriture IndexedDB echouee (' + key + ')', error);
        recordPersistError(error);
      }
    },
    removeItem: async (key) => {
      try {
        const db = await openDb();
        await toPromise(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(key));
        db.close();
      } catch (error) {
        console.error(LOG + ' suppression IndexedDB echouee (' + key + ')', error);
        recordPersistError(error);
      }
    },
  };
}

export function indexedDbStorage(): StateStorage {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB indisponible cote serveur');
  }
  if (typeof indexedDB === 'undefined') {
    console.warn(LOG + ' IndexedDB indisponible — repli sur localStorage');
    return storageFromLocalStorage();
  }
  return idbStorage();
}

export type OutboxStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';

export interface OutboxRecord {
  id: string;
  mutation_id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload: unknown;
  farm_id: string;
  created_at: string;
  attempt_count: number;
  status: OutboxStatus;
  last_error?: string;
}

const OUTBOX_LOCAL_KEY = 'ovitech-outbox-v1';

function readOutboxFallback(): OutboxRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxRecord[]) : [];
  } catch {
    return [];
  }
}

function writeOutboxFallback(records: OutboxRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OUTBOX_LOCAL_KEY, JSON.stringify(records));
  } catch {
    // best-effort fallback; IndexedDB is the preferred durable store when available
  }
}

export async function addOutbox(record: OutboxRecord): Promise<void> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    const records = readOutboxFallback();
    const idx = records.findIndex((r) => r.id === record.id);
    if (idx >= 0) records[idx] = record;
    else records.push(record);
    writeOutboxFallback(records);
    return;
  }
  try {
    const db = await openDb();
    await toPromise(db.transaction(OUTBOX_STORE, 'readwrite').objectStore(OUTBOX_STORE).put(record));
    db.close();
  } catch (error) {
    console.error(LOG + ' ajout outbox echoue', error);
    throw error;
  }
}

export async function listOutboxByStatus(status: OutboxStatus): Promise<OutboxRecord[]> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return readOutboxFallback().filter((r) => r.status === status);
  }
  try {
    const db = await openDb();
    const req = db.transaction(OUTBOX_STORE, 'readonly').objectStore(OUTBOX_STORE).index('status').getAll(status);
    const res = await toPromise(req);
    db.close();
    return (res as OutboxRecord[]) || [];
  } catch (error) {
    console.error(LOG + ' lecture outbox echouee', error);
    return [];
  }
}

export async function updateOutbox(record: OutboxRecord): Promise<void> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    const records = readOutboxFallback();
    const idx = records.findIndex((r) => r.id === record.id);
    if (idx >= 0) records[idx] = record;
    else records.push(record);
    writeOutboxFallback(records);
    return;
  }
  try {
    const db = await openDb();
    await toPromise(db.transaction(OUTBOX_STORE, 'readwrite').objectStore(OUTBOX_STORE).put(record));
    db.close();
  } catch (error) {
    console.error(LOG + ' mise a jour outbox echouee', error);
    throw error;
  }
}

export async function deleteOutbox(id: string): Promise<void> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    const records = readOutboxFallback().filter((r) => r.id !== id);
    writeOutboxFallback(records);
    return;
  }
  try {
    const db = await openDb();
    await toPromise(db.transaction(OUTBOX_STORE, 'readwrite').objectStore(OUTBOX_STORE).delete(id));
    db.close();
  } catch (error) {
    console.error(LOG + ' suppression outbox echouee', error);
    throw error;
  }
}
