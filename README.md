# OVITECH Clean MVP

**OVITECH is a Smart Sheep Farm Operating Platform demonstrator.** Its local operational core links animal identity, weight/NEC observations, local history, feed availability, a deterministic nutrition engine, and inspectable decision evidence. Hardware and cloud capabilities are identified as demonstrations or roadmap, not represented as measured production systems.

## MVP Definition

The Clean MVP is a single demonstration farm (`farm-1`) with local browser persistence. The farm and initial herd are seed/demo data. Changes made through the UI are stored locally in IndexedDB (with a localStorage fallback); this is not shared across users or devices.

### Operational locally

- Manual animal/RFID identity flow, animal dossier, editable weight and NEC, chronological weight history, and local persistence.
- Deterministic DDNE-REF-0.9 nutrition recommendations with input evidence and explanatory notes; it is not an AI/ML model or veterinary diagnosis.
- Feed lot stock and availability controls. Availability affects the recommendation; the feed catalogue and starting quantities are demonstration data.
- Rule-based health signals and manually entered health events.
- KPIs and exports computed from current local application state.
- JSON backup/restore, local network-state demonstration, and visible local queue/status.

### Demonstrators

- RFID presets/manual entry; no physical RFID reader is connected.
- Seed farm/herd/observations/feed/energy and environment figures; they are illustrative, not farm measurements.
- Energy, hydroponics, climate, smart gates, connected scales, cameras, and IoT device pages. No hardware telemetry or camera inference is connected.
- Online/offline toggle and sync/conflict controls simulate local states; they do not prove server synchronization.

### Roadmap / incomplete

- Trusted reviewer identity and a complete authorized review → approve → serve workflow in the user interface.
- Durable, authenticated cloud synchronization and cross-device persistence.
- Physical RFID, scale, camera, gateway, energy and hydroponic integrations.
- Field-measured economic, productivity, energy or environmental impact.

## Golden Path

```text
farm-1 demo context
→ register animal through manual/simulated RFID
→ animal dossier
→ record weight + NEC
→ inspect chronological history
→ change feed availability
→ run DDNE-REF-0.9
→ inspect recommendation and evidence
→ see pending human-review state
```

The current local `field` workflow has no legitimate route to the `production` reviewer role. Approval is not automatic. Do not present review/serve as a completed end-to-end workflow until an authorized reviewer path is implemented and verified.

## Routes and Modules

Operational surfaces include `/`, `/scan`, `/journee`, `/troupeau`, `/troupeau/$id`, `/sante`, `/nutrition`, `/ration`, `/fourrage`, `/indicateurs`, `/journal`, `/sync`, `/preuve`, and `/verification`.

Demonstration/device surfaces include `/energie`, `/ecosysteme`, `/ecosysteme/cameras`, `/ecosysteme/portails`, `/ecosysteme/balance`, and `/ecosysteme/iot`.

Project context and presentation surfaces include `/vision`, `/investisseurs`, `/team`, and `/label`. These are preserved as part of the OVITECH product story; their presence is not proof of commercial traction, certification, or hardware capability.

## Stack

React 19, TanStack Start/Router, Vite 8, Tailwind CSS v4, Zustand, IndexedDB, Recharts, Radix UI, i18next (French/English/Arabic), Playwright, and Nitro/Vercel build output.

## Local Development

Prerequisites: Node.js 24.21.x and npm. The workspace's normal `npm run dev` serves on port 8080.

For the auth-off local demonstrator, set `VITE_AUTH_ENABLED=false` in the process environment before running the app. PowerShell:

```powershell
$env:VITE_AUTH_ENABLED = "false"
npm ci
npm run dev
```

Bash:

```bash
VITE_AUTH_ENABLED=false npm ci
VITE_AUTH_ENABLED=false npm run dev
```

With no `DATABASE_URL`, local server database access uses the embedded PGLite fallback. Do not add credentials to this repository. Set `DATABASE_URL` only in an appropriately secured deployment environment when the server-backed path is intentionally configured.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run check:i18n
npm run check:secrets
npm run build
node --test scripts/grok-pwa-plugin.test.mjs
```

The production E2E probe is read-only: `node scripts/e2e-prod.mjs --base https://ovitech-saas.vercel.app`. It checks route responses and health; it does not authenticate or verify business-data writes.

## Limitations and Honesty

The dashboard and seeded records are demonstration data. RFID is manual/simulated. Energy/environment/device values are not sensor readings. Sync controls are local simulations. The nutrition engine is deterministic decision support, not AI/ML or a veterinary diagnosis. The UI's human-review workflow is incomplete for the local field user. Production authentication, authorization, ownership, business-data persistence, and authenticated Golden Path have not been verified by this baseline.
