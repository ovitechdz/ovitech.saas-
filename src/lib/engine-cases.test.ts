import assert from "node:assert/strict";
import { test } from "node:test";
import type { Animal } from "./types.ts";
import { runAllCases } from "./engine-cases.ts";
import { computeRecommendation } from "./nutrition-engine.ts";

const herd: Animal[] = [
  {
    id: "an-2401",
    rfid: "E280-1160-0001",
    code: "OV-2401",
    sex: "F",
    breed: "Ouled Djellal",
    birthDate: "2024-02-11",
    weightKg: 48.2,
    bcs: 3.0,
    stage: "engraissement",
    pen: "Engraissement A",
    status: "actif",
    lastScanAt: null,
    adgKg: 0.21,
    notes: "",
  },
  {
    id: "an-2403",
    rfid: "E280-1160-0003",
    code: "OV-2403",
    sex: "F",
    breed: "Rembi",
    birthDate: "2022-12-18",
    weightKg: 61.4,
    bcs: 2.8,
    stage: "brebis_lactation",
    pen: "Maternité",
    status: "actif",
    lastScanAt: null,
    adgKg: -0.02,
    notes: "",
  },
  {
    id: "an-2408",
    rfid: "E280-1160-0008",
    code: "OV-2408",
    sex: "F",
    breed: "Rembi",
    birthDate: "2024-04-02",
    weightKg: 46.0,
    bcs: 2.2,
    stage: "engraissement",
    pen: "Engraissement A",
    status: "actif",
    lastScanAt: null,
    adgKg: 0.11,
    notes: "",
  },
  {
    id: "an-2410",
    rfid: "E280-1160-0010",
    code: "OV-2410",
    sex: "F",
    breed: "Ouled Djellal",
    birthDate: "2024-01-28",
    weightKg: null,
    bcs: 3.0,
    stage: "engraissement",
    pen: "Engraissement B",
    status: "actif",
    lastScanAt: null,
    adgKg: null,
    notes: "",
  },
  {
    id: "an-2411",
    rfid: "E280-1160-0011",
    code: "OV-2411",
    sex: "F",
    breed: "Rembi",
    birthDate: "2022-06-20",
    weightKg: 63.8,
    bcs: 4.2,
    stage: "brebis_entretien",
    pen: "Parc A",
    status: "actif",
    lastScanAt: null,
    adgKg: 0.03,
    notes: "",
  },
];

test("cas de référence du moteur", () => {
  const results = runAllCases(herd);
  assert.equal(results.length, 7);
  for (const r of results) {
    assert.equal(r.ok, true, `${r.id} ${r.code} : ${r.fails.join(" · ")}`);
  }
});

test("refus sans poids", () => {
  const rec = computeRecommendation(herd.find((a) => a.id === "an-2410")!, {
    forageAvailable: true,
    concentrateAvailable: true,
  });
  assert.equal(rec.ration, null);
  assert.ok(rec.missingInputs.some((m) => m.includes("poids")));
});
