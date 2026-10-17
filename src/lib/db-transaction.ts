/**
 * Couche SQL commune — **pure** : aucun import lourd, aucun effet de bord, donc
 * directement exécutable sous `node --test` sans amorcer la base.
 *
 * Deux responsabilités :
 *
 * 1. `makeTaggedSql` adapte une fonction `query(text, params)` à la surface
 *    `Sql` (tagged template → placeholders `$n`, plus `.query()`).
 *
 * 2. `makeTransaction` implémente la SEULE forme correcte d'une transaction sur
 *    un pool node-postgres : **réserver un client** via `pool.connect()` et
 *    exécuter `BEGIN`, toutes les instructions puis `COMMIT` **sur ce client**.
 *    Passer par `pool.query()` est un piège : chaque appel peut emprunter une
 *    connexion différente du pool, si bien que `BEGIN`/`COMMIT` ne délimitent
 *    alors aucune transaction réelle.
 */

/** Résultat minimal partagé par `pg` (QueryResult) et PGLite (Results). */
export interface QueryResultLike {
  rows: unknown[];
}

/** Tout objet capable d'exécuter une requête paramétrée (pool, client, tx). */
export interface Queryable {
  query(
    text: string,
    params?: unknown[],
  ): Promise<QueryResultLike> | QueryResultLike;
}

/** Connexion dédiée réservée sur un pool (`pg.PoolClient`). */
export interface PoolClientLike extends Queryable {
  release(): void;
}

/** Surface minimale d'un `pg.Pool` utilisée ici. */
export interface PoolLike {
  connect(): Promise<PoolClientLike>;
}

/**
 * Surface SQL minimale, satisfaite par les backends Neon et PGLite. Les formes
 * tagged-template et `.query()` renvoient toutes deux un tableau de lignes.
 */
export interface Sql {
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
}

/**
 * `Sql` enrichi d'une transaction : `transaction(fn)` exécute `fn` sur une
 * surface SQL épinglée à UNE seule connexion, valide par `COMMIT` en cas de
 * succès, annule par `ROLLBACK` sinon (l'erreur d'origine est toujours
 * propagée).
 */
export interface DbClient extends Sql {
  transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
}

type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;

/** Enveloppe un exécuteur brut dans la surface `Sql` (tagged + `.query()`). */
export function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    // Reconstruit avec les placeholders $1, $2, … pour rester paramétré.
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i += 1) {
      const next = strings[i + 1];
      text += next === undefined ? "" : `$${i + 1}${next}`;
    }
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(
    text: string,
    params: unknown[] = [],
  ) => run<T>(text, params);
  return sql;
}

function runOnQuery(query: Queryable["query"]): Run {
  return async <T>(text: string, params: unknown[]) => {
    const result = await query(text, params);
    return result.rows as T[];
  };
}

/** Construit une surface `Sql` à partir d'un exécuteur `query`. */
export function makeTaggedSql(query: Queryable["query"]): Sql {
  return toSql(runOnQuery(query));
}

/**
 * Construit la méthode `transaction` d'un client côté **pool node-postgres**.
 *
 * Réserve une connexion (`pool.connect()`), ouvre la transaction dessus, la
 * libère dans tous les cas (`release()` en `finally`) et ne rapporte jamais de
 * succès sur un `COMMIT` échoué. Un échec de `ROLLBACK` est neutralisé pour ne
 * pas masquer l'erreur d'origine.
 */
export function makeTransaction(pool: PoolLike): DbClient["transaction"] {
  return async <T>(fn: (tx: Sql) => Promise<T>): Promise<T> => {
    // Échec de connexion : aucune ressource réservée, rien à libérer.
    const client = await pool.connect();
    try {
      await client.query("begin");
      // Surface SQL épinglée à CE client : toutes les instructions de `fn`
      // s'exécutent sur la même connexion que BEGIN/COMMIT.
      const tx = toSql(runOnQuery((text, params) => client.query(text, params)));
      const result = await fn(tx);
      // Un COMMIT qui échoue doit propager l'erreur (jamais de faux succès).
      await client.query("commit");
      return result;
    } catch (err) {
      try {
        await client.query("rollback");
      } catch {
        // Un ROLLBACK en échec ne doit pas masquer l'erreur d'origine.
      }
      throw err;
    } finally {
      client.release();
    }
  };
}
