/**
 * Sonde de santé `/api/health` — première ligne du monitoring (SRE).
 *
 * Répond en JSON `200 {status:"ok"}` ou `503 {status:"degraded"}`. Un
 * uptime-checker externe (UptimeRobot, Betterstack…) pointe ici : toute
 * indisponibilité ou base injoignable déclenche l'alerte.
 *
 * Sûreté cruciale : la sonde n'importe **JAMAIS** `src/lib/db.ts`. Ce module
 * amorce PGLite à l'import (eager boot) et, dans un environnement sans
 * `pglite.data` embarqué, cela lève une rejection non rattrapée qui tue le
 * worker. La sonde pinge donc la base **Neon** (`DATABASE_URL`) via `pg`
 * directement — le seul chemin critique en production — et signale le fallback
 * PGLite informativement (non critique, non pingé). Aucune donnée sensible
 * n'est reflétée (jamais l'erreur brute ni le DSN, message tronqué en logs).
 *
 * Couches : serveur (Nitro/TanStack Start), monitoring. Aucun impact client.
 */
import {
  buildHealthPayload,
  type HealthChecks,
} from "../../../src/lib/health-check.server.ts";

/** Bornes temporelles pour que la sonde ne monopolise jamais un worker long. */
export const HEALTH_DB_TIMEOUT_MS = 2500;

const startedAt = Date.now();

function hasNeon(): boolean {
  const raw = process.env.DATABASE_URL;
  return Boolean(raw && raw.trim());
}

async function pingNeon(): Promise<HealthChecks["db"]> {
  const t0 = performance.now();
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: HEALTH_DB_TIMEOUT_MS,
    });
    try {
      await pool.query("select 1 as ok");
      return {
        source: "neon",
        ok: true,
        latencyMs: performance.now() - t0,
        critical: true,
      };
    } finally {
      await pool.end();
    }
  } catch (err) {
    console.error(
      "[health] neo db ping failed:",
      String(err instanceof Error ? err.message : err).slice(0, 160),
    );
    return { source: "neon", ok: false, latencyMs: null, critical: true };
  }
}

export default async function healthHandler(): Promise<Response> {
  // Neon est le chemin critique ; sans lui l'app tourne sur le fallback PGLite
  // (base embarquée, non partagée) qui n'a pas de sens pour une sonde plateforme.
  const db: HealthChecks["db"] = hasNeon()
    ? await pingNeon()
    : { source: "pglite", ok: false, latencyMs: null, critical: false };
  const payload = buildHealthPayload({
    commit:
      process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.SOURCE_VERSION ?? "dev",
    env: process.env.VERCEL_ENV ?? "development",
    region: process.env.VERCEL_REGION ?? "local",
    db,
    uptimeSec: (Date.now() - startedAt) / 1000,
    rssMb: (typeof process.memoryUsage === "function"
      ? process.memoryUsage().rss
      : 0) / 1024 ** 2,
  });
  return Response.json(payload, {
    status: payload.status === "ok" ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}