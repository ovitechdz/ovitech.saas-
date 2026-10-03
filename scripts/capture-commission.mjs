#!/usr/bin/env node
/**
 * Produces the commission capture pack: one PNG per MVP-loop page, desktop
 * and mobile viewports, written under ./screenshots.
 *
 *   node scripts/capture-commission.mjs [--url http://127.0.0.1:8080] [--out screenshots]
 *
 * Reuses scripts/browser-guard.mjs so the target stays loopback and the output
 * stays inside the allowed directory.
 */
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { checkedOutputPath, checkedUrl } from "./browser-guard.mjs";

const argv = process.argv.slice(2);
const urlArg = argv.find((a) => a.startsWith("--url="))?.slice("--url=".length) ?? process.env.CAPTURE_URL;
const outArg = argv.find((a) => a.startsWith("--out="))?.slice("--out=".length) ?? "screenshots";

const url = checkedUrl(urlArg ?? "http://127.0.0.1:8080");
const outDir = checkedOutputPath(resolve(outArg), [resolve()]);

const PAGES = [
  { slug: "accueil", path: "/" },
  { slug: "scan", path: "/scan" },
  { slug: "journee", path: "/journee" },
  { slug: "troupeau", path: "/troupeau" },
  { slug: "sante", path: "/sante" },
  { slug: "ecosysteme", path: "/ecosysteme" },
  { slug: "ecosysteme-cameras", path: "/ecosysteme/cameras" },
  { slug: "ecosysteme-portails", path: "/ecosysteme/portails" },
  { slug: "ecosysteme-balance", path: "/ecosysteme/balance" },
  { slug: "ecosysteme-iot", path: "/ecosysteme/iot" },
  { slug: "nutrition", path: "/nutrition" },
  { slug: "ration", path: "/ration" },
  { slug: "fourrage", path: "/fourrage" },
  { slug: "energie", path: "/energie" },
  { slug: "indicateurs", path: "/indicateurs" },
  { slug: "sync", path: "/sync" },
  { slug: "preuve", path: "/preuve" },
  { slug: "verification", path: "/verification" },
  { slug: "journal", path: "/journal" },
  { slug: "label", path: "/label" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

mkdirSync(outDir, { recursive: true });

let browser = null;
let failed = 0;
try {
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    for (const p of PAGES) {
      try {
        await page.goto(url + p.path, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(900);
        const out = join(outDir, `commission-${p.slug}-${vp.name}.png`);
        await page.screenshot({ path: out, fullPage: false });
        console.log(`ok ${p.slug} ${vp.name} -> ${out}`);
      } catch (err) {
        failed += 1;
        console.error(`fail ${p.slug} ${vp.name}: ${String(err?.message ?? err)}`);
      }
    }
    await page.close();
  }
} finally {
  await browser?.close();
}

console.log(failed === 0 ? "capture pack complete" : `capture pack partial (${failed} failures)`);
process.exitCode = failed === 0 ? 0 : 1;