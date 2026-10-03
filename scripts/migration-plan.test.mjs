import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  isMigrationFile,
  migrationDigest,
  migrationName,
  normalizeMigrationSql,
  pendingMigrations,
} from "./migration-plan.mjs";
import { projectRoot } from "./with-app-env.mjs";

const AUTH_MIGRATION = "0001_auth.sql";

/**
 * The auth-on copy of the Better Auth schema and its source, or null when the
 * app has not turned sign-in on (the shipped state).
 */
function authSchemaCopy(root) {
  const copy = join(root, "migrations", AUTH_MIGRATION);
  const source = join(root, "migrations/auth", AUTH_MIGRATION);
  if (!existsSync(copy) || !existsSync(source)) return null;
  return { copy: readFileSync(copy, "utf8"), source: readFileSync(source, "utf8") };
}

test("_migrations keys on basename, not path", () => {
  assert.equal(migrationName("/migrations/0002_todos.sql"), "0002_todos.sql");
  assert.equal(migrationName("migrations/auth/0001_auth.sql"), "0001_auth.sql");
  assert.equal(migrationName("0001_auth.sql"), "0001_auth.sql");
});

test("a file already applied from another directory does not re-apply", () => {
  // The auth-on path copies migrations/auth/0001_auth.sql into the globbed
  // directory; a database that already has it must not run it twice.
  assert.deepEqual(pendingMigrations(["/migrations/0001_auth.sql"], ["0001_auth.sql"]), []);
});

test("pending migrations are returned in name order", () => {
  assert.deepEqual(
    pendingMigrations(
      ["/migrations/0003_c.sql", "/migrations/0001_a.sql", "/migrations/0002_b.sql"],
      ["0001_a.sql"],
    ),
    [
      { name: "0002_b.sql", path: "/migrations/0002_b.sql" },
      { name: "0003_c.sql", path: "/migrations/0003_c.sql" },
    ],
  );
});

test("pending migrations sort numerically (0002 before 0010)", () => {
  // Un tri alphabétique mettrait 0010_* avant 0002_* — l'ordre doit suivre le
  // préfixe numérique.
  assert.deepEqual(
    pendingMigrations(
      ["/migrations/0010_z.sql", "/migrations/0002_b.sql", "/migrations/0001_a.sql"],
      [],
    ).map((m) => m.name),
    ["0001_a.sql", "0002_b.sql", "0010_z.sql"],
  );
  assert.deepEqual(
    pendingMigrations(["/migrations/10_z.sql", "/migrations/2_b.sql"], []).map(
      (m) => m.name,
    ),
    ["2_b.sql", "10_z.sql"],
  );
});

test("farm schema migration precedes app_core and applied prerequisites are not repeated", () => {
  const paths = ["/migrations/app_core.sql", "/migrations/farms_memberships.sql"];
  assert.deepEqual(
    pendingMigrations(paths, []).map(({ name }) => name),
    ["farms_memberships.sql", "app_core.sql"],
  );
  assert.deepEqual(
    pendingMigrations(paths, ["farms_memberships.sql"]).map(({ name }) => name),
    ["app_core.sql"],
  );
});

test("migration SQL normalization removes exactly one leading BOM", () => {
  const unchanged = "\ncreate table t (id int);\n";
  assert.equal(normalizeMigrationSql(unchanged), unchanged);
  assert.equal(normalizeMigrationSql("\uFEFFcreate table t (id int);"), "create table t (id int);");
  assert.equal(normalizeMigrationSql("\uFEFF\uFEFFsql"), "\uFEFFsql");
});

test("migrationDigest est un sha-256 stable et sensible au contenu", () => {
  const d1 = migrationDigest("create table t ();\n");
  const d2 = migrationDigest("create table t ();\n");
  const d3 = migrationDigest("create table t (x int);\n");
  assert.equal(d1, d2);
  assert.equal(d1.length, 64);
  assert.match(d1, /^[0-9a-f]{64}$/);
  assert.notEqual(d1, d3);
});

test("non-.sql entries are dropped (readdir also yields the auth/ directory)", () => {
  assert.equal(isMigrationFile("auth"), false);
  assert.deepEqual(pendingMigrations(["auth", "README.md"], []), []);
});

test("root migrations and the nested auth source are in their expected locations", () => {
  const migrationsDir = join(projectRoot(), "migrations");
  assert.deepEqual(
    readdirSync(migrationsDir).filter(isMigrationFile).sort(),
    ["app_core.sql", "farms_memberships.sql"],
  );
  assert.ok(readdirSync(join(migrationsDir, "auth")).includes("0001_auth.sql"));
});

test("this workspace's auth schema copy is byte-identical to its source", () => {
  // An edited copy diverges silently: basename keying skips it on a database
  // that already ran the original, and applies it on a fresh PGLite preview.
  const pair = authSchemaCopy(projectRoot());
  if (pair === null) return; // sign-in off — nothing has been copied up
  assert.equal(
    pair.copy,
    pair.source,
    "migrations/0001_auth.sql has been edited — it must stay a verbatim copy of migrations/auth/0001_auth.sql",
  );
});

test("the copy check reads both files and catches an edit", () => {
  const root = mkdtempSync(join(tmpdir(), "auth-schema-"));
  mkdirSync(join(root, "migrations/auth"), { recursive: true });
  writeFileSync(join(root, "migrations/auth", AUTH_MIGRATION), "create table t ();\n");
  assert.equal(authSchemaCopy(root), null);

  writeFileSync(join(root, "migrations", AUTH_MIGRATION), "create table t ();\n");
  const same = authSchemaCopy(root);
  assert.equal(same.copy, same.source);

  writeFileSync(join(root, "migrations", AUTH_MIGRATION), "create table t (x int);\n");
  const drifted = authSchemaCopy(root);
  assert.notEqual(drifted.copy, drifted.source);
});
