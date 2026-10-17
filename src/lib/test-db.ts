/**
 * Aide de test base de données (PGLite) — **réservée aux `*.test.ts`**, jamais
 * importée par l'application.
 *
 * - `pgliteSql` adapte une instance PGlite à la surface `TaggedSql` de l'app
 *   (tagged template → placeholders `$n`, comme `@/lib/db`).
 * - `pgliteTransaction` exécute un callback dans une vraie transaction PGLite
 *   (via `pg.transaction`), miroir de `sql.transaction` côté serveur — pour les
 *   tests de rollback atomique.
 * - `readMigration` lit un fichier de `migrations/` (source unique du schéma),
 *   BOM retiré, pour que les tests exercent le schéma réel de production.
 */
import { readFile } from "node:fs/promises";
import type { PGlite } from "@electric-sql/pglite";
import type { TaggedSql } from "./sync-apply.ts";

export function pgliteSql(pg: PGlite): TaggedSql {
  return (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i += 1) {
      text += `$${i + 1}${strings[i + 1] ?? ""}`;
    }
    const result = await pg.query<T>(text, values);
    return result.rows;
  }) as TaggedSql;
}

/**
 * Exécute `fn` dans une transaction PGLite réelle ; toute exception annule
 * (ROLLBACK) et est repropagée — comportement identique à
 * `makeTransaction`/`sql.transaction` côté serveur.
 */
export function pgliteTransaction(
  pg: PGlite,
): <T>(fn: (tx: TaggedSql) => Promise<T>) => Promise<T> {
  return <T>(fn: (tx: TaggedSql) => Promise<T>) =>
    pg.transaction((tx) => fn(pgliteSql(tx as unknown as PGlite)));
}

export async function readMigration(name: string): Promise<string> {
  const url = new URL(`../../migrations/${name}`, import.meta.url);
  const content = await readFile(url, "utf8");
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}
