/* Grille de cohérence i18n : les trois locales doivent partager le même jeu
 * de clés (aucune clé manquante ni orpheline) et les mêmes variables
 * d'interpolation. Détecte aussi les clés dupliquées (l'écrasement silencieux
 * d'une chaîne par un objet casse les rendus). Usage : node scripts/check-i18n.mjs */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const LOCALE_DIR = resolve("src/i18n/locales");
const FILES = ["fr.json", "en.json", "ar.json"];

function collectKeys(obj, prefix = "", out = []) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      collectKeys(value, path, out);
    } else {
      out.push(path);
    }
  }
  return out;
}

function collectVars(text) {
  const vars = new Set();
  for (const match of String(text).matchAll(/\{\{(\w+)\}\}/g)) {
    vars.add(match[1]);
  }
  return vars;
}

function valueAt(obj, path) {
  return path.split(".").reduce((o, part) => (o && typeof o === "object" ? o[part] : undefined), obj);
}

function findDuplicateKeys(text) {
  const problems = [];
  let pos = 0;
  const n = text.length;

  function skipWs() {
    while (pos < n && /[ \t\r\n]/.test(text[pos])) pos++;
  }

  function readString() {
    pos++;
    let out = "";
    while (pos < n) {
      const c = text[pos];
      if (c === '"') { pos++; break; }
      if (c === "\\") { out += text[pos + 1]; pos += 2; continue; }
      out += c; pos++;
    }
    return out;
  }

  function parseValue(path) {
    skipWs();
    const c = text[pos];
    if (c === '"') readString();
    else if (c === "{") parseObject(path);
    else if (c === "[") {
      pos++;
      while (pos < n && text[pos] !== "]") {
        parseValue(`${path}[]`);
        skipWs();
        if (text[pos] === ",") pos++;
      }
      pos++;
    } else {
      while (pos < n && !/[,\]}[\s]/.test(text[pos])) pos++;
    }
    skipWs();
  }

  function parseObject(path) {
    pos++;
    const keys = new Set();
    skipWs();
    while (pos < n && text[pos] !== "}") {
      skipWs();
      if (text[pos] !== '"') throw new Error(`clé attendue à la position ${pos}`);
      const key = readString();
      const full = path ? `${path}.${key}` : key;
      if (keys.has(key)) problems.push(full);
      keys.add(key);
      skipWs();
      if (text[pos] === ":") pos++;
      parseValue(full);
      skipWs();
      if (text[pos] === ",") { pos++; skipWs(); }
    }
    if (pos < n && text[pos] === "}") pos++;
  }

  parseValue("");
  return problems;
}

async function main() {
  const bundles = {};
  const raws = {};
  for (const file of FILES) {
    raws[file] = await readFile(resolve(LOCALE_DIR, file), "utf8");
    bundles[file] = JSON.parse(raws[file]);
  }

  for (const file of FILES) {
    const dups = findDuplicateKeys(raws[file]);
    if (dups.length) {
      console.error(
        `${file} : ${dups.length} clé(s) dupliquée(s) — la dernière occurrence écrase la précédente ` +
          `(risque : chaîne écrasée par un objet) :`,
      );
      for (const d of dups) console.error(`  - ${d}`);
      process.exit(1);
    }
  }

  const keySets = Object.fromEntries(
    FILES.map((file) => [file, new Set(collectKeys(bundles[file]))]),
  );

  const reference = FILES[0];
  const base = keySets[reference];
  const errors = [];

  for (const file of FILES.slice(1)) {
    for (const key of base) {
      if (!keySets[file].has(key)) {
        errors.push(`${file} : clé manquante « ${key} »`);
      }
    }
    for (const key of keySets[file]) {
      if (!base.has(key)) {
        errors.push(`${file} : clé orpheline « ${key} » (absente de ${reference})`);
      }
    }
  }

  for (const key of base) {
    const varsSets = FILES.map((file) => collectVars(valueAt(bundles[file], key)));
    const first = varsSets[0];
    for (let i = 1; i < varsSets.length; i += 1) {
      const missing = [...first].filter((v) => !varsSets[i].has(v));
      const extra = [...varsSets[i]].filter((v) => !first.has(v));
      if (missing.length || extra.length) {
        errors.push(
          `${FILES[i]} : variables divergentes pour « ${key} » ` +
            `(manquantes : ${missing.join(", ") || "—"} ; en trop : ${extra.join(", ") || "—"})`,
        );
      }
    }
  }

  if (errors.length) {
    console.error(`check-i18n — ${errors.length} incohérence(s) :`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const summary = FILES.map((f) => `${f} (${keySets[f].size} clés)`).join(", ");
  console.log(`check-i18n OK — ${summary} — jeux de clés et variables identiques.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});