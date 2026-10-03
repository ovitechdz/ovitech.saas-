import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const LOCALE_DIR = resolve("src/i18n/locales");
const FRAGMENT_DIR = resolve("scripts/i18n");
const FRAGMENTS = ["app"];

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepMerge(base, extra) {
  const out = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    if (isObject(value) && isObject(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

for (const file of ["fr.json", "en.json", "ar.json"]) {
  const path = resolve(LOCALE_DIR, file);
  const base = JSON.parse(await readFile(path, "utf8"));
  let merged = base;
  for (const frag of FRAGMENTS) {
    const fragPath = resolve(FRAGMENT_DIR, `${frag}.${file.replace(".json", "")}.json`);
    try {
      const extra = JSON.parse(await readFile(fragPath, "utf8"));
      merged = deepMerge(merged, extra);
    } catch {
      console.error(`Fragment manquant : ${fragPath}`);
      process.exit(1);
    }
  }
  await writeFile(path, JSON.stringify(merged, null, 2) + "\n", "utf8");
  console.log(`Mergé : ${file}`);
}