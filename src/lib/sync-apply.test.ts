import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { pgliteSql, pgliteTransaction, readMigration } from "./test-db.ts";
import {
  AnimalFarmMismatchError,
  applyAnimalSyncMutation,
  claimSyncMutation,
  upsertAnimal,
  type AnimalPayload,
  type TaggedSql,
} from "./sync-apply.ts";

/**
 * Test d'intégration (PGLite + migrations réelles) du contrat de
 * synchronisation : idempotence par `(farm_id, mutation_id)` et cloisonnement
 * des animaux par `(farm_id, id)`. Le SQL testé est celui de `syncAnimals`
 * (`sync-apply.ts`).
 */

const animal = (over: Partial<AnimalPayload> = {}): AnimalPayload => ({
  id: "a1",
  rfid: "RFID-1",
  code: "OV-1",
  sex: "F",
  breed: "Rembi",
  birthDate: "2025-01-01",
  weightKg: 30,
  bcs: 3,
  stage: "agneau",
  pen: "B1",
  status: "actif",
  lastScanAt: null,
  adgKg: null,
  notes: "",
  ...over,
});

let pg: PGlite;
let sql: TaggedSql;

before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  await pg.exec(await readMigration("farms_memberships.sql"));
  await pg.exec(await readMigration("app_core.sql"));
  await pg.query("insert into farms (id, name) values ($1, $2), ($3, $4)", [
    "f1",
    "Ferme 1",
    "f2",
    "Ferme 2",
  ]);
  sql = pgliteSql(pg);
});

after(async () => {
  await pg.close();
});

test("claimSyncMutation : idempotent et cloisonné par ferme", async () => {
  assert.equal(await claimSyncMutation(sql, "f1", "m-1"), true);
  assert.equal(await claimSyncMutation(sql, "f1", "m-1"), false, "rejeu dans la même ferme");
  assert.equal(await claimSyncMutation(sql, "f2", "m-1"), true, "même mutation, autre ferme");
  const rows = await pg.query<{ farm_id: string }>(
    "select farm_id from sync_idempotency order by farm_id",
  );
  assert.deepEqual(
    rows.rows.map((r) => r.farm_id),
    ["f1", "f2"],
  );
});

test("upsertAnimal : crée puis met à jour le même (farm_id, id)", async () => {
  await upsertAnimal(sql, "f1", animal({ id: "d1", code: "OV-10" }));
  await upsertAnimal(sql, "f1", animal({ id: "d1", code: "OV-10B" }));
  const rows = await pg.query<{ code: string }>(
    "select code from animals where farm_id = $1 and id = $2",
    ["f1", "d1"],
  );
  assert.equal(rows.rows.length, 1, "une seule ligne (upsert)");
  assert.equal(rows.rows[0]!.code, "OV-10B", "mise à jour appliquée");
});

test("isolation : le même id/code dans deux fermes ne se marche pas dessus", async () => {
  await upsertAnimal(sql, "f1", animal({ id: "iso", code: "OV-ISO", rfid: "RFID-ISO" }));
  await upsertAnimal(sql, "f2", animal({ id: "iso", code: "OV-ISO", rfid: "RFID-ISO" }));
  const own = await pg.query("select id from animals where farm_id = $1 and id = $2", [
    "f1",
    "iso",
  ]);
  const other = await pg.query("select id from animals where farm_id = $1 and id = $2", [
    "f2",
    "iso",
  ]);
  const cross = await pg.query("select id from animals where farm_id = $1 and id = $2", [
    "f2",
    "d1",
  ]);
  assert.equal(own.rows.length, 1);
  assert.equal(other.rows.length, 1);
  assert.equal(cross.rows.length, 0, "aucune fuite inter-fermes");
});

