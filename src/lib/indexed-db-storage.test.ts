import { test } from "node:test";
import assert from "node:assert/strict";
import { indexedDbStorage } from "./indexed-db-storage.ts";

const GLOBAL = globalThis as Record<string, unknown>;

type FakeRequest = {
  result: unknown;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
};

function clearGlobals() {
  delete GLOBAL.window;
  delete GLOBAL.indexedDB;
}

test("rejette côté serveur — absence de window (bascule mémoire par createJSONStorage)", () => {
  clearGlobals();
  assert.throws(() => indexedDbStorage(), /serveur/);
});

test("bascule sur localStorage quand IndexedDB est absente", () => {
  clearGlobals();
  const values = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  } as unknown as Storage;
  GLOBAL.window = { localStorage } as unknown as Window & typeof globalThis;

  const storage = indexedDbStorage();
  assert.equal(storage.getItem("a"), null);
  storage.setItem("a", "1");
  assert.equal(storage.getItem("a"), "1");
  storage.removeItem("a");
  assert.equal(storage.getItem("a"), null);
});

test("IndexedDB : écriture, lecture et suppression en aller-retour", async () => {
  clearGlobals();
  const data = new Map<string, string>();
  GLOBAL.window = {} as unknown as Window & typeof globalThis;
  GLOBAL.indexedDB = makeIndexedDb(data) as unknown as IDBFactory;

  const storage = indexedDbStorage();
  await storage.setItem("ovitech-farm-v5", JSON.stringify({ state: { role: "field" }, version: 0 }));
  const read = await storage.getItem("ovitech-farm-v5");
  assert.equal(read, '{"state":{"role":"field"},"version":0}');
  await storage.removeItem("ovitech-farm-v5");
  assert.equal(await storage.getItem("ovitech-farm-v5"), null);
});

test("IndexedDB : migration unique depuis localStorage sans perte", async () => {
  clearGlobals();
  const data = new Map<string, string>();
  const legacy = new Map<string, string>([["ovitech-farm-v5", '{"state":{"role":"production"},"version":0}']]);
  const localStorage = {
    getItem: (key: string) => legacy.get(key) ?? null,
    setItem: (key: string, value: string) => void legacy.set(key, value),
    removeItem: (key: string) => void legacy.delete(key),
  } as unknown as Storage;
  GLOBAL.window = { localStorage } as unknown as Window & typeof globalThis;
  GLOBAL.indexedDB = makeIndexedDb(data) as unknown as IDBFactory;

  const storage = indexedDbStorage();
  const first = await storage.getItem("ovitech-farm-v5");
  assert.equal(first, '{"state":{"role":"production"},"version":0}');
  assert.equal(data.get("ovitech-farm-v5"), '{"state":{"role":"production"},"version":0}');
  assert.equal(legacy.has("ovitech-farm-v5"), false);

  const second = await storage.getItem("ovitech-farm-v5");
  assert.equal(second, '{"state":{"role":"production"},"version":0}');
});

function makeIndexedDb(data: Map<string, string>) {
  return {
    open: () => {
      const store = {
        get: (key: string): FakeRequest => {
          const request: FakeRequest = { result: data.get(key), onsuccess: null, onerror: null };
          queueMicrotask(() => request.onsuccess?.());
          return request;
        },
        put: (value: string, key: string): FakeRequest => {
          const request: FakeRequest = { result: key, onsuccess: null, onerror: null };
          queueMicrotask(() => {
            data.set(key, value);
            request.onsuccess?.();
          });
          return request;
        },
        delete: (key: string): FakeRequest => {
          const request: FakeRequest = { result: undefined, onsuccess: null, onerror: null };
          queueMicrotask(() => {
            data.delete(key);
            request.onsuccess?.();
          });
          return request;
        },
      };
      const db = {
        objectStoreNames: { contains: (name: string) => name === "persist" },
        createObjectStore: () => ({ createIndex: () => undefined }),
        transaction: () => ({ objectStore: () => store }),
        close: () => undefined,
      };
      const request = {
        result: db,
        onupgradeneeded: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      queueMicrotask(() => {
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  };
}