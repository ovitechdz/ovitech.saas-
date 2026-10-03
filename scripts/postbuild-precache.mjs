import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const PLACEHOLDER = "const PRECACHE = [];";

export function listBuiltAssets(assetsDir) {
  if (!existsSync(assetsDir)) return [];
  return readdirSync(assetsDir)
    .filter((f) => /\.(?:js|mjs|css)$/.test(f))
    .sort()
    .map((f) => "/assets/" + f);
}

export function injectPrecache(swSource, assets) {
  const next = swSource.replace(PLACEHOLDER, `const PRECACHE = ${JSON.stringify(assets)};`);
  if (next === swSource) {
    throw new Error("[postbuild-precache] placeholder introuvable dans sw.js");
  }
  return next;
}

export function buildPrecacheSw({ assetsDir, swPath }) {
  if (!existsSync(swPath)) return { injected: 0, skipped: "sw-missing" };
  if (!existsSync(assetsDir)) return { injected: 0, skipped: "assets-missing" };
  const assets = listBuiltAssets(assetsDir);
  const next = injectPrecache(readFileSync(swPath, "utf8"), assets);
  writeFileSync(swPath, next);
  return { injected: assets.length };
}

const IS_CLI =
  fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "");

if (IS_CLI) {
  const result = buildPrecacheSw({
    assetsDir: join(process.cwd(), ".vercel", "output", "static", "assets"),
    swPath: join(process.cwd(), ".vercel", "output", "static", "sw.js"),
  });
  console.log("[postbuild-precache] " + JSON.stringify(result));
}