test("garde d'isolation : un farmId divergent est refusé sans aucune écriture", async () => {
  const beforeRows = await pg.query("select id from animals where farm_id = $1", ["f1"]);
  await assert.rejects(
    () => upsertAnimal(sql, "f1", animal({ id: "evil", farmId: "f2" })),
    AnimalFarmMismatchError,
  );
  const afterRows = await pg.query("select id from animals where farm_id = $1", ["f1"]);
  assert.equal(afterRows.rows.length, beforeRows.rows.length, "aucune écriture après refus");
  const leaked = await pg.query("select id from animals where farm_id = $1 and id = $2", [
    "f2",
    "evil",
  ]);
  assert.equal(leaked.rows.length, 0, "rien écrit dans la ferme ciblée non plus");
});

test("clé étrangère : écrire pour une ferme inexistante est refusé", async () => {
  await assert.rejects(() => upsertAnimal(sql, "farm-ghost", animal({ id: "g1" })));
});

/**
 * Atomicité bout-en-bout : on exécute le MÊME corps que `syncAnimals` (via
 * `applyAnimalSyncMutation`) dans une transaction réelle, et on vérifie qu'une
 * erreur en cours de lot annule TOUT (mutation réservée comprise).
 */

test("transaction : succès → claim + upserts validés ensemble (COMMIT)", async () => {
  const result = await pgliteTransaction(pg)((tx) =>
    applyAnimalSyncMutation(tx, "f1", "m-tx-ok", [
      animal({ id: "t1", code: "OV-T1", rfid: "RFID-T1" }),
      animal({ id: "t2", code: "OV-T2", rfid: "RFID-T2" }),
    ]),
  );
  assert.equal(result.duplicate, false);
  assert.equal(result.count, 2);
  const rows = await pg.query<{ id: string }>(
    "select id from animals where farm_id = $1 and id in ($2, $3) order by id",
    ["f1", "t1", "t2"],
  );
  assert.deepEqual(
    rows.rows.map((r) => r.id),
    ["t1", "t2"],
  );
  const claim = await pg.query("select mutation_id from sync_idempotency where farm_id = $1 and mutation_id = $2", [
    "f1",
    "m-tx-ok",
  ]);
  assert.equal(claim.rows.length, 1, "mutation réservée et validée");
});

test("transaction : divergence de ferme en cours de lot → ROLLBACK complet (ni animal, ni claim)", async () => {
  await assert.rejects(
    pgliteTransaction(pg)((tx) =>
      applyAnimalSyncMutation(tx, "f1", "m-tx-bad", [
        animal({ id: "tx-a", code: "OV-TXA", rfid: "RFID-TXA" }),
        animal({ id: "tx-b", code: "OV-TXB", rfid: "RFID-TXB", farmId: "f2" }),
      ]),
    ),
    AnimalFarmMismatchError,
  );
  const first = await pg.query("select id from animals where farm_id = $1 and id = $2", [
    "f1",
    "tx-a",
  ]);
  assert.equal(first.rows.length, 0, "le premier animal du lot est annulé");
  const claim = await pg.query(
    "select mutation_id from sync_idempotency where farm_id = $1 and mutation_id = $2",
    ["f1", "m-tx-bad"],
  );
  assert.equal(claim.rows.length, 0, "la réservation de mutation est annulée");
});

test("transaction : mutation déjà appliquée → duplicate, aucune écriture", async () => {
  await pgliteTransaction(pg)((tx) =>
    applyAnimalSyncMutation(tx, "f1", "m-dup", [
      animal({ id: "dup-0", code: "OV-DUP0", rfid: "RFID-DUP0" }),
    ]),
  );
  const again = await pgliteTransaction(pg)((tx) =>
    applyAnimalSyncMutation(tx, "f1", "m-dup", [
      animal({ id: "dup-1", code: "OV-DUP1", rfid: "RFID-DUP1" }),
    ]),
  );
  assert.equal(again.duplicate, true);
  assert.equal(again.count, 0);
  const leaked = await pg.query("select id from animals where farm_id = $1 and id = $2", [
    "f1",
    "dup-1",
  ]);
  assert.equal(leaked.rows.length, 0, "rejeu n'écrit rien");
});
