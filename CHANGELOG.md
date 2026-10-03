# CHANGELOG — OVITECH

> Historique des phases livrées, par référence de commit (source de vérité :
> `git log --oneline`, messages conventionnels). Dates au format ISO.

## 2026-09-14 — Expressivité visuelle : kit charts framer-motion (Phase 1)

| Commit | Contenu |
|---|---|
| *(feature, commit en cours)* | **Dépendance `framer-motion@^12.43.0`** (React 19) — seule nouvelle dépendance ; chargée lazy via `LazyMotion`/`domAnimation` + `MotionConfig reducedMotion="user"` dans `app-shell.tsx` (dégradation automatique sur `prefers-reduced-motion`, relai du media query existant). |
| *(feature, commit en cours)* | **Kit `src/components/charts/`** (SVG pur — contrainte anti-`<canvas>` respectée) : `StatGauge` (arc circulaire dégradé + glow néon or/vert, `pathLength` animé à l'entrée, re-anime sur donnée changeante, `role="img"` + aria-label i18n), `Donut` (segments par lot, halo, centre compteur), `CountUp` (**SSR-safe sans mismatch d'hydratation** : rendu final côté serveur, `useLayoutEffect` rewind→`animate` côté client, rewind seulement au scroll), `FlowArrows` (connecteurs pointillés animés `strokeDashoffset`, boucle MVP), `Entrance` (entrée scroll-driven). |
| *(feature, commit en cours)* | **Conversions Phase 1** : `/` — hero **mini-dashboard** (4 jauges : identifiés %, autonomie énergie %, couverture fourrage j, batterie %) + **flux boucle MVP animé** (5 étapes `goldenPath.*`) ; `GoldenPath` déplacé en colonne du « parcours de preuve » ; `/indicateurs` — 4 jauges (identifiés, data-driven, couverture, GMQ) + 4 KPI compteurs ; `/fourrage` — 2 héros → **jauges** (autonomie fourragère + couverture concentré, `heroAnnual` en légende), **nouveau « Répartition du stock »** (Donut par lot + légende), KPI → CountUp ; `/energie` — héros → **jauge autonomie %**, 4 KPI → CountUp (+/− surplus). |
| *(feature, commit en cours)* | **i18n** : +4 clés ×3 (`app.home.dashTitle/dashDesc`, `app.fourrage.distTitle/distDesc`) → **975 clés ×3** (`check-i18n` identique). Gates : typecheck 0 · eslint 0 · tests **108/108** · secrets OK · build OK (precache **59**). QA Playwright preview FR+AR ×4 pages : h1 attendus, jauges SVG présentes (sondage DOM : arcs remplis 82 %, donut segmenté), counter atteints, `dir=rtl` AR, **0 erreur console**, interaction +50 kg (toast). Sondage DOM : compteurs **sous** la ligne de flottaison restent à 0 jusqu'à l'entrée dans le viewport (comportement count-up voulu). |

## 2026-09-14 — Piliers « Autonomie » opérationnels — retrait `/exploitations`, refonte `/fourrage` + `/energie`

| Commit | Contenu |
|---|---|
| `a9e6ace` | **Retrait `/exploitations`** (décision PO : multi-fermes non atteint) : `git rm` route + `src/lib/exploitations*.ts` + test ; nav `shell` (entrée + icône `Trees`) ; `capture-commission.mjs` ; clés `shell.nav.exploitations` + `app.exploitations.*` ×3 (**968 → 950 clés**) ; `package.json` ; `routeTree.gen.ts` régénérée. `team-photos.ts` conservée. |
| `a9e6ace` | **`/fourrage` → « Unités fourragères »** : héros **Autonomie fourragère** (jours de couverture + % de l'année, formule `stock ÷ besoin journalier`) + héros **Couverture du concentré** (`concentrateStock` miroir `forageStock` dans `src/lib/feed.ts`) ; KPI clairs (valeur stock, besoins, animaux actifs, couverture) ; **gestion opérationnelle des lots** : bascule dispo (existant) + **ajustement stock ±50 kg** (`adjustFeedStock` store, journalisé, plafonné à 0) + couverture en jours par lot. |
| `a9e6ace` | **`/energie` → « Parc solaire Smart Energy »** : héros **Taux d'autonomie énergétique** (%) au premier regard, KPI production / consommation / **surplus** / batterie, charges priorisées, chart 14 j conservée, **encart « Clarté sur les données »** (parc simulé, équipements non mesurés E-09 — aucune performance réelle inventée). |
| `a9e6ace` | **Tests + i18n** : `feed-stock.test.ts` (+2), `store.test.ts` (adjustFeedStock +1) ; blocs `app.fourrage.*` / `app.energie.*` réécrits + labels nav ×3 → **971 clés ×3** (`check-i18n` ça). Gates : typecheck 0 · eslint 0 · tests **108/108** · secrets OK · build OK (precache 57). QA Playwright preview FR+AR : h1 attendus, `dir=rtl`, **0 erreur console**, ajustement stock vérifié (4280 → 4330 kg). |

## 2026-09-14 — Roadmap produit : export PDF troupeau + fix hydratation #418

| Commit | Contenu |
|---|---|
| *(feature, commit en cours)* | **Fix #418 (hydratation React)** : la route hydratée en différé (chunks `reactUse(load())`) pouvait matcher du texte client EN/AR contre le HTML SSR FR quand la langue stockée ≠ FR (`2 سنة 7 شهر` vs `2 ans 7 mois`). `src/i18n/provider.tsx` : préchauffage immédiat du bundle stocké, application différée jusqu'à lavage d'hydratation complet (load + raf×2 + rIC, fusible 3 s) → bascule propre post-hydratation. Vérif build : séquence FR→AR→FR ×3 + AR fraîche = **0 erreur**. |
| *(feature, commit en cours)* | **Rapport PDF troupeau** : export A4 via pdfmake (lazy, identique au dossier investisseurs), 3 langues (fr/en/ar + Amiri RTL), tableau par animal (code, sexe, stade, poids, NEC, gestation, santé colorée), stats synthèses, engine v${version}, footer paginé. `src/lib/rapport-pdf.ts` (pur, 38 lignes) + bouton « Rapport PDF » dans `/troupeau` header (download client). **Réfaction** : extraction de `loadPdfMake/renderPdfBuffer/downloadPdfBuffer` dans `src/lib/pdf-engine.ts` — dossier investisseurs régénéré sans changement de comportement. |
| *(feature, commit en cours)* | **Warm-up pdfmake (1ᵉʳ clic)** : à l'arrivée sur `/troupeau`, `loadPdfMake()` (imports lazy mis en cache) puis `renderPdfBuffer` minimale en arrière-plan (baking des fonts — le vrai coût) → le 1ᵉʳ clic « Rapport PDF » devient instantané. Mesuré preview : 1ᵉʳ clic **0,96 s** (était >45 s / timeout). Trade-off : ~20 s de CPU d'arrivée sur cette machine (≈1-2 s sur matériel nominal) ; interactions (nav, langue) simplement repoussées, non perdues. |
| *(feature, commit en cours)* | **Sauvegarde & restauration** (`/sync`) : export complet de la ferme (13 clés persistées : troupeau, rations, santé, journal, sign-offs…) en fichier JSON porté, checksum SHA-256 + format/version, import validé (intégrité), confirmation avec compteurs avant remplacement. `src/lib/backup.ts` (pur, 8 tests) + clés i18n `app.backup.*` (2×3 locales) |
| *(feature, commit en cours)* | **Rapport PDF Indicateurs** (proof of production) : `src/lib/indicateurs-pdf.ts` — 8 KPI (effectif, identifiés, poids moyen, GMQ, data-driven, refus, couverture, coût ration) calculés par `computeFarmKpis` (données réelles du store, aucune invention), synthèse santé (ok/suivi/alerte), synthèse ration (besoins journaliers, stock, couverture), série GMQ 14 j (jour, GMQ, % identifiés, coût DZD), footer paginé `OVT-REPORT-02`, 3 langues + Amiri RTL. Bouton dans `/indicateurs` + warm-up pdfmake (parité `/troupeau`) → 1ᵉʳ clic **1,2 s**. Clés `app.rapportInd.*` (20 ×3 → **942 clés ×3**). |
| *(feature, commit en cours)* | **Rapport PDF Journal (audit, MVP-F09)** : `src/lib/journal-pdf.ts` — timeline des 120 derniers `FarmEvent` (8 types / 6 états sync traduits ×3), incidents + refus + identités (labels `app.journal.*`), période couverte, **empreinte SHA-256 réelle** du registre exporté (`sha256Hex`), réf `OVT-REPORT-03`, footer paginé, 3 langues + RTL. Bouton dans `/journal` + warm-up parité → 1ᵉʳ clic **0,9 s**. Clés `app.rapportJour.*` (26 ×3 → **968 clés ×3**). |

## 2026-09-13 — Exploitation, E2E, sécurité (phase plateforme)

| Commit | Contenu |
|---|---|
| `27f12b6` | **SRE** : sonde `/api/health` (200/503, ping Neon via `pg`, safe PGLite, `no-store`) + journalisation structurée 4xx/5xx + runbook `OPS.md` |
| `acfd1cb` | **E2E production (Playwright)** : 10 routes SSR + `/api/health`, retry post-déploiement, verdict JSON, workflow GitHub (`push main` / manuel / cron SLO) |
| `63a1d72` | **Sécurité** : en-têtes défensifs toutes réponses (nosniff, SAMEORIGIN, Referrer-Policy, CSP `frame-ancestors`), permissions CI read-only, doc OPS §9 — audit 0 vuln / 496 deps |

Rappel : la valeur preview OAuth (`GROK_PREVIEW_CLIENT_SECRET`) a été rotée et
le **hash `base64url(SHA-256)` doit être régénéré chez le broker**
(`app-builder-deployer/auth/src/preview-oauth.ts`) pour que le sign-in live-preview
fonctionne (action manuelle hors dépôt).

## 2026-09-12 → 2026-09-13 — Fiabilisation MVP

| Commit | Contenu |
|---|---|
| `8dd99a4` | Durcissement validation (Infinity / poids bornés moteur+store), rehydrate unique, synchro bornée + garde concurrence + suffixe dédupliqué, migrate complet, trims feed/signoffs, i18n (badge confiance, statuts label), RTL logique + grid mobile, a11y cartes photo, rotation secret preview — 293 tests, 891 clés |
| `4e295a3` | Nettoyage : retrait d'`artifacts/` (design scratch) et `lint-report.txt`, `.gitignore` `.vercel` + `.env*` |

## 2026-09-08 → 2026-09-12 — Coquille, écosystème, santé, i18n

| Commit | Contenu |
|---|---|
| `1ed7e84` | Captures QA Playwright (15 pages × desktop/mobile) |
| `fc881a9`, `33b99ba`, `6a9955e` | Page **équipe** dédiée (photos locales, fiches contact) + fix hydratation i18n `app.team` |
| `c78af76` | Page **Santé & vigilance** : signaux S1–S5 déterministes, événements de soin offline-first, store v3 + sync, badges troupeau/fiche |
| `7432a9b` | Pilier **écosystème** : 5 routes (caméras / portails / balance / IoT climat + orge germée), nav 6 groupes |
| `ded6ab6` | Navigation exclusive (une fenêtre à la fois), fix i18n écosystème, check-i18n blindé |
| `3d2f814` | Regroupement nav en 4 piliers (séparateurs dorés) |
| `5f0e775`, `064b3a2`, `92d6308`, `135a092` | Consolidations `PROJECT_MAP` (vision ↔ piliers ↔ MVP, forme finale commission, portes re-tracées) |

Pilier historique : **11 routes métier** (scan, journee, troupeau, nutrition,
ration, fourrage, energie, indicateurs, sync, journal, preuve, verification,
label), **3 langues** (`fr/en/ar` = 891 clés), **PWA installable**, **IndexedDB**,
**moteur DDNE-REF-0.9**, **Offline First** (file de sync, états, conflits).

## Limites documentées (non un « gap » de la démo)

RFID physique (Q-07), synchro backend réelle (Q-06), dictionnaire KPI officiel
(Q-04/Q-09), sign-off expert vérifiable (E-04), auth/DB — voir `PROJECT_MAP.md`
(§ 4, 7, 10) et la ligne « Auth / Base de données : OFF par défaut ».