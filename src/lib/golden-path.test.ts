/**
 * Golden Path — test de régression exécutable de bout en bout.
 *
 * Parcours OVITECH : contexte farm-1 → identité manuelle/RFID simulée → dossier
 * animal → pesée + NEC → historique → contexte fourrager → moteur déterministe
 * DDNE-REF-0.9 → recommandation + preuves → revue humaine en attente →
 * persistance locale.
 *
 * Remplace l'ancien contenu de ce fichier (du Markdown avec une extension
 * `.ts`) qui était illisible par `tsc`/ESLint et n'était jamais exécuté, alors
 * que des rapports le citaient comme un test « PASS ».
 */
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { ENGINE_VERSION } from "./types.ts";

/** Persist s'appuie sur IndexedDB/localStorage : on fournit des shims avant
 *  l'import dynamique du store (un import statique serait hoisted trop tôt). */
function installBrowserShims() {
  const mem = new Map<string, string>();
  (globalThis as Record<string, unknown>).__ovitechLS__ = mem;
  (globalThis as Record<string, unknown>).window = {
    localStorage: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    },
  };
  (globalThis as Record<string, unknown>).indexedDB = undefined;
}

let store: typeof import("./store/index.ts");

beforeEach(async () => {
  installBrowserShims();
  store ??= await import("./store/index.ts");
  store.resetStoreForSsr();
});

test("golden path : identité → DDNE → revue en attente → persistance", async () => {
  const u = store.useFarmStore;
  assert.ok(u.getState().currentFarmId, "contexte ferme disponible (farm-1)");

  // 1) Identité manuelle / RFID simulée → nouveau dossier animal
  const animal = u.getState().registerAnimal({
    rfid: "900099000000001",
    code: "OV-9999",
    sex: "F",
    breed: "Rembi",
    birthDate: "2025-06-01",
    stage: "agneau",
    pen: "B1",
    weightKg: 30,
    bcs: 3,
  });
  assert.ok(animal.id, "dossier animal créé");
  assert.ok(u.getState().animals.some((a) => a.id === animal.id));

  // 2) Pesée + NEC → historique chronologique
  const wBefore = u.getState().weights.filter((w) => w.animalId === animal.id).length;
  u.getState().captureAnimal(animal.id, { weightKg: 33, bcs: 3 });
  assert.equal(
    u.getState().weights.filter((w) => w.animalId === animal.id).length,
    wBefore + 1,
    "pesée horodatée ajoutée à l'historique",
  );

  // 3) Contexte fourrager : un lot disponible et approvisionné
  const lot =
    u.getState().feed.find((f) => f.kind === "fourrage") ?? u.getState().feed[0]!;
  u.getState().setFeedAvailable(lot.id, true);
  u.getState().adjustFeedStock(lot.id, 100);

  // 4) Moteur déterministe → recommandation + preuves
  const rec = u.getState().runEngine(animal.id);
  assert.equal(rec.animalId, animal.id);
  assert.ok(rec.ration, "ration émise pour une identité nutritionnelle complète");
  assert.equal(rec.engineVersion, ENGINE_VERSION, "version du moteur citée");
  assert.ok(rec.evidence.length >= 3, "preuves d'entrée citées");
  assert.ok(
    rec.evidence.some((e) => /non IA|déterministe/i.test(e)),
    "le moteur se déclare déterministe (non IA)",
  );
  assert.equal(rec.approvedBy, null, "la revue humaine est en attente");
  assert.equal(rec.servedAt, null, "aucune distribution automatique");

  // 5) Garde de revue : field ne peut pas approuver, production peut
  u.getState().setRole("field");
  u.getState().approveRec(rec.id);
  assert.equal(
    u.getState().recs.find((r) => r.id === rec.id)?.approvedBy,
    null,
    "le rôle field ne peut pas approuver",
  );
  u.getState().setRole("production");
  u.getState().approveRec(rec.id);
  assert.equal(
    u.getState().recs.find((r) => r.id === rec.id)?.approvedBy,
    "Resp. production",
    "le rôle production approuve",
  );

  // 6) Persistance locale : l'état est écrit et reste rechargée
  await new Promise((r) => setTimeout(r, 0));
  const mem = (globalThis as Record<string, unknown>).__ovitechLS__ as Map<
    string,
    string
  >;
  const raw = mem.get("ovitech-farm-v5");
  assert.ok(raw, "l'état est écrit dans la persistance locale");
  const persisted = JSON.parse(raw) as {
    state: { animals: { id: string }[] };
  };
  assert.ok(
    persisted.state.animals.some((a) => a.id === animal.id),
    "l'animal persiste après rechargement",
  );
});
