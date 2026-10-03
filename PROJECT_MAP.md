# OVITECH Clean MVP — Project Map

## Architecture

```text
UI routes and components
        ↓
Domain logic (animal, health, feed, deterministic nutrition)
        ↓
Zustand farm store
        ↓
IndexedDB persistence (localStorage fallback)
        ↓
Recommendation + evidence/explanation
        ↓
Pending human decision state
```

The current core is client-local. The repository contains server/database scaffolding, but the local sync UI is simulated and authenticated production business-data synchronization is not established by this MVP baseline.

## Routes

| Route | Primary responsibility | Classification |
|---|---|---|
| `/` | Farm dashboard and navigation | Operational UI over demo seed + local state |
| `/scan` | Manual/simulated RFID, identity creation, measurement entry | Operational local; reader simulated |
| `/journee` | Field task list and follow-up entry points | Operational local over current store |
| `/troupeau`, `/troupeau/$id` | Herd list, animal dossier, observations, weight history, health, recommendations | Operational local |
| `/sante` | Rule-based health signals and health-event overview | Operational local; decision support only |
| `/nutrition` | Run deterministic engine, filter recommendations, inspect evidence | Operational local |
| `/ration` | Ration sheet and review/serve states | Partial: reviewer path inaccessible in auth-off local workflow |
| `/fourrage` | Feed lots, local stock and availability controls | Operational local over demo starting data |
| `/indicateurs` | KPIs and PDF report | Operational calculations over seed/local data; demonstration baseline |
| `/journal` | Local event/error timeline and report | Operational local |
| `/sync` | Local status, backup/restore, simulated retries/conflicts | Demonstrator; no proven remote synchronization |
| `/preuve`, `/verification` | Replay and deterministic engine cases | Demonstrator/verification tools |
| `/energie` | Solar/load/battery visualization | Demonstrator data |
| `/ecosysteme` | Connected-farm architecture overview | Demonstrator |
| `/ecosysteme/cameras` | Camera coverage concept | Roadmap/device demonstrator; no inference |
| `/ecosysteme/portails` | Smart-gate concept | Demonstrator; no connected gate |
| `/ecosysteme/balance` | Connected-scale concept | Demonstrator; measurements are entered manually |
| `/ecosysteme/iot` | Sensor/climate/hydroponics concept | Demonstrator data; no telemetry |
| `/vision`, `/investisseurs`, `/team`, `/label` | Product story, team context, evidence and roadmap | Presentation/documentation surfaces; claims remain subject to evidence |

## Data Ownership and Persistence

- Seed data is loaded from `src/lib/seed.ts`; it is explicitly demonstration data.
- Current farm context is `farm-1` in the local Zustand store.
- Animal, observation, feed, health, recommendation and event mutations persist through the custom IndexedDB adapter; localStorage is a fallback.
- Local persistence is browser-profile/device scoped. It is not cloud backup or multi-user data ownership.
- JSON backup/restore is user initiated and includes a SHA-256 integrity check.

## Decision Engine

`src/lib/nutrition-engine.ts` implements deterministic DDNE-REF-0.9 rules. Inputs include animal stage, age, weight, NEC, and whether forage/concentrate categories are available. Evidence strings explain formulas and inputs. Feed lot availability affects the ration mix; the engine does not consume measured nutrient composition from each feed lot. Recommendations remain decision support and must not be presented as veterinary diagnosis or autonomous execution.

## Server and Security Boundaries

- Local auth is configured off for the demonstrator. The client-side `field`/`production` store role is not a trusted security identity.
- The UI exposes approval only to `production`; the store rejects direct approval mutation from `field`. This is a local policy guard, not a substitute for server authorization against a hostile client.
- No legitimate local reviewer identity path exists in this baseline. Complete reviewer workflow is roadmap/incomplete.
- Server sync/auth/database files and migrations are retained as scaffolding, but this baseline does not claim verified authenticated production business-data sync.

## Data Classification

- Operational local: herd/dossiers, weights/NEC history, health rules/events, feed availability, deterministic nutrition/evidence, local KPIs, backup/restore.
- Demonstrator: seeded farm values, simulated RFID presets, local sync/conflict controls, energy/environment/hydroponic values, device pages.
- Roadmap: trusted reviewer identity/UI, remote synchronization, physical devices, measured field impact, production-grade authorization and ownership.
