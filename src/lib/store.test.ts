import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { beforeEach, test } from "node:test";
import type { SyncStatus } from "./types.ts";
import { PENS, environment } from "./seed.ts";
import { weightSchema, MAX_WEIGHT_KG } from "./validation.ts";
import { computeRecommendation } from "./nutrition-engine.ts";

/** Persist s'appuie sur IndexedDB/localStorage : on fournit des shims avant
 *  l'import dynamique du store (les imports statiques seraient hoisted trop tôt). */
function installBrowserShims() {
  const mem = new Map<string, string>();
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

const OPEN = ["local", "pending", "failed", "conflict", "syncing"];

test("F-02: la couche store ne doit plus importer la route serveur directement", async () => {
  const source = await readFile(new URL("./store/sync.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /server\/routes\/api\/sync\/animals\.post\.ts|syncAnimals as any/i);
});

test("F-01: les identités de synchronisation sont farm-scopées", async () => {
  const sql = await readFile(new URL("../../migrations/app_core.sql", import.meta.url), "utf8");
  assert.match(sql, /primary\s+key\s*\(\s*farm_id\s*,\s*mutation_id\s*\)|unique\s*\(\s*farm_id\s*,\s*mutation_id\s*\)/i);
  assert.match(sql, /primary\s+key\s*\(\s*farm_id\s*,\s*id\s*\)|unique\s*\(\s*farm_id\s*,\s*id\s*\)/i);
});

test("composition des slices : état seed stable + actions présentes", () => {
  const s = store.useFarmStore.getState();
  assert.ok(s.animals.length > 0);
  assert.ok(s.events.length > 0);
  assert.deepEqual(s.signoffs, []);
  for (const key of [
    "setRole",
    "setNetwork",
    "resolveScan",
    "recordScan",
    "registerAnimal",
    "captureAnimal",
    "setFeedAvailable",
    "runEngine",
    "approveRec",
    "serveRec",
    "servePen",
    "signProtocol",
    "addHealthEvent",
    "syncAll",
    "retryEvent",
    "markConflict",
    "resetDemo",
  ] as const) {
    assert.equal(typeof (s as unknown as Record<string, unknown>)[key], "function", key);
  }
});

test("la revue exige production; field ne sert qu'après approbation", () => {
  const u = store.useFarmStore;
  const s = u.getState();
  let rec = s.runEngine(s.animals.find((a) => a.status === "actif")!.id);
  if (!rec.ration) {
    for (const a of s.animals.filter((x) => x.status === "actif")) {
      rec = s.runEngine(a.id);
      if (rec.ration) break;
    }
  }
  assert.ok(rec.ration, "au moins une rec avec ration doit exister sur le seed");
  const id = rec.id;
  const before = u.getState().feed.reduce((n, f) => n + f.stockKg, 0);

  const pendingRec = u.getState().recs.find((r) => r.id === id)!;
  const eventCount = u.getState().events.length;
  assert.equal(pendingRec.approvedBy, null, "la recommandation commence en attente");
  assert.equal(u.getState().serveRec(id).ok, false, "field ne sert pas avant revue");
  u.getState().approveRec(id);
  assert.equal(
    u.getState().recs.find((r) => r.id === id)?.approvedBy,
    null,
    "field ne peut pas approuver via un appel direct au store",
  );
  assert.equal(u.getState().events.length, eventCount, "l'appel refusé n'ajoute pas d'événement");

  u.getState().setRole("production");
  u.getState().approveRec(id);
  assert.equal(
    u.getState().recs.find((r) => r.id === id)?.approvedBy,
    "Resp. production",
    "production peut approuver",
  );
  u.getState().setRole("field");
  assert.equal(u.getState().serveRec(id).ok, true, "field peut exécuter une ration approuvée");
  const afterState = u.getState();
  const served = afterState.recs.find((r) => r.id === id)!;
  assert.ok(served.servedAt, "servedAt horodaté");
  assert.ok(served.approvedBy, "approuvé par un rôle");
  const after = afterState.feed.reduce((n, f) => n + f.stockKg, 0);
  assert.ok(before - after > 0, "le stock diminue à la distribution");
  assert.equal(afterState.events.some((e) => e.type === "distribution"), true, "événement distribution");
  assert.equal(u.getState().serveRec(id).ok, false, "déjà distribuée : refus");
});

test("servePen : total servi+sauté = recs les plus récentes du parc", () => {
  const u = store.useFarmStore;
  const s = u.getState();
  const pen = s.recs[0]!.animalId;
  const animal = s.animals.find((a) => a.id === pen)!;
  const ids = new Set(
    s.animals.filter((a) => a.pen === animal.pen && a.status === "actif").map((a) => a.id),
  );
  const latest = new Map<string, string>();
  for (const r of s.recs) {
    if (!ids.has(r.animalId)) continue;
    const prev = latest.get(r.animalId);
    if (!prev || prev < r.createdAt) latest.set(r.animalId, r.id);
  }
  u.getState().setRole("production");
  for (const id of latest.values()) u.getState().approveRec(id);
  u.getState().setRole("field");
  const res = u.getState().servePen(animal.pen);
  assert.equal(res.served + res.skipped, latest.size);
});

test("captureAnimal : nouvelle pesée ajoute la ligne et met à jour l'animal", () => {
  const u = store.useFarmStore;
  const animal = u.getState().animals.find((a) => a.weightKg != null && a.status === "actif")!;
  const wBefore = u.getState().weights.filter((w) => w.animalId === animal.id).length;
  const next = u.getState().captureAnimal(animal.id, { weightKg: (animal.weightKg ?? 0) + 2 });
  assert.ok(next);
  assert.notEqual(next.weightKg, animal.weightKg);
  assert.equal(u.getState().weights.filter((w) => w.animalId === animal.id).length, wBefore + 1);
});

test("captureAnimal : une re-pesée au même kg conserve l'historique (timestamp)", () => {
  const u = store.useFarmStore;
  const animal = u.getState().animals.find((a) => a.weightKg != null && a.status === "actif")!;
  const wBefore = u.getState().weights.filter((w) => w.animalId === animal.id).length;
  u.getState().captureAnimal(animal.id, { weightKg: animal.weightKg });
  u.getState().captureAnimal(animal.id, { weightKg: animal.weightKg });
  assert.equal(
    u.getState().weights.filter((w) => w.animalId === animal.id).length,
    wBefore + 2,
    "chaque saisie (même poids) ajoute une ligne horodatée",
  );
});

test("registerAnimal : doublon rejeté, nouveau avec pesée initiale", () => {
  const u = store.useFarmStore;
  const base = u.getState().animals[0]!;
  assert.throws(
    () =>
      u.getState().registerAnimal({
        rfid: base.rfid,
        code: base.code,
        sex: base.sex,
        breed: base.breed,
        birthDate: base.birthDate,
        stage: base.stage,
        pen: base.pen,
        weightKg: null,
        bcs: null,
      }),
    /déjà attribué/,
  );
  const before = u.getState().animals.length;
  const created = u.getState().registerAnimal({
    rfid: "900099000000001",
    code: "OV-9999",
    sex: "F",
    breed: "Rembi",
    birthDate: "2025-01-01",
    stage: "agneau",
    pen: "B1",
    weightKg: 34,
    bcs: 3,
  });
  assert.equal(u.getState().animals.length, before + 1);
  assert.ok(created.id);
  assert.equal(
    u.getState().weights.some((w) => w.animalId === created.id),
    true,
    "poids initial enregistré",
  );
});

test("syncAll : zéro hors ligne, synchro en ligne et lastSyncedAt mis à jour", async () => {
  const u = store.useFarmStore;
  u.setState({ network: "offline" });
  u.getState().captureAnimal(u.getState().animals[0]!.id, { weightKg: 3 });
  assert.deepEqual(await u.getState().syncAll(), {
    synced: 0,
    failed: 0,
    conflicts: 0,
  });
  u.setState({ network: "online" });
  const on = await u.getState().syncAll();
  assert.ok(on.synced >= 1);
  assert.equal(on.failed, 0);
  assert.ok(u.getState().lastSyncedAt);
});

test("pendingCount comptabilise les éléments non finis", () => {
  const u = store.useFarmStore;
  const s = u.getState();
  const expected = [s.events, s.recs, s.weights, s.healthEvents]
    .flat()
    .filter((x) => OPEN.includes(x.syncStatus as (typeof OPEN)[number])).length;
  assert.equal(store.pendingCount(s), expected);
});

test("addHealthEvent : le seed expose he-3 en attente, un ajout hors ligne est local", () => {
  const u = store.useFarmStore;
  const s = u.getState();
  assert.ok(s.healthEvents.length >= 3, "seed santé présent");
  const seedPending = s.healthEvents.filter((h) => h.syncStatus === "pending").length;
  assert.ok(seedPending >= 1, "he-3 seed en attente");

  u.setState({ network: "offline" });
  const created = u.getState().addHealthEvent({
    animalId: s.animals[0]!.id,
    type: "traitement",
    note: "vermifuge N°2",
  });
  assert.ok(created.id.startsWith("he-"));
  const row = u.getState().healthEvents.find((h) => h.id === created.id)!;
  assert.equal(row.syncStatus, "local", "hors ligne → local");
  const who = s.role === "production" ? "Resp. production" : "Opérateur terrain";
  assert.equal(row.by, who, "libellé du rôle courant");
  assert.equal(u.getState().healthEvents.length, s.healthEvents.length + 1);
  assert.equal(store.pendingCount(u.getState()), store.pendingCount(s) + 1);
});

test("addHealthEvent : un ajout en ligne est pending puis flushé par syncAll", async () => {
  const u = store.useFarmStore;
  u.setState({ network: "online" });
  const before = u.getState().healthEvents.length;
  const created = u.getState().addHealthEvent({
    animalId: u.getState().animals[0]!.id,
    type: "examen",
    note: "palpation",
  });
  assert.equal(u.getState().healthEvents.find((h) => h.id === created.id)?.syncStatus, "pending");
  const res = await u.getState().syncAll();
  assert.ok(res.synced >= 1);
  assert.equal(u.getState().healthEvents.length, before + 1, "préservé par la synchro");
  assert.ok(
    u.getState().healthEvents.every((h) => h.syncStatus !== "pending"),
    "rien en attente après flush",
  );
});

test("nextAnimalCode : au-delà du max du seed", () => {
  const s = store.useFarmStore.getState();
  const max = Math.max(
    ...s.animals
      .map((a) => Number.parseInt(a.code.replace(/\D/g, ""), 10))
      .filter((n) => Number.isFinite(n)),
  );
  const code = store.nextAnimalCode(s.animals);
  assert.ok(Number.parseInt(code.replace(/\D/g, ""), 10) > max);
});

test("servePen : aucun service ni débit quand le stock est épuisé", () => {
  const u = store.useFarmStore;
  const s = u.getState();
  const animal = s.animals.find((a) => a.status === "actif")!;
  const pen = animal.pen;
  const penIds = new Set(
    s.animals.filter((a) => a.pen === pen && a.status === "actif").map((a) => a.id),
  );
  // favouriser une rec avec ration sur un pensionnaire du même parc
  let rec = u.getState().runEngine(animal.id);
  if (!rec.ration) rec = u.getState().runEngine(penIds.values().next().value!);
  const latestByAnimal = new Map<string, (typeof s.recs)[number]>();
  for (const r of u.getState().recs) {
    if (!penIds.has(r.animalId)) continue;
    const prev = latestByAnimal.get(r.animalId);
    if (!prev || prev.createdAt < r.createdAt) latestByAnimal.set(r.animalId, r);
  }
  u.getState().setRole("production");
  for (const r of latestByAnimal.values()) u.getState().approveRec(r.id);
  u.getState().setRole("field");

  u.setState({ feed: u.getState().feed.map((f) => ({ ...f, stockKg: 0 })) });
  const eventsBefore = u.getState().events.length;
  const res = u.getState().servePen(pen);
  assert.equal(res.served, 0);
  assert.ok(res.skipped >= 1, "tous les candidats sont sautés faute de stock");
  assert.equal(u.getState().events.length, eventsBefore, "aucun événement de distribution");
  assert.ok(u.getState().feed.every((f) => f.stockKg === 0), "stock intact");
  assert.ok(
    u.getState().recs.filter((r) => penIds.has(r.animalId)).every((r) => !r.servedAt),
    "aucune rec marquée servie",
  );
});

test("resolveConflict('drop') supprime réellement l'événement", () => {
  const u = store.useFarmStore;
  const ev = u.getState().events[0]!;
  u.getState().markConflict(ev.id);
  assert.equal(u.getState().events.find((e) => e.id === ev.id)?.syncStatus, "conflict");
  u.getState().resolveConflict(ev.id, "drop");
  assert.equal(u.getState().events.some((e) => e.id === ev.id), false);
});

test("trimSynced borne le tableau et ne purge jamais du non synchronisé", () => {
  const { trimSynced } = store;
  const mk = (i: number, syncStatus: SyncStatus) => ({
    id: `ev-${i}`,
    syncStatus,
    animalId: null,
    at: `2026-01-01T00:${String(i).padStart(2, "0")}:00.000Z`,
    label: "e",
  });
  const synced = Array.from({ length: 12 }, (_, i) => mk(i, "synced"));
  const pending = [mk(20, "local"), mk(21, "pending")];
  const out = trimSynced([...pending, ...synced], 10);
  assert.equal(out.length, 10, "borné au max");
  assert.ok(out.some((e) => e.id === "ev-20"), "local conservé");
  assert.ok(out.some((e) => e.id === "ev-21"), "pending conservé");
  assert.ok(out.some((e) => e.id === "ev-11"), "les plus récents synced restent");
  assert.ok(!out.some((e) => e.id === "ev-0"), "le plus ancien synced est évincé");
});

test("signProtocol : enregistre la signature expert", () => {
  const u = store.useFarmStore;
  const sig = u.getState().signProtocol({
    name: "Dr Z.",
    specialty: "nutrition",
    protocol: "OVT-NP-01",
    notes: "ok",
    passed: 5,
    total: 7,
    caseIds: ["TC-01"],
  });
  assert.ok(sig.id);
  assert.equal(u.getState().signoffs.length, 1);
});

test("environment : climat couvre chaque parc, statuts cohérents, unité d'orge germée renseignée", () => {
  assert.equal(environment.pens.length, PENS.length, "un capteur par parc (source unique PENS)");
  for (const s of environment.pens) {
    assert.ok(PENS.includes(s.pen as (typeof PENS)[number]), "parc référencé");
    assert.ok(s.temperatureC >= 10 && s.temperatureC <= 40, "température plausible (°C)");
    assert.ok(s.humidityPercent >= 30 && s.humidityPercent <= 90, "hygrométrie plausible (%)");
    assert.ok(["ok", "attention", "critique"].includes(s.status), "statut valide");
  }
  const h = environment.hydroponie;
  assert.ok(h.trays > 0 && h.cyclesPerDay > 0 && h.stockKg > 0, "unité de production alimentée");
  assert.ok(h.lastHarvestAt, "dernière récolte horodatée");
  assert.ok(["ok", "attention", "critique"].includes(h.status), "statut d'unité valide");
});

test("weightSchema : valeurs non finies ou hors plafond refusées", () => {
  for (const bad of ["1e309", "Infinity", "-1", "0", `${MAX_WEIGHT_KG + 1}`, "abc"]) {
    assert.equal(weightSchema.safeParse(bad).success, false, `devrait refuser « ${bad} »`);
  }
  for (const ok of ["", "   ", "12.5", `${MAX_WEIGHT_KG}`]) {
    const r = weightSchema.safeParse(ok);
    assert.equal(r.success, true, `devrait accepter « ${ok} »`);
    if (ok.trim() === "") assert.equal(r.data, null, "chaîne vide → pas de poids");
  }
});

test("captureAnimal : poids et NEC invalides sont ignorés (pas de pollution)", () => {
  const u = store.useFarmStore;
  const target = u.getState().animals[0]!;
  const before = u.getState().weights.filter((w) => w.animalId === target.id).length;
  const out = u.getState().captureAnimal(target.id, {
      weightKg: Number.POSITIVE_INFINITY,
      bcs: 99,
    });
  assert.equal(out?.weightKg, target.weightKg, "poids infini refusé");
  assert.equal(out?.bcs, target.bcs, "NEC hors plage refusé");
  assert.equal(
    u.getState().weights.filter((w) => w.animalId === target.id).length,
    before,
    "aucune ligne de poids ajoutée",
  );
  const ok = u.getState().captureAnimal(target.id, { weightKg: 42.5, bcs: 3.5 });
  assert.equal(ok?.weightKg, 42.5, "poids valide appliqué");
  assert.equal(ok?.bcs, 3.5, "NEC valide appliqué");
  assert.equal(
    u.getState().weights.filter((w) => w.animalId === target.id).length,
    before + 1,
    "ligne de poids ajoutée pour le poids valide",
  );
});

test("registerAnimal : rejette poids invalide et date de naissance future", () => {
  const u = store.useFarmStore;
  const base = {
    rfid: "900099000000002",
    code: "OV-9888",
    sex: "F" as const,
    breed: "Rembi",
    birthDate: "2025-01-01",
    stage: "agneau" as const,
    pen: "B1",
    weightKg: null,
    bcs: null,
  };
  assert.throws(
    () => u.getState().registerAnimal({ ...base, weightKg: Number.POSITIVE_INFINITY }),
    /Poids vif invalide/,
  );
  assert.throws(
    () => u.getState().registerAnimal({ ...base, bcs: 8 }),
    /Note d'état corporel/,
  );
  const future = new Date(Date.now() + 60 * 60 * 24 * 1000).toISOString().slice(0, 10);
  assert.throws(
    () => u.getState().registerAnimal({ ...base, weightKg: 40, birthDate: future }),
    /Date de naissance/,
  );
});

test("computeRecommendation : poids non fini → refus explicite, pas de ration ∞", () => {
  const source = store.useFarmStore.getState().animals[0]!;
  const rec = computeRecommendation(
    { ...source, weightKg: Number.POSITIVE_INFINITY },
    { forageAvailable: true, concentrateAvailable: true },
  );
  assert.equal(rec.ration, null, "pas de ration quand le poids est infini");
  assert.ok(
    rec.missingInputs.some((m) => m.includes("poids vif")),
    "le motif de refus mentionne le poids",
  );
});

test("resolveConflict local : le suffixe de conservation n'est ajouté qu'une fois", () => {
  const u = store.useFarmStore;
  const ev = u.getState().logScanFailure("unknown", "RFID-CF");
  u.getState().markConflict(ev.id);
  u.getState().resolveConflict(ev.id, "local");
  const once = u.getState().events.find((e) => e.id === ev.id);
  u.getState().resolveConflict(ev.id, "local");
  const twice = u.getState().events.find((e) => e.id === ev.id);
  assert.ok(once && twice);
  assert.equal(twice.detail, once.detail, "suffixe non dupliqué");
  assert.ok(twice.detail.includes("conservation locale"), "suffixe présent une fois");
});

test("syncAll : appel concurrent → la file n'est traitée qu'une seule fois", async () => {
  const u = store.useFarmStore;
  u.setState({ network: "online" });
  const slices = ["events", "healthEvents", "recs", "weights"] as const;
  const pendingBefore = slices.reduce((n, k) => {
    const list = u.getState()[k] as readonly { syncStatus: SyncStatus }[];
    return (
      n +
      list.filter(
        (x) => x.syncStatus === "local" || x.syncStatus === "pending" || x.syncStatus === "failed",
      ).length
    );
  }, 0);
  const [a, b] = await Promise.all([u.getState().syncAll(), u.getState().syncAll()]);
  assert.equal(a.synced + b.synced, pendingBefore, "un seul traitement de la file pendant l'appel concurrent");
  assert.equal(b.synced, 0, "l'appel concurrent repart sans doubler");
});

test("adjustFeedStock corrige le stock d'un lot, plafonne à zéro et journalise", () => {
  const u = store.useFarmStore;
  const target = u.getState().feed.find((f) => f.kind === "fourrage")!;
  const before = target.stockKg;
  const eventsBefore = u.getState().events.length;

  u.getState().adjustFeedStock(target.id, 50);
  assert.equal(
    u.getState().feed.find((f) => f.id === target.id)!.stockKg,
    before + 50,
  );
  assert.equal(u.getState().events.length, eventsBefore + 1);
  assert.ok(u.getState().events[0]!.label.includes(target.name));

  u.getState().adjustFeedStock(target.id, -5000);
  assert.equal(
    u.getState().feed.find((f) => f.id === target.id)!.stockKg,
    0,
    "clamp à 0",
  );

  const len = u.getState().events.length;
  u.getState().adjustFeedStock(target.id, 0);
  assert.equal(u.getState().events.length, len, "delta nul : aucune écriture");
});