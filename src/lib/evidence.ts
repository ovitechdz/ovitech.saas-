import { ENGINE_VERSION } from "./types";
import { FARM } from "./seed";
import type { FarmStateSlice } from "./evidence-types";

export type { FarmStateSlice } from "./evidence-types";

export function buildEvidencePack(s: FarmStateSlice) {
  return {
    document: FARM.document,
    farm: FARM.name,
    region: FARM.region,
    exportedAt: new Date().toISOString(),
    engine: ENGINE_VERSION,
    disclaimer:
      "Moteur déterministe DDNE-REF-0.9. Ce n'est pas un modèle d'apprentissage. Les recommandations restent une aide à la décision humaine. La distribution physique est un acte distinct de la revue.",
    network: s.network,
    lastSyncedAt: s.lastSyncedAt,
    counts: {
      animals: s.animals.length,
      recs: s.recs.length,
      events: s.events.length,
      weights: s.weights.length,
      signoffs: s.signoffs.length,
      served: s.recs.filter((r) => r.servedAt).length,
      approved: s.recs.filter((r) => r.approvedBy).length,
    },
    animals: s.animals,
    recs: s.recs,
    events: s.events.slice(0, 80),
    weights: s.weights.slice(0, 80),
    feed: s.feed,
    signoffs: s.signoffs,
    energy: {
      solarKwhToday: s.energy.solarKwhToday,
      consumedKwhToday: s.energy.consumedKwhToday,
      batteryPercent: s.energy.batteryPercent,
      autonomyPercent: s.energy.autonomyPercent,
      status: s.energy.status,
    },
  };
}

export function downloadEvidence(pack: ReturnType<typeof buildEvidencePack>) {
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ovitech-preuve-${pack.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
