/**
 * En-têtes de sécurité défensifs sur TOUTES les réponses (Nitro middleware
 * pass-through, modèle de `request-log.ts` : aucune logique métier, ne modifie
 * jamais le corps). HSTS est déjà émis par Vercel (max-age=63072000; preload).
 *
 * Choix délibérés :
 *  - `X-Frame-Options: SAMEORIGIN` + `Content-Security-Policy: frame-ancestors
 *    'self'` : anti-clicjacking ; sans effet sur le popup OAuth (window.open,
 *    pas un <iframe>).
 *  - `Referrer-Policy: strict-origin-when-cross-origin` : la query des URLs
 *    internes n'est jamais fuie hors de l'origine (elle peut porter user_id).
 *  - Pas de CSP script/style ni de COOP/COEP pour l'instant : le SSR streamé et
 *    le popup auth n'ont pas été audités sous une CSP stricte ; à introduire
 *    seulement si la couverture E2E le permet (voir OPS.md « Durcissement »).
 *
 * Couche : serveur (Nitro), sécurité. Aucun impact sur les routes.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
  "content-security-policy": "frame-ancestors 'self'",
};

interface SecurityHeaderEvent {
  node?: { res?: { setHeader?: (name: string, value: string) => void } };
}

type Next = () => Promise<Response>;

export const HEADER_COUNT = Object.keys(SECURITY_HEADERS).length;

export default async function securityHeadersMiddleware(
  event: SecurityHeaderEvent,
  next: Next,
): Promise<Response> {
  if (typeof event?.node?.res?.setHeader === "function") {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      event.node.res.setHeader(name, value);
    }
  }
  return next();
}