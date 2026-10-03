/**
 * Journalisation structurée des réponses en erreur (>=400) — une ligne JSON par
 * événement sur les logs serveur de la plateforme (Vercel Logs).
 *
 * Sécurité par défaut : aucune donnée utilisateur, aucun en-tête, aucune query
 * string (elle peut porter user_id/codes), chemin tronqué en prévention des
 * URLs malveillantes. Seuls méthode / chemin / statut / durée sont émis.
 * Middleware pass-through : n'altère jamais la réponse.
 *
 * Couche : serveur (Nitro), exploitation. Aucun impact sur les routes.
 */
interface RequestLogEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

type Next = () => Promise<Response>;

const MAX_PATH_LENGTH = 200;

export default async function requestLogMiddleware(
  event: RequestLogEvent,
  next: Next,
): Promise<Response> {
  const start = performance.now();
  const response = await next();
  const status = response?.status ?? 0;
  const ms = performance.now() - start;

  if (status >= 400) {
    const pathname = String(event?.url?.pathname ?? "").slice(0, MAX_PATH_LENGTH);
    const entry = {
      level: status >= 500 ? "error" : "warn",
      ts: new Date().toISOString(),
      method: event?.req?.method ?? "?",
      path: pathname,
      status,
      ms: Math.round(ms),
    };
    if (status >= 500) {
      console.error(JSON.stringify(entry));
    } else {
      console.warn(JSON.stringify(entry));
    }
  }

  return response;
}