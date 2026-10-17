import assert from "node:assert/strict";
import { test } from "node:test";
import {
  makeTaggedSql,
  makeTransaction,
  type PoolClientLike,
  type PoolLike,
  type QueryResultLike,
} from "./db-transaction.ts";

/**
 * Tests unitaires (sans base) de la couche transaction. Un pool factice expose
 * PLUSIEURS connexions et journalise CHAQUE instruction avec la connexion qui
 * l'a exécutée : on peut donc prouver que `BEGIN`/instruction/`COMMIT` restent
 * sur UNE seule connexion — c'est précisément ce que `pool.query()` ne garantit
 * pas et la faille corrigée ici.
 */

interface Op {
  client: string;
  sql: string;
}

interface Harness {
  pool: PoolLike;
  ops: Op[];
  clients: Array<{ id: string; released: boolean }>;
  connectCalls: () => number;
}

function harness(
  clientIds: string[],
  opts: { connectThrows?: boolean; failOn?: (sql: string) => boolean } = {},
): Harness {
  const ops: Op[] = [];
  const clients: Array<{ id: string; released: boolean }> = [];
  let connects = 0;
  let cursor = 0;
  const pool: PoolLike = {
    async connect(): Promise<PoolClientLike> {
      connects += 1;
      if (opts.connectThrows) throw new Error("connect refused");
      const id = clientIds[cursor++ % clientIds.length] ?? "cx";
      const record = { id, released: false };
      clients.push(record);
      return {
        async query(text: string): Promise<QueryResultLike> {
          ops.push({ client: id, sql: text });
          if (opts.failOn?.(text)) throw new Error(`boom:${text}`);
          return { rows: [] };
        },
        release() {
          record.released = true;
        },
      };
    },
  };
  return { pool, ops, clients, connectCalls: () => connects };
}

test("makeTaggedSql : tagged template → placeholders $n paramétrés (pas d'interpolation)", async () => {
  const calls: Array<[string, unknown[]]> = [];
  const sql = makeTaggedSql(async (text, params) => {
    calls.push([text, params ?? []]);
    return { rows: [] };
  });
  await sql`select * from t where a = ${1} and b = ${"x' or '1'='1"}`;
  await sql.query("select 1");
  assert.deepEqual(calls, [
    ["select * from t where a = $1 and b = $2", [1, "x' or '1'='1"]],
    ["select 1", []],
  ]);
});

test("makeTransaction : BEGIN/instructions/COMMIT sur UNE seule connexion (preuve d'atomicité)", async () => {
  const { pool, ops, clients } = harness(["c1", "c2", "c3"]);
  const tx = makeTransaction(pool);
  const value = await tx(async (sql) => {
    await sql`insert into animals values (${1})`;
    await sql.query("update animals set x = $1", [2]);
    return "done";
  });
  assert.equal(value, "done");
  assert.deepEqual(
    ops.map((o) => o.sql),
    [
      "begin",
      "insert into animals values ($1)",
      "update animals set x = $1",
      "commit",
    ],
  );
  assert.equal(new Set(ops.map((o) => o.client)).size, 1, "une seule connexion");
  assert.equal(clients.length, 1, "un seul client réservé");
  assert.equal(clients[0]!.released, true, "client libéré après COMMIT");
});

test("makeTransaction : échec au milieu → ROLLBACK, aucune écriture validée, erreur propagée", async () => {
  const { pool, ops, clients } = harness(["c1"], {
    failOn: (s) => s.includes("boom"),
  });
  const tx = makeTransaction(pool);
  await assert.rejects(
    tx(async (sql) => {
      await sql`insert into animals values (${1})`;
      await sql`boom`;
    }),
    { message: "boom:boom" },
  );
  assert.equal(
    ops.some((o) => o.sql === "commit"),
    false,
    "jamais de COMMIT",
  );
  assert.equal(ops.at(-1)!.sql, "rollback", "ROLLBACK exécuté");
  assert.equal(new Set(ops.map((o) => o.client)).size, 1, "même connexion");
  assert.equal(clients[0]!.released, true, "client libéré");
});

test("makeTransaction : COMMIT échoué → erreur propagée (jamais de faux succès)", async () => {
  const { pool, clients } = harness(["c1"], { failOn: (s) => s === "commit" });
  const tx = makeTransaction(pool);
  await assert.rejects(tx(async () => "ok"), { message: "boom:commit" });
  assert.equal(clients[0]!.released, true, "client libéré malgré l'échec");
});

test("makeTransaction : connexion refusée → erreur, aucune ressource réservée", async () => {
  const { pool, clients, connectCalls } = harness(["c1"], {
    connectThrows: true,
  });
  const tx = makeTransaction(pool);
  await assert.rejects(tx(async () => "ok"), { message: "connect refused" });
  assert.equal(clients.length, 0, "aucun client");
  assert.equal(connectCalls(), 1);
});

test("makeTransaction : ROLLBACK échoué → l'erreur d'origine reste propagée, client libéré", async () => {
  const { pool, ops, clients } = harness(["c1"], {
    failOn: (s) => s === "rollback" || s.includes("boom"),
  });
  const tx = makeTransaction(pool);
  await assert.rejects(
    tx(async (sql) => {
      await sql`boom`;
    }),
    { message: "boom:boom" },
    "l'erreur d'origine (boom:boom) prime sur l'échec de rollback (boom:rollback)",
  );
  assert.equal(ops.at(-1)!.sql, "rollback");
  assert.equal(clients[0]!.released, true, "client libéré dans tous les cas");
});
