import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  buildBackup,
  parseBackup,
  pickFarmData,
  sha256Hex,
} from "./backup.ts";
import type { FarmData } from "./store/index.ts";

function sampleData(overrides: Partial<FarmData> = {}): FarmData {
  return {
    role: "field",
    network: "online" as const,
    currentFarmId: "farm-1",
    animals: [
      {
        id: "OV-2401",
        rfid: "OV-2401",
        code: "OV-2401",
        sex: "M",
        breed: "Ouled Djellal",
        birthDate: "2024-03-15",
        stage: "engraissement",
        pen: "Parc A",
        status: "actif",
        weightKg: 42,
        bcs: 3,
        lastScanAt: "2026-09-13T00:00:00.000Z",
        adgKg: null,
        notes: "",
      },
    ],
    events: [],
    healthEvents: [],
    recs: [],
    feed: [],
    energy: {
      solarKwhToday: 0,
      consumedKwhToday: 0,
      batteryPercent: 100,
      autonomyPercent: 100,
      status: "nominal",
      series: [],
    },
    kpiSeries: [],
    weights: [],
    signoffs: [],
    lastSyncedAt: null,
    failNextSync: false,
    ...overrides,
  };
}

describe("buildBackup / parseBackup", () => {
  it("effectue un aller-retour sans perte", async () => {
    const data = sampleData();
    const raw = await buildBackup(data);
    const parsed = await parseBackup(raw);
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.deepEqual(parsed.data, data);
  });

  it("le checksum est déterministe pour un état identique", async () => {
    const a = await buildBackup(sampleData());
    const b = await buildBackup(sampleData());
    const pa = JSON.parse(a) as { checksum: string };
    const pb = JSON.parse(b) as { checksum: string };
    assert.equal(pa.checksum, pb.checksum);
  });

  it("rejette un état falsifié (checksum différent)", async () => {
    const raw = await buildBackup(sampleData());
    const payload = JSON.parse(raw) as { state: FarmData; checksum: string };
    payload.state.animals[0]!.weightKg = 999;
    const parsed = await parseBackup(JSON.stringify(payload));
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.code, "checksum");
  });

  it("rejette un mauvais format et une version future", async () => {
    const raw = await buildBackup(sampleData());
    const payload = JSON.parse(raw) as Record<string, unknown>;
    const badFormat = await parseBackup(JSON.stringify({ ...payload, format: "autre" }));
    assert.equal(badFormat.ok, false);
    const future = await parseBackup(
      JSON.stringify({ ...payload, version: BACKUP_VERSION + 1 }),
    );
    assert.equal(future.ok, false);
    if (!future.ok) assert.equal(future.code, "version");
  });

  it("rejette du JSON invalide et une structure incomplète", async () => {
    const badJson = await parseBackup("{pas du json");
    assert.equal(badJson.ok, false);
    if (!badJson.ok) assert.equal(badJson.code, "json");

    const raw = await buildBackup(sampleData());
    const payload = JSON.parse(raw) as Record<string, unknown>;
    const incomplete = { ...payload, state: { ...(payload.state as object), animals: "nope" } };
    const res = await parseBackup(JSON.stringify(incomplete));
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.code, "structure");
  });
});

describe("pickFarmData / sha256Hex", () => {
  it("n'exporte que les clés persistées (pas d'actions)", () => {
    const state = {
      ...sampleData(),
      // valeurs runtime que pickFarmData (miroir de partialize) ne doit PAS exporter
      resetDemo: undefined,
      setRole: undefined,
      uid: "runtime",
    } as unknown as Parameters<typeof pickFarmData>[0];
    const picked = pickFarmData(state);
    assert.deepEqual(Object.keys(picked).sort(), [
      "animals",
      "currentFarmId",
      "energy",
      "events",
      "failNextSync",
      "feed",
      "healthEvents",
      "kpiSeries",
      "lastSyncedAt",
      "network",
      "recs",
      "role",
      "signoffs",
      "weights",
    ]);
  });

  it("calcule un SHA-256 hex cohérent", async () => {
    assert.equal(
      await sha256Hex("abc"),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

it("le fichier porte le format attendu", async () => {
  const raw = await buildBackup(sampleData());
  const payload = JSON.parse(raw) as {
    format: string;
    version: number;
    engine: string;
  };
  assert.equal(payload.format, BACKUP_FORMAT);
  assert.equal(payload.version, BACKUP_VERSION);
  assert.equal(payload.engine, "DDNE-REF-0.9");
});