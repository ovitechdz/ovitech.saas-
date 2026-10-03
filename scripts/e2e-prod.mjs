#!/usr/bin/env node
/**
 * E2E Playwright contre la **production** — régression post-déploiement et
 * sonde SLO (workflow `.github/workflows/e2e.yml`).
 *
 * Parcourt une liste de routes SSR, vérifie `/api/health`, et rend un verdict
 * JSON (0 = vert, 1 = échec) sur la sortie, comme `browser-smoke*.mjs` mais
 * sans dépendre du broker `/workspace`. La logique pure (parsing d'arguments,
 * politique de retry, verdict) est testée dans `e2e-prod.test.mjs`.
 *
 * Usage :
 *   node scripts/e2e-prod.mjs --base https://ovitech-saas.vercel.app [--out screenshots/e2e-prod]
 *   (base par défaut : $E2E_BASE_URL ou https://ovitech-saas.vercel.app)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { isMainModule } from "./with-app-env.mjs";

export const DEFAULT_BASE_URL = "https://ovitech-saas.vercel.app";
export const DEFAULT_OUT_DIR = "screenshots/e2e-prod";

export const E2E_ROUTES = [
  "/",
  "/label",
  "/troupeau",
  "/ration",
  "/journal",
  "/scan",
  "/sync",
  "/indicateurs",
  "/verification",
  "/sante",
];

/** Nombre de tentatives full-page (cold-start SSR) et de sonde santé. */
export const MAX_ROUTE_ATTEMPTS = 2;
export const HEALTH_ATTEMPTS = 8;
export const HEALTH_RETRY_DELAY_MS = 15000;
export const NAV_TIMEOUT_MS = 90000;

export function parseE2eArgs(argv, env) {
  const args = [...argv];
  const read = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const base = read("--base") || env.E2E_BASE_URL || DEFAULT_BASE_URL;
  const outDir = read("--out") || env.E2E_OUT_DIR || DEFAULT_OUT_DIR;
  try {
    const baseUrl = new URL(base);
    if (!["http:", "https:"].includes(baseUrl.protocol)) throw new Error("protocol");
    return { url: baseUrl.origin, outDir, routes: E2E_ROUTES };
  } catch {
    return { error: `invalid --base URL: ${base}` };
  }
}

export function shouldRetryPage(status, attempt) {
  // Une page jamais livrée (réseau/cold-start/réseau de CDN) bénéficie d'une
  // seconde tentative d'un POSTE propre — jamais d'un 404/500 volontaire.
  return attempt < MAX_ROUTE_ATTEMPTS - 1 && status === null;
}

export function routeExit(status, bodyTextLen, pageErrors) {
  if (status !== null && status >= 400) return `HTTP ${status}`;
  if (bodyTextLen === 0) return "body vide (échec de rendu SSR)";
  if (pageErrors.length > 0) return `page error: ${String(pageErrors[0]).slice(0, 160)}`;
  return null;
}

export function buildVerdict({ base, routes, health }) {
  const failed = routes.filter((r) => !r.ok);
  const ok = failed.length === 0 && health?.ok === true;
  const failedPaths = failed.map((r) => r.path);
  if (health && health.ok !== true) failedPaths.push("/api/health");
  return { ok, base, timestamp: new Date().toISOString(), failedPaths, routes };
}

async function probeHealth(base) {
  let attempts = 0;
  let res = null;
  while (attempts < HEALTH_ATTEMPTS) {
    attempts += 1;
    try {
      res = await fetch(new URL("/api/health", base), { signal: AbortSignal.timeout(15000) });
    } catch {
      res = null;
    }
    try {
      const body = res && res.status === 200 ? await res.json() : null;
      if (res && res.status === 200 && body && body.status === "ok") {
        return { ok: true, status: 200, db: body.db, commit: body.commit };
      }
    } catch {
      // corps illisible = probe échouée, on retente
    }
    if (attempts < HEALTH_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, HEALTH_RETRY_DELAY_MS));
    }
  }
  return {
    ok: false,
    status: res ? (res.status ?? "down") : "down",
    commit: null,
    db: null,
  };
}

async function checkRoute(browser, base, path) {
  const failures = [];
  let final = null;
  for (let attempt = 0; attempt < MAX_ROUTE_ATTEMPTS; attempt += 1) {
    const page = await browser.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (err) => pageErrors.push(String(err?.message ?? err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    let status = null;
    try {
      const resp = await page.goto(new URL(path, base).toString(), {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      });
      status = resp?.status() ?? null;
      await page.waitForTimeout(400);
      const bodyTextLen = (await page.locator("body").innerText().catch(() => "")).length;
      const titleLen = (await page.title().catch(() => "")).length;
      const failure = routeExit(status, bodyTextLen, pageErrors);
      final = { path, status, titleLen, bodyTextLen, failure, attempt, pageErrors, consoleErrors };
      if (!failure) {
        return final;
      }
      failures.push(failure);
      await page.close();
    } catch (err) {
      final = {
        path,
        status: null,
        failure: String(err?.message ?? err).slice(0, 200),
        attempt,
        pageErrors,
        consoleErrors,
      };
      failures.push(final.failure);
      await page.close();
    }
    if (!shouldRetryPage(status, attempt)) break;
  }
  return { ...final, ok: false, failure: failures[0] ?? "unknown" };
}

async function main() {
  const cfg = parseE2eArgs(process.argv.slice(2), process.env);
  if (cfg.error) {
    console.error(JSON.stringify({ ok: false, error: cfg.error }, null, 2));
    process.exit(1);
  }
  const { url, outDir, routes } = cfg;
  mkdirSync(outDir, { recursive: true });

  const health = await probeHealth(url);

  let browser = null;
  let routeResults = [];
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    for (const path of routes) {
      const result = await checkRoute(browser, url, path);
      result.ok = !result.failure;
      result.failure = result.failure ?? null;
      if (result.ok && result.status != null) {
        const page = await browser.newPage();
        try {
          await page.setViewportSize({ width: 1280, height: 800 });
          await page.goto(new URL(path, url).toString(), {
            waitUntil: "domcontentloaded",
            timeout: NAV_TIMEOUT_MS,
          });
          await page.waitForTimeout(400);
          await page.screenshot({ path: join(outDir, `${path.replaceAll("/", "_") || "home"}.png`) });
        } catch {
          // screenshot evidence = best-effort
        }
        await page.close();
      }
      routeResults.push(result);
    }
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: String(err?.message ?? err) }, null, 2));
    process.exit(1);
  } finally {
    await browser?.close();
  }

  const verdict = buildVerdict({ base: url, routes: routeResults, health });
  const verdictPath = join(outDir, "verdict.json");
  writeFileSync(verdictPath, JSON.stringify(verdict, null, 2));
  console.log(JSON.stringify(verdict, null, 2));
  process.exitCode = verdict.ok ? 0 : 1;
}

if (isMainModule(import.meta.url)) {
  await main();
}