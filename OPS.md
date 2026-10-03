# OPS.md — Exploitation & Monitoring (OVITECH / `ovitech-saas`)

> Runbook opérationnel : déploiement, rollback, variables d'environnement,
> monitoring, journalisation et réponse aux incidents. Vise la **cohérence
> production** : toute personne (développeur, ops, agent) doit pouvoir
> diagnostiquer et agir sans connaissance tribale.

## 1. Vue d'ensemble de la plateforme

| Brique | Technologie | Notes |
|---|---|---|
| Frontend/SSR | React 19 · TanStack Start · Vite 8 (Nitro v3) | build statique + fonctions serverless |
| Hébergement | **Vercel** (projet `ovitech-saas`, équipe `ovitech-team`) | Git integration = déploiement auto sur push `main` |
| Base de données | **Neon** (Postgres) si `DATABASE_URL` défini, sinon **PGLite** embarqué | `src/lib/db.ts` choisit au démarrage ; schéma = `migrations/*.sql` |
| Auth | Better Auth sur `/api/auth/*` | session cookie même-origin (hors preview OAuth) |
| Données métier | Zustand persist → IndexedDB (client) | l'état de la console est local au navigateur |

Domaines : `https://ovitech-saas.vercel.app` (production).

## 2. Variables d'environnement

> Aucune valeur secrète dans ce document. Les secrets se gèrent exclusivement
> dans **Vercel Project Settings → Environment Variables** (jamais dans un
> fichier committé).

| Variable | Environnements | Fournie par | Usage |
|---|---|---|---|
| `DATABASE_URL` | production | pôle exploitation (Neon) | active le backend Neon (sinon PGLite) |
| `GROK_AUTH_CLIENT_SECRET` / `GROK_AUTH_*` | production | **deployer broker** (injecté au déploiement) | auth préview côté broker — **ne jamais l'ajouter soi-même** |
| `GROK_PREVIEW_CLIENT_SECRET` | preview + production | manuelle (CLI/dashboard) | OAuth live-preview ; tout changement exige de **régénérer le hash `base64url(SHA-256)`** chez le broker (`app-builder-deployer/auth/src/preview-oauth.ts`) |
| `VERCEL_GIT_COMMIT_SHA`, `VERCEL_ENV`, `VERCEL_REGION` | plateforme | Vercel | exposées (non sensibles) par la sonde `/api/health` |

### Secrets de la sonde
`/api/health` ne renvoie **jamais** de variable d'environnement ni de DSN — uniquement `status / app / commit / env / region / db.{source,ok,latencyMs} / uptimeSec / rssMb / timestamp`.

## 3. Déploiement

**Automatique (recommandé)** : push sur la branche `main` → Vercel Git
integration build + deploy. Vérifier le commit servi avec :
`curl https://ovitech-saas.vercel.app/api/health` (`commit` = SHA git).

**Manuel (CLI, depuis la racine du repo)** :
```bash
vercel link --yes --project ovitech-saas --scope ovitech-team   # une fois
vercel env add GROK_PREVIEW_CLIENT_SECRET production            # si besoin
vercel --prod
```

Portes avant tout push (doivent être au vert) :
```bash
npm run typecheck && npm run lint && npm test
npm run check:i18n && npm run check:secrets
npm run build
```

## 4. Rollback

1. Vercel Dashboard → Deployments → `…`️ → **Promote to Production** une
   précédente exécution `Ready`.
2. Sinon, annuler localement le dernier commit et re-pousser (`git revert`) —
   le déploiement automatique suit.

Caractère réversible : tout changement de schéma DB passe par `migrations/`
**et** son inverse, jamais par une altération ad hoc.

## 5. Monitoring

### Sonde de santé
- `GET /api/health` → `200 {status:"ok"}` ou `503 {status:"degraded"}`.
- **503 uniquement** quand la base **critique** (Neon via `DATABASE_URL`) est
  injoignable ; sur le fallback PGLite (« rien de configuré ») le statut reste
  `ok` (surface informative, pas une alarme).
- `cache-control: no-store` ; contenu JSON constant (pas d'état client).

### Uptime checker gratuit (UptimeRobot / Betterstack)
1. Créer un monitor HTTP(S) sur `https://ovitech-saas.vercel.app/api/health`.
2. Seuil : interval 1–5 min, alerte notification HTTP(S) sur non-200.
3. Notifications e-mail/Slack/Telegram sur changement d'état.

### Erreurs applicatives
- Les réponses `>=500` émettent une ligne JSON structurée (`{level:"error",…}`)
  via `server/middleware/request-log.ts` — visible dans **Vercel Logs**.
- Les `4xx` passent en `warn` (bruit faible, garde anti-fuzz).
- Les erreurs base sont loggées **sans** leur message brut (anti-fuite de DSN).

## 6. Réponse aux incidents

Séquence type (ordre du runbook) :
1. `curl -s https://ovitech-saas.vercel.app/api/health` — est-ce `ok` ?
2. `vercel ls` (CLI) — le dernier déploiement est-il `Ready` ?
3. Vercel Logs — chercher les lignes `"level":"error"` (path/statut).
4. Base : si `db.ok=false` → vérifier `DATABASE_URL`/état Neon.
5. Diagnostiquer → corriger (commit) ou **rollback** (section 4) selon urgence.

Tout incident ayant un impact production mérite une note après coup
(section 7), pas d'amnésie collective.

## 7. Rétrospectives & changelog
- Utiliser `git log --oneline` + les messages conventionnels (`feat/fix/chore`)
  comme changelog source de vérité.
- Documenter ici toute procédure manuelle **récurrente** (reprod, rotation de
  secret, régénération de hash OAuth preview) pour qu'elle reste exécutable
  par n'importe qui.

## 9. Sécurité & durcissement

### En-têtes de sécurité (toutes réponses)
`server/middleware/security-headers.ts` ajoute systématiquement :
`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
`Referrer-Policy: strict-origin-when-cross-origin`, et
`Content-Security-Policy: frame-ancestors 'self'`. HSTS (preload) est déjà émis
par Vercel.

### Gestion des secrets
- **Aucun secret committé** hors `src/lib/auth/preview.ts` (client OAuth preview
  partagé, volontairement basé dans le code, allowlist stricte de
  `scripts/check-secrets.mjs`). Rien dans l'historique en dehors de ce fichier
  (Rotation minimale : `git log -S` avant de supprimer une constante).
- `GROK_AUTH_*` est injecté par le broker au déploiement ; ne **jamais**
  ajouter/committer ces valeurs.
- Rotation d'une valeur : changer la constante + l'env Vercel **et** régénérer
  le hash `base64url(SHA-256)` chez le broker — les trois en même temps.

### CI minimum privilege
Workflows GitHub (`ci.yml`, `e2e.yml`) : `permissions: contents: read` —
aucune écriture de source possible depuis un push non signé.

### Déployé (non encore activé)
- CSP complète (`script-src`/`style-src`) et COOP/COEP : écarté tant que le SSR
  streamé et le popup OAuth n'ont pas confirmé un comportement sans régression
  sous CSP stricte (à ré-évaluer avec la couverture E2E).
- Pipelines secrets vuln scan (npm audit) : **0 vulnérabilité** sur les 496
  dépendances (`npm audit --json`).

## 10. Limites connues (transparence)
- Les données de la console vivent dans **IndexedDB du navigateur** : pas de
  sauvegarde serveur des saisies terrain hors DB d'auth.
- Pas encore de Sentry : le suivi d'erreurs repose sur les logs Vercel
  actuellement (option SRE « C » à activer si le besoin grandit).