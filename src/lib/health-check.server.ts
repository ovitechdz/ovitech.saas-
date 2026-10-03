/**
 * Observabilité / SRE — construction du payload de la sonde `/api/health`.
 *
 * Purement déterministe (aucun accès réseau) pour être couvert par des tests
 * unitaires : la route `server/routes/api/health.ts` fournit les faits mesurés
 * (ping base, commit, uptime, RSS), ce module construit la réponse JSON normée
 * et le statut associé. Aucune donnée sensible n'est reflétée — notamment
 * jamais l'erreur base brute (elle peut contenir un DSN).
 */

export const HEALTH_APP_NAME = "ovitech";

export type HealthStatus = "ok" | "degraded";

export interface HealthChecks {
  commit: string;
  env: string;
  region: string;
  db: {
    source: string;
    ok: boolean;
    latencyMs: number | null;
    /** True quand la base fait partie du chemin critique (Neon via DATABASE_URL). */
    critical: boolean;
  };
  uptimeSec: number;
  rssMb: number;
}

export interface HealthPayload {
  status: HealthStatus;
  app: string;
  commit: string;
  env: string;
  region: string;
  db: {
    source: string;
    ok: boolean;
    latencyMs: number | null;
  };
  uptimeSec: number;
  rssMb: number;
  timestamp: string;
}

/**
 * Statut global : 503 uniquement quand un composant **critique** est dégradé.
 * Le fallback PGLite (« rien de configuré ») est informatif — l'app est conçue
 * pour tourner sans base serveur dans ce mode ; seuls les échecs Neon doivent
 * déclencher une alarme.
 */
export function buildHealthPayload(checks: HealthChecks): HealthPayload {
  const degraded =
    checks.db.critical && !checks.db.ok;
  return {
    status: degraded ? "degraded" : "ok",
    app: HEALTH_APP_NAME,
    commit: checks.commit || "dev",
    env: checks.env || "development",
    region: checks.region || "local",
    db: {
      source: checks.db.source,
      ok: checks.db.ok,
      latencyMs:
        checks.db.ok && checks.db.latencyMs != null
          ? Math.round(checks.db.latencyMs)
          : null,
    },
    uptimeSec: Math.floor(checks.uptimeSec),
    rssMb: Math.round(checks.rssMb),
    timestamp: new Date().toISOString(),
  };
}