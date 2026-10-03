/**
 * Shared LIVE-PREVIEW OAuth client (server-only — NEVER import from the client).
 *
 * The sandbox serves each live preview on a dynamic `https://*.grok-sandbox.com`
 * URL, which can't be pre-registered per app. The broker instead exposes ONE
 * shared "preview" client that accepts any
 * `https://*.grok-sandbox.com/api/auth/oauth2/callback/*`
 * (broker: `app-builder-deployer/auth/src/preview-oauth.ts`). Baking it here lets
 * the live preview do REAL sign-in — no demo/mock users — with no platform
 * injection. When deployed the deployer injects a per-app
 * `GROK_AUTH_*` that overrides these (see `server.ts`).
 *
 * These MUST equal the broker's `GROK_PREVIEW_CLIENT_ID` /
 * `GROK_PREVIEW_CLIENT_SECRET` (set in the broker's Vercel env; the broker stores
 * only the secret's `base64url(SHA-256)` hash). This is a dedicated, low-privilege
 * client (preview-only, `*.grok-sandbox.com`).
 *
 * Rotation: the constant below WAS a shared preview credential that shipped in
 * this repo's git history. It has been rotated to a NEW value and made
 * env-overridable, so the old value is dead from this codebase's side. For the
 * live preview to keep working, the broker's `GROK_PREVIEW_CLIENT_SECRET` (its
 * stored hash) must be regenerated to match either the fallback below or — for
 * environments that can inject one — the `GROK_PREVIEW_CLIENT_SECRET` env var,
 * which always wins. Deployed apps are unaffected (they use the injected per-app
 * `GROK_AUTH_CLIENT_SECRET`).
 */
export const PREVIEW_CLIENT_ID = "grok_preview";
export const PREVIEW_CLIENT_SECRET =
  process.env.GROK_PREVIEW_CLIENT_SECRET?.trim() ||
  (() => {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[auth] GROK_PREVIEW_CLIENT_SECRET must be set in production; no committed fallback allowed",
      );
    }
    return "preview-only-dev-secret-do-not-use-in-production";
  })();

/** The shared auth broker issuer (OIDC discovery lives under it). */
export const GROK_ISSUER_DEFAULT = "https://auth.grok.me";

/**
 * Host patterns whose callbacks the preview client accepts. Better Auth derives
 * the live preview's real origin from the request host and validates it against
 * this list (wildcard-matched), so the OAuth `redirect_uri` becomes the concrete
 * `https://<preview-host>/api/auth/oauth2/callback/...` the broker allows.
 */
export const PREVIEW_ALLOWED_HOSTS = ["*.grok-sandbox.com"] as const;
