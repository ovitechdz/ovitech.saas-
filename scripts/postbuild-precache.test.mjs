import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildPrecacheSw,
  injectPrecache,
  listBuiltAssets,
} from "./postbuild-precache.mjs";

const SW_TEMPLATE = `const CACHE_NAME = "x";
const PRECACHE = [];
console.log("hi");
`;

test("listBuiltAssets renvoie les assets hashés du build (js/css uniquement)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ovitech-precache-"));
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "assets", "index-a1b2c3.js"), "x");
  writeFileSync(join(dir, "assets", "styles-x9y8z7.css"), "x");
  writeFileSync(join(dir, "assets", "scan-q1w2e3.js"), "x");
  writeFileSync(join(dir, "assets", "bundle.js.map"), "x");
  writeFileSync(join(dir, "assets", "data.json"), "x");
  const out = listBuiltAssets(join(dir, "assets"));
  assert.deepEqual(out, [
    "/assets/index-a1b2c3.js",
    "/assets/scan-q1w2e3.js",
    "/assets/styles-x9y8z7.css",
  ]);
});

test("injectPrecache remplace le placeholder par le tableau JSON", () => {
  const out = injectPrecache(SW_TEMPLATE, ["/assets/a.js", "/assets/b.css"]);
  assert.ok(out.includes(`const PRECACHE = ["/assets/a.js","/assets/b.css"];`));
  assert.ok(out.includes(`console.log("hi");`));
  assert.doesNotMatch(out, /const PRECACHE = \[\];/);
});

test("injectPrecache lève une erreur si le placeholder est absent", () => {
  assert.throws(() => injectPrecache("const PRECACHE = [8];", []), /placeholder/);
});

test("buildPrecacheSw met à jour sw.js sur disque", () => {
  const dir = mkdtempSync(join(tmpdir(), "ovitech-precache-"));
  const assetsDir = join(dir, "assets");
  mkdirSync(assetsDir);
  writeFileSync(join(assetsDir, "index-abc.js"), "x");
  const swPath = join(dir, "sw.js");
  writeFileSync(swPath, SW_TEMPLATE);
  const res = buildPrecacheSw({ assetsDir, swPath });
  assert.equal(res.injected, 1);
  const updated = readFileSync(swPath, "utf8");
  assert.ok(updated.includes('const PRECACHE = ["/assets/index-abc.js"];'));
});

test("buildPrecacheSw skip proprement si pieces manquantes", () => {
  const dir = mkdtempSync(join(tmpdir(), "ovitech-precache-"));
  assert.equal(buildPrecacheSw({ assetsDir: join(dir, "assets"), swPath: join(dir, "sw.js") }).skipped, "sw-missing");
  const swPath = join(dir, "sw.js");
  writeFileSync(swPath, SW_TEMPLATE);
  assert.equal(buildPrecacheSw({ assetsDir: join(dir, "assets"), swPath }).skipped, "assets-missing");
});