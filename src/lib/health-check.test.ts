import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HEALTH_APP_NAME,
  buildHealthPayload,
  type HealthChecks,
} from "./health-check.server.ts";

const okChecks: HealthChecks = {
  commit: "abc1234",
  env: "production",
  region: "iad1",
  db: { source: "neon", ok: true, latencyMs: 12.34, critical: true },
  uptimeSec: 125.9,
  rssMb: 88.6,
};

describe("buildHealthPayload", () => {
  it("builds the normed payload with rounded metrics", () => {
    const payload = buildHealthPayload(okChecks);
    assert.equal(payload.status, "ok");
    assert.equal(payload.app, HEALTH_APP_NAME);
    assert.equal(payload.commit, "abc1234");
    assert.equal(payload.env, "production");
    assert.equal(payload.region, "iad1");
    assert.deepEqual(payload.db, { source: "neon", ok: true, latencyMs: 12 });
    assert.equal(payload.uptimeSec, 125);
    assert.equal(payload.rssMb, 89);
    assert.match(payload.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  });

  it("defaults missing platform fields instead of leaking nulls", () => {
    const payload = buildHealthPayload({
      commit: "",
      env: "",
      region: "",
      db: { source: "pglite", ok: true, latencyMs: 1.2, critical: false },
      uptimeSec: 1,
      rssMb: 1,
    });
    assert.equal(payload.commit, "dev");
    assert.equal(payload.env, "development");
    assert.equal(payload.region, "local");
  });

  it("degraded when the critical database check fails, without any raw error", () => {
    const payload = buildHealthPayload({
      ...okChecks,
      db: { source: "neon", ok: false, latencyMs: null, critical: true },
    });
    assert.equal(payload.status, "degraded");
    assert.equal(payload.db.ok, false);
    assert.equal(payload.db.latencyMs, null);
    const json = JSON.stringify(payload);
    assert.ok(!json.includes("password"));
    assert.ok(!json.includes("host="));
  });

  it("stays ok on the non-critical PGLite fallback even if the ping fails", () => {
    const payload = buildHealthPayload({
      ...okChecks,
      db: { source: "pglite", ok: false, latencyMs: null, critical: false },
    });
    assert.equal(payload.status, "ok");
    assert.equal(payload.db.ok, false);
  });
});