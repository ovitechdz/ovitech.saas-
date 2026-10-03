#!/usr/bin/env node
/**
 * Deploy-time database migrator (node-postgres, `pg`).
 *
 * Runs during `npm run build` — on every Vercel deploy — applying pending files
 * in ../migrations to DATABASE_URL. Each file is applied in one transaction and
 * recorded in a `_migrations` table, so it runs once and is safe to re-run.
 *
 * The read is non-recursive, so the opt-in auth schema under migrations/auth/
 * is not applied to an app that never asked for sign-in.
 *
 * No DATABASE_URL (local / preview builds) -> skip; the PGLite fallback applies
 * the same files at startup instead (see src/lib/db.ts).
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import {
  isMigrationFile,
  migrationName,
  migrationDigest,
  normalizeMigrationSql,
  pendingMigrations,
} from "./migration-plan.mjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log(
    "[migrate] DATABASE_URL not set — skipping (the PGLite fallback migrates itself).",
  );
  process.exit(0);
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  let entries;
  try {
    entries = await readdir(migrationsDir, { recursive: true, withFileTypes: true });
  } catch {
    console.log("[migrate] no migrations/ directory — nothing to do.");
    return;
  }
  const migrationPaths = entries
    .filter((e) => e.isFile() && isMigrationFile(e.name))
    .map((e) => {
      const p = e.parentPath ?? migrationsDir;
      return p === migrationsDir ? e.name : `${p.replace(migrationsDir + "/", "")}/${e.name}`;
    });
  // An app with no schema of its own must not pay for a database connection.
  if (pendingMigrations(migrationPaths, []).length === 0) {
    console.log("[migrate] no migrations — nothing to do.");
    return;
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    await client.query(
      "ALTER TABLE _migrations ADD COLUMN IF NOT EXISTS content_sha256 TEXT",
    );
    const applied = new Map(
      (
        await client.query("SELECT name, content_sha256 FROM _migrations")
      ).rows.map((r) => [r.name, r.content_sha256]),
    );

    // Rideau de sécurité : un fichier déjà appliqué ne doit jamais avoir
    // changé — un écart = drift silencieux, on refuse d'avancer.
    for (const relPath of migrationPaths) {
      const recorded = applied.get(migrationName(relPath));
      if (recorded == null) continue;
      const text = await readFile(join(migrationsDir, relPath), "utf8");
      const digest = migrationDigest(text);
      if (recorded !== digest) {
        throw new Error(
          `${relPath} a été modifié après application (checksum ${recorded} -> ${digest}) — revert ou nouvelle migration requise`,
        );
      }
    }

    let count = 0;
    for (const { name, path: relPath } of pendingMigrations(migrationPaths, applied.keys())) {
      const source = await readFile(join(migrationsDir, relPath), "utf8");
      const text = normalizeMigrationSql(source);
      try {
        await client.query("BEGIN");
        // pg's simple-query protocol runs a whole multi-statement file at once.
        await client.query(text);
        await client.query(
          "INSERT INTO _migrations (name, content_sha256) VALUES ($1, $2)",
          [name, migrationDigest(source)],
        );
        await client.query("COMMIT");
      } catch (err) {
        console.error(`[migrate] error applying ${name}`);
        try {
          await client.query("ROLLBACK");
        } catch {
          // ROLLBACK fails when the connection died — keep the original error.
        }
        throw err;
      }
      console.log(`[migrate] applied ${name}`);
      count += 1;
    }
    console.log(count ? `[migrate] done — ${count} migration(s) applied.` : "[migrate] up to date.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err?.message || err);
  // pg errors carry the context needed to debug a bad SQL file.
  for (const key of ["code", "detail", "hint", "position", "where"]) {
    if (err?.[key] != null) console.error(`[migrate]   ${key}: ${err[key]}`);
  }
  process.exit(1);
});
