export type Role = "field" | "production";

export type NetworkState = "online" | "offline";

export type SyncStatus =
  | "local"
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "conflict";

export type Stage =
  | "agneau"
  | "croissance"
  | "engraissement"
  | "brebis_entretien"
  | "brebis_gestation"
  | "brebis_lactation"
  | "belier";

export type Sex = "F" | "M";

export type AnimalStatus = "actif" | "vendu" | "mort";

export type EventType =
  | "scan"
  | "saisie"
  | "recommandation"
  | "sync"
  | "erreur"
  | "identite"
  | "transfert"
  | "distribution";

export type HealthEventType =
  | "examen"
  | "traitement"
  | "naissance"
  | "observation";

export interface HealthEvent {
  id: string;
  animalId: string;
  type: HealthEventType;
  at: string;
  by: string;
  note: string;
  syncStatus: SyncStatus;
}

export interface Animal {
  id: string;
  rfid: string;
  code: string;
  sex: Sex;
  breed: string;
  birthDate: string;
  weightKg: number | null;
  bcs: number | null;
  stage: Stage;
  pen: string;
  status: AnimalStatus;
  lastScanAt: string | null;
  adgKg: number | null;
  notes: string;
}

export interface NewAnimalInput {
  rfid: string;
  code: string;
  sex: Sex;
  breed: string;
  birthDate: string;
  stage: Stage;
  pen: string;
  weightKg: number | null;
  bcs: number | null;
  notes?: string;
}

export interface WeightRecord {
  id: string;
  animalId: string;
  kg: number;
  at: string;
  syncStatus: SyncStatus;
  source: "seed" | "terrain";
}

export interface Ration {
  forageKg: number;
  concentrateKg: number;
  mineralG: number;
  waterL: number;
  cpPercent: number;
  meMj: number;
  dmiKg: number;
}

export interface NutritionRec {
  id: string;
  animalId: string;
  createdAt: string;
  engineVersion: string;
  ration: Ration | null;
  notes: string[];
  confidence: "haute" | "moyenne" | "insuffisante";
  missingInputs: string[];
  evidence: string[];
  syncStatus: SyncStatus;
  approvedBy: string | null;
  servedAt: string | null;
  servedBy: string | null;
}

export interface FarmEvent {
  id: string;
  type: EventType;
  animalId: string | null;
  at: string;
  label: string;
  detail: string;
  syncStatus: SyncStatus;
  error?: string;
}

export interface FeedLot {
  id: string;
  name: string;
  kind: "fourrage" | "concentre" | "hybride" | "mineral";
  stockKg: number;
  costPerKg: number;
  available: boolean;
  origin: string;
}

export interface EnergySnapshot {
  solarKwhToday: number;
  consumedKwhToday: number;
  batteryPercent: number;
  autonomyPercent: number;
  status: "nominal" | "attention" | "critique";
  series: { day: string; solar: number; load: number }[];
}

export type SensorStatus = "ok" | "attention" | "critique";

/** Capteur de climat d'un parc (température + hygrométrie). */
export interface PenClimateSensor {
  pen: string;
  temperatureC: number;
  humidityPercent: number;
  status: SensorStatus;
}

/** Unité de production d'orge germée (fourrage hydroponique / الشعير المستنبت). */
export interface HydroponicUnit {
  name: string;
  trays: number;
  cyclesPerDay: number;
  stockKg: number;
  temperatureC: number;
  humidityPercent: number;
  lastHarvestAt: string;
  status: SensorStatus;
}

/** Couche capteurs environnement : parcs + unité de production hybride.
 *  Donnée de démonstration (cf. contrat Q-07) — le raccordement matériel réel
 *  fait partie de la phase Growth. */
export interface EnvironmentSnapshot {
  pens: PenClimateSensor[];
  hydroponie: HydroponicUnit;
}

export interface KpiPoint {
  day: string;
  adg: number;
  feedCost: number;
  identified: number;
}

export interface KpiDef {
  id: string;
  name: string;
  formula: string;
  source: string;
  baseline: string;
  target: string;
  pillar: string;
}

export interface ExpertSignoff {
  id: string;
  name: string;
  specialty: "nutrition" | "elevage";
  signedAt: string;
  protocol: string;
  notes: string;
  engineVersion: string;
  passed: number;
  total: number;
  caseIds: string[];
}

export const STAGES: readonly Stage[] = [
  "agneau",
  "croissance",
  "engraissement",
  "brebis_entretien",
  "brebis_gestation",
  "brebis_lactation",
  "belier",
];

export const ENGINE_VERSION = "DDNE-REF-0.9";
