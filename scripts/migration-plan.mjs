// @ts-check
import { createHash } from "node:crypto";

/**
 * Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
 * (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
 *
 * Applied files are keyed by BASENAME, so the same file applies once no matter
 * which directory it is globbed from. That is what makes the auth schema safe to
 * copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
 * a database that already has `0001_auth.sql` will not re-run it.
 *
 * Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
 * out of scope for both until it is copied up.
 */

/**
 * The `_migrations` key for a migration path (or bare filename).
 * @param {string} path
 * @returns {string}
 */
export function migrationName(path) {
  return path.split("/").pop() ?? path;
}

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isMigrationFile(path) {
  return path.endsWith(".sql");
}

/**
 * SHA-256 of a migration body. Rideau de sécurité : un fichier déjà appliqué
 * qui serait modifié doit échouer plutôt que de dériver en silence.
 * @param {string} content
 * @returns {string}
 */
export function migrationDigest(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/** Remove a UTF-8 BOM from the SQL payload without changing any other text. */
/**
 * @param {string} content
 * @returns {string}
 */
export function normalizeMigrationSql(content) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

// animals references farms, so its schema migration requires farms first.
const migrationPrerequisites = new Map([["app_core.sql", ["farms_memberships.sql"]]]);

/**
 * Migrations in `paths` that are not yet in `applied`, in apply order
 * (numérique d'abord — `0002_*` passe avant `0010_*`, contrairement à un tri
 * alphabétique).
 * @param {Iterable<string>} paths
 * @param {Iterable<string>} applied
 * @returns {Array<{ name: string, path: string }>}
 */
export function pendingMigrations(paths, applied) {
  const done = new Set(applied);
  const migrations = [...paths]
    .filter(isMigrationFile)
    .map((path) => ({ name: migrationName(path), path }))
    .sort((a, b) => {
      const na = migrationOrder(a.name);
      const nb = migrationOrder(b.name);
      if (na.num !== nb.num) return na.num - nb.num;
      return a.name.localeCompare(b.name);
    });
  const available = new Set(migrations.map(({ name }) => name));
  const remaining = migrations.filter(({ name }) => !done.has(name));
  const ordered = [];
  const scheduled = new Set(done);

  while (remaining.length > 0) {
    const index = remaining.findIndex(({ name }) => {
      for (const prerequisite of migrationPrerequisites.get(name) ?? []) {
        if (scheduled.has(prerequisite)) continue;
        if (!available.has(prerequisite)) {
          throw new Error(
            `Migration ${name} requires ${prerequisite}, which is missing and not recorded as applied`,
          );
        }
        return false;
      }
      return true;
    });
    if (index < 0) {
      throw new Error(
        `Cyclic migration dependencies: ${remaining.map(({ name }) => name).join(", ")}`,
      );
    }
    const [next] = remaining.splice(index, 1);
    if (next === undefined) break;
    ordered.push(next);
    scheduled.add(next.name);
  }

  return ordered;
}

/**
 * Préfixe numérique optionnel (`10_foo.sql` → 10 ; sinon Infinity).
 * @param {string} name
 */
function migrationOrder(name) {
  const m = /^(\d+)/.exec(name);
  return {
    /** @type {number} */
    num: m ? Number.parseInt(m[1] ?? "", 10) : Number.MAX_SAFE_INTEGER,
    name,
  };
}
