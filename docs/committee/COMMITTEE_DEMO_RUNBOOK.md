# COMMITTEE DEMO RUNBOOK — OVITECH

Objectif : surface de démonstration reproductible pour la commission Label Startup,
sans dépendre d'un sign-in en production. Document de préparation uniquement.

Déployé (à vérifier) : commit `c3e80bff` (ovitechdz/ovitech.saas- main)
URL : https://ovitech-saas.vercel.app

## 1. Surface retenue

- **PRIMAIRE — démonstrateur local auth-off** (`VITE_AUTH_ENABLED=false`) :
  déterministe, aucun compte requis, exerce le Golden Path complet.
- **SECONDAIRE — preuve « produit en ligne », LECTURE SEULE** :
  https://ovitech-saas.vercel.app (`/api/health` + tour des routes). **Ne pas tenter de sign-in.**

## 2. Pourquoi ce choix

- La production (Vercel) est déployée en auth-ON : le déployeur injecte
  `VITE_AUTH_ENABLED=true`, donc un écran de connexion est attendu.
- Le dépôt documente déjà (docs read-only, non reprises ici) que le **sign-in
  Google en preview/prod est défaillant** et que la **création de comptes en
  production est bloquée**.
- Le local auth-off n'exige aucun compte et exerce la totalité du parcours.
- Conclusion : ne pas fonder la démo sur un sign-in en production.

## 2.bis Pré-vol (PowerShell)

```powershell
$env:VITE_AUTH_ENABLED = "false"
npm ci
npm run dev      # http://localhost:8080
```

Vérifier d'abord que `npm run typecheck`, `npm run lint` et `npm test` passent
(dernier état vérifié : PASS).

## 2. Script de démonstration — Golden Path (~5 min)

1. `/`            contexte ferme-1 (données de démonstration)
2. `/scan`        identité manuelle/RFID **simulée** → créer un animal
3. `/troupeau/$id` dossier animal (RFID/code, race, sexe, âge, stade, case)
4. saisir un poids (ex. 52 kg) + NEC 3 → historique chronologique
5. `/fourrage`    rendre un lot disponible (ex. fourrage)
6. `/nutrition`   lancer DDNE-REF-0.9 → recommandation + preuves/notes
7. montrer l'état « revue humaine en attente » (`approvedBy=null`, `servedAt=null`)
8. `/preuve` + `/verification` rejouer les cas moteur TC-01..07
9. `/indicateurs` ou `/journal` export PDF (preuve de production)

## 3. Preuve technique « produit en ligne » (lecture seule)

- `GET /api/health` → `{"status":"ok", … "db":{"source":"neon","ok":true}}`
- Tour des routes : `/`, `/scan`, `/troupeau`, `/nutrition`, `/ration`, `/label`,
  `/vision`, `/indicateurs`, `/sync`, `/journee`, `/preuve` → HTTP 200.
- **Ne pas se connecter** : la surface prod est en auth-on et le sign-in est un
  risque connu.

## 4. Ne PAS présenter comme réalisé

- Matériel réel (RFID / balance / caméra / portail / IoT) → **SIMULÉ**.
- Impact mesuré, économie, revenus → **non mesuré** (hypothèses).
- Workflow revue → approbation → distribution par un opérateur externe → **incomplet**.
- Synchro cloud authentifiée multi-utilisateur → **non vérifiée E2E**.

## 5. Déclarations obligatoires (à dire explicitement)

- La couche matérielle est simulée ; le moteur DDNE-REF-0.9 est **déterministe (non IA)**.
- Les objectifs/cibles sont des **hypothèses** ; un **pilote terrain** reste requis.
- L'isolation multi-fermes est présente dans le code (vérification statique) mais
  **non testée en runtime** (voir `docs/TENANT_ISOLATION_AUDIT.md`).

## 6. Blocages connus (à déclarer si demandé)

- Runtime E2E multi-utilisateur non exécuté ; test Neon staging non réalisé.
- Sign-in Google en production signalé défaillant ; création de comptes prod non autorisée.

## 6. Plan B (si le local ne démarre pas)

- Présenter la tournée lecture seule de l'URL déployée + la réponse `/api/health`
  + les PDF déjà générés — **sans aucune tentative de sign-in**.

## 7. État des tâches de clôture

- A — Empreinte de version : corrigée vers `c3e80bff` (voir docs de certification).
- B — Cohérence isolation : niveaux de vérification clarifiés (statique vs runtime).
- C — Surface de démo : ce runbook.
