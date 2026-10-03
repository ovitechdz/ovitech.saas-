import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRationSheet, canServe } from "./ration.ts";
import type { Animal, FeedLot, NutritionRec } from "./types.ts";

const rec = (patch: Partial<NutritionRec>): NutritionRec => ({
  id: "rec-1",
  animalId: "an-1",
  createdAt: "2026-08-28T08:00:00.000Z",
  engineVersion: "DDNE-REF-0.9",
  ration: {
    forageKg: 1,
    concentrateKg: 0.8,
    mineralG: 15,
    waterL: 5,
    cpPercent: 14,
    meMj: 18,
    dmiKg: 1.8,
  },
  notes: [],
  confidence: "haute",
  missingInputs: [],
  evidence: ["x"],
  syncStatus: "local",
  approvedBy: null,
  servedAt: null,
  servedBy: null,
  ...patch,
});

test("canServe exige revue puis refuse la double distribution", () => {
  assert.equal(canServe(null).ok, false);
  assert.equal(canServe(rec({ ration: null })).ok, false);
  assert.equal(canServe(rec({ approvedBy: null })).ok, false);
  assert.equal(canServe(rec({ approvedBy: "Resp. production" })).ok, true);
  assert.equal(
    canServe(rec({ approvedBy: "Resp.", servedAt: "2026-08-28T09:00:00.000Z", servedBy: "Terrain" })).ok,
    false,
  );
});

test("feuille de ration sépare bloqués / à servir / distribués", () => {
  const animals: Animal[] = [
    {
      id: "an-1",
      rfid: "E1",
      code: "OV-1",
      sex: "F",
      breed: "Ouled Djellal",
      birthDate: "2024-01-01",
      weightKg: 40,
      bcs: 3,
      stage: "engraissement",
      pen: "Parc A",
      status: "actif",
      lastScanAt: null,
      adgKg: 0.2,
      notes: "",
    },
    {
      id: "an-2",
      rfid: "E2",
      code: "OV-2",
      sex: "F",
      breed: "Ouled Djellal",
      birthDate: "2024-01-01",
      weightKg: null,
      bcs: 3,
      stage: "engraissement",
      pen: "Parc A",
      status: "actif",
      lastScanAt: null,
      adgKg: null,
      notes: "",
    },
  ];
  const recs: NutritionRec[] = [
    rec({ id: "r1", animalId: "an-1", approvedBy: "Resp. production" }),
    rec({ id: "r2", animalId: "an-2", ration: null, confidence: "insuffisante" }),
  ];
  const feed: FeedLot[] = [
    {
      id: "f1",
      name: "Foin",
      kind: "fourrage",
      stockKg: 100,
      costPerKg: 20,
      available: true,
      origin: "test",
    },
  ];
  const sheet = buildRationSheet(animals, recs, feed);
  assert.equal(sheet.total, 2);
  assert.equal(sheet.blocked, 1);
  assert.equal(sheet.ready, 1);
  assert.equal(sheet.served, 0);
  assert.equal(sheet.groups[0]?.pen, "Parc A");
});
