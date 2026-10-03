import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeAnimalHealth,
  HEALTH_WEIGHT_LOSS_RATIO,
  HEALTH_SCAN_STALE_DAYS,
} from "./health.ts";
import { DAY_MS } from "./numeric.ts";
import type { Animal, NutritionRec, WeightRecord } from "./types.ts";

const NOW = Date.parse("2026-09-12T12:00:00.000Z");

function animal(over: Partial<Animal> = {}): Animal {
  return {
    id: "an-x",
    rfid: "800000000000000",
    code: "OV-0001",
    sex: "F",
    breed: "Rembi",
    birthDate: "2025-01-01",
    weightKg: 40,
    bcs: 3,
    stage: "brebis_entretien",
    pen: "B1",
    status: "actif",
    lastScanAt: "2026-09-11T09:00:00.000Z",
    adgKg: null,
    notes: "",
    ...over,
  };
}

function weight(at: string, kg: number): WeightRecord {
  return { id: `w-${at}`, animalId: "an-x", kg, at, syncStatus: "synced", source: "terrain" };
}

function rec(ration: NutritionRec["ration"]): NutritionRec {
  return {
    id: "r-1",
    animalId: "an-x",
    createdAt: "2026-09-11T08:00:00.000Z",
    engineVersion: "DDNE-REF-0.9",
    ration,
    notes: [],
    confidence: "haute",
    missingInputs: [],
    evidence: [],
    syncStatus: "synced",
    approvedBy: null,
    servedAt: null,
    servedBy: null,
  };
}

test("S5 refus : dernière sortie moteur refusée → alerte + revue vétérinaire", () => {
  const h = computeAnimalHealth(animal(), [weight("2026-09-10T08:00:00Z", 40)], rec(null), NOW);
  assert.equal(h.status, "alerte");
  assert.equal(h.vetReview, true);
  assert.ok(h.signals.some((s) => s.id === "refus" && s.level === "alerte"));
});

test("S1 poids : perte ≥ seuil → alerte ; perte < seuil → aucun signal", () => {
  const prev = 50;
  const drop = prev * (1 - HEALTH_WEIGHT_LOSS_RATIO - 0.01);
  const ok = computeAnimalHealth(
    animal(),
    [weight("2026-09-11T08:00:00Z", prev), weight("2026-09-12T08:00:00Z", drop)],
    rec({ forageKg: 4, concentrateKg: 0.4, mineralG: 30, waterL: 9, cpPercent: 13, meMj: 11, dmiKg: 4.4 }),
    NOW,
  );
  assert.ok(ok.signals.some((s) => s.id === "poids" && s.level === "alerte"));

  const slight = prev * (1 - HEALTH_WEIGHT_LOSS_RATIO) + 0.01;
  const safe = computeAnimalHealth(
    animal(),
    [weight("2026-09-11T08:00:00Z", prev), weight("2026-09-12T08:00:00Z", slight)],
    rec({ forageKg: 4, concentrateKg: 0.4, mineralG: 30, waterL: 9, cpPercent: 13, meMj: 11, dmiKg: 4.4 }),
    NOW,
  );
  assert.ok(!safe.signals.some((s) => s.id === "poids"));
});

test("S2 NEC : < 2,5 → suivi ; < 2,0 → alerte ; NEC correct → aucun signal", () => {
  const suivi = computeAnimalHealth(animal({ bcs: 2.2 }), [], rec({} as NutritionRec["ration"]), NOW);
  assert.ok(suivi.signals.some((s) => s.id === "nec" && s.level === "suivi"));

  const alerte = computeAnimalHealth(animal({ bcs: 1.8 }), [], rec({} as NutritionRec["ration"]), NOW);
  assert.ok(alerte.signals.some((s) => s.id === "nec" && s.level === "alerte"));
  assert.equal(alerte.status, "alerte");

  const ok = computeAnimalHealth(animal({ bcs: 3 }), [], rec({} as NutritionRec["ration"]), NOW);
  assert.ok(!ok.signals.some((s) => s.id === "nec"));
});

test("S3 scan : jamais scanné ou scan périmé → suivi", () => {
  const jamais = computeAnimalHealth(animal({ lastScanAt: null }), [], rec({} as NutritionRec["ration"]), NOW);
  assert.ok(jamais.signals.some((s) => s.id === "scan"));

  const staleMs = HEALTH_SCAN_STALE_DAYS * DAY_MS + DAY_MS;
  const perime = computeAnimalHealth(
    animal({ lastScanAt: new Date(NOW - staleMs).toISOString() }),
    [],
    rec({} as NutritionRec["ration"]),
    NOW,
  );
  assert.ok(perime.signals.some((s) => s.id === "scan"));

  const frais = computeAnimalHealth(
    animal({ lastScanAt: new Date(NOW - DAY_MS).toISOString() }),
    [],
    rec({} as NutritionRec["ration"]),
    NOW,
  );
  assert.ok(!frais.signals.some((s) => s.id === "scan"));
});

test("S4 gestation : mise bas à ≤ 10 jours → suivi", () => {
  const proche = computeAnimalHealth(
    animal({ stage: "brebis_gestation", notes: "agnelage J+145" }),
    [],
    rec({} as NutritionRec["ration"]),
    NOW,
  );
  assert.ok(proche.signals.some((s) => s.id === "gestation" && s.level === "suivi"));
  assert.equal(proche.status, "suivi");

  const loin = computeAnimalHealth(
    animal({ stage: "brebis_gestation", notes: "agnelage J+100" }),
    [],
    rec({} as NutritionRec["ration"]),
    NOW,
  );
  assert.ok(!loin.signals.some((s) => s.id === "gestation"));
});

test("agrégation : alerte domine sur suivi ; pas de signaux → ok", () => {
  const combo = computeAnimalHealth(animal({ bcs: 1.8, lastScanAt: null }), [], rec(null), NOW);
  assert.equal(combo.status, "alerte");
  assert.equal(combo.vetReview, true);

  const clean = computeAnimalHealth(
    animal({ bcs: 3, lastScanAt: new Date(NOW - DAY_MS).toISOString(), stage: "brebis_lactation" }),
    [weight("2026-09-11T08:00:00Z", 40), weight("2026-09-12T08:00:00Z", 41)],
    rec({ forageKg: 4, concentrateKg: 0.4, mineralG: 30, waterL: 9, cpPercent: 13, meMj: 11, dmiKg: 4.4 }),
    NOW,
  );
  assert.equal(clean.status, "ok");
  assert.equal(clean.vetReview, false);
});

test("compat seed : les animaux du seed produisent un statut stable", async () => {
  const { seedState } = await import("./store/seed-state.ts");
  const { computeAnimalHealth } = await import("./health.ts");
  const { latestRecByAnimal } = await import("./kpis.ts");
  const s = seedState();
  const latest = latestRecByAnimal(s.recs);
  for (const a of s.animals) {
    const h = computeAnimalHealth(a, s.weights, latest.get(a.id));
    assert.ok(["ok", "suivi", "alerte"].includes(h.status));
  }
});