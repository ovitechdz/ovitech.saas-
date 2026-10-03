import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_BASE_URL,
  E2E_ROUTES,
  buildVerdict,
  parseE2eArgs,
  routeExit,
  shouldRetryPage,
} from "./e2e-prod.mjs";

describe("parseE2eArgs", () => {
  it("defaults to the production URL", () => {
    const cfg = parseE2eArgs([], {});
    assert.equal(cfg.error, undefined);
    assert.equal(cfg.url, DEFAULT_BASE_URL);
    assert.deepEqual(cfg.routes, E2E_ROUTES);
  });

  it("honours --base, normalises to the origin", () => {
    const cfg = parseE2eArgs(["--base", "https://ovitech-saas.vercel.app/label"], {});
    assert.equal(cfg.url, "https://ovitech-saas.vercel.app");
  });

  it("honours E2E_BASE_URL and --out", () => {
    const cfg = parseE2eArgs(["--out", "tmp/e2e"], { E2E_BASE_URL: "http://localhost:8081" });
    assert.equal(cfg.url, "http://localhost:8081");
    assert.equal(cfg.outDir, "tmp/e2e");
  });

  it("rejects a malformed base", () => {
    const cfg = parseE2eArgs(["--base", "nope::"], {});
    assert.match(cfg.error ?? "", /invalid --base/);
  });
});

describe("route failed helpers", () => {
  it("shouldRetryPage retries a never-delivered page once", () => {
    assert.equal(shouldRetryPage(null, 0), true);
    assert.equal(shouldRetryPage(null, 1), false);
  });

  it("shouldRetryPage never retries a served 5xx", () => {
    assert.equal(shouldRetryPage(500, 0), false);
    assert.equal(shouldRetryPage(404, 0), false);
  });

  it("routeExit flags HTTP errors, empty bodies and page errors", () => {
    assert.match(routeExit(503, 10, []) ?? "", /503/);
    assert.match(routeExit(200, 0, []) ?? "", /vide/);
    assert.match(routeExit(200, 10, ["boom"]) ?? "", /page error/);
    assert.equal(routeExit(200, 10, []), null);
  });
});

describe("buildVerdict", () => {
  const okRoute = { path: "/", ok: true, status: 200, failure: null };
  it("is ok only when every route and the health probe pass", () => {
    assert.equal(
      buildVerdict({ base: "x", routes: [okRoute], health: { ok: true } }).ok,
      true,
    );
    assert.equal(
      buildVerdict({ base: "x", routes: [okRoute], health: { ok: false } }).ok,
      false,
    );
  });

  it("collects the failing paths", () => {
    const v = buildVerdict({
      base: "x",
      routes: [
        okRoute,
        { path: "/label", ok: false, status: 500, failure: "HTTP 500" },
      ],
      health: { ok: true },
    });
    assert.equal(v.ok, false);
    assert.deepEqual(v.failedPaths, ["/label"]);
  });
});