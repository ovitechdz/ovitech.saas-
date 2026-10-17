import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { pgliteSql, readMigration } from "../test-db.ts";
import { lookupFarmMembership, roleAllowed, type TaggedSql } from "./farm-membership.ts";

/**
 * Test d'intégration (PGLite + migrations réelles) du contrat d'isolation des
 * fermes : `farm_memberships` porte le cloisonnement, la requête testée est
 * exactement celle du garde serveur (`farm-auth.server.ts`).
 */

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
  await pg.query(
    "insert into farm_memberships (id, user_id, farm_id, role) values ($1, $2, $3, $4), ($5, $6, $7, $8)",
    ["mem-1", "user-a", "f1", "OWNER", "mem-2", "user-b", "f2", "OPERATOR"],
  );
  await pg.query(
    `insert into animals (id, farm_id, rfid, code, sex, breed, birth_date, stage, pen, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10), ($11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
    [
      "a-f1",
      "f1",
      "RFID-A",
      "OV-A",
      "F",
      "Rembi",
      "2025-01-01",
      "agneau",
      "B1",
      "actif",
      "a-f2",
      "f2",
      "RFID-B",
      "OV-B",
      "F",
      "Rembi",
      "2025-01-01",
      "agneau",
      "B2",
      "actif",
    ],
  );
  sql = pgliteSql(pg);
});

after(async () => {
  await pg.close();
});

test("lookupFarmMembership : renvoie l'adhésion de la ferme de l'utilisateur", async () => {
  const membership = await lookupFarmMembership(sql, "user-a", "f1");
  assert.deepEqual(membership, { user_id: "user-a", farm_id: "f1", role: "OWNER" });
});

test("lookupFarmMembership : refuse toute ferme où l'utilisateur n'est pas membre", async () => {
  assert.equal(await lookupFarmMembership(sql, "user-a", "f2"), null);
  assert.equal(await lookupFarmMembership(sql, "user-b", "f1"), null);
  assert.equal(await lookupFarmMembership(sql, "user-a", "farm-inexistante"), null);
  assert.equal(await lookupFarmMembership(sql, "inconnu", "f1"), null);
});

test("roleAllowed : applique le rôle exigé", async () => {
  const membership = await lookupFarmMembership(sql, "user-b", "f2");
  assert.ok(membership, "adhésion attendue");
  assert.equal(roleAllowed(membership, ["OWNER"]), false);
  assert.equal(roleAllowed(membership, ["MANAGER", "OPERATOR"]), true);
});

test("isolation des données : chaque ferme ne lit que ses propres animaux", async () => {
  const f1 = await pg.query<{ id: string }>("select id from animals where farm_id = $1", ["f1"]);
  const f2 = await pg.query<{ id: string }>("select id from animals where farm_id = $1", ["f2"]);
  assert.deepEqual(
    f1.rows.map((r) => r.id),
    ["a-f1"],
  );
  assert.deepEqual(
    f2.rows.map((r) => r.id),
    ["a-f2"],
  );
});
