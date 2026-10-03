# OVITECH Clean MVP Scope

## IN MVP — Operational Local Core

- One seeded demonstration farm context (`farm-1`); no multi-farm onboarding.
- Animal registration using manual/simulated RFID input.
- Animal dossier with RFID/code, breed, sex, age, stage and pen.
- Weight and NEC capture with chronological local history and reload persistence.
- Rule-based S1–S5 health signals and manually entered health events; no diagnosis.
- Feed lots, stock values and availability controls using a coherent demo catalogue.
- Deterministic DDNE-REF-0.9 analysis, recommendation, explanation and inspectable evidence.
- Local dashboard/KPIs computed from seed plus local changes.
- IndexedDB persistence, localStorage fallback, JSON backup/restore, visible network/local queue states.
- Reports generated from current local application state.

## DEMONSTRATOR

- RFID presets and manual tag entry stand in for a physical reader.
- Starting herd, health events, weights, feed stocks, energy, environment and KPI series are demonstration data.
- Offline toggle, queue transitions, sync failures and conflicts demonstrate local UX; no remote sync is claimed.
- Energy, hydroponics, climate, smart gates, connected scale, cameras and IoT screens illustrate integration points. They have no real hardware telemetry or computer-vision inference.

## ROADMAP

- Trusted reviewer identity and accessible authorized review/approval/serve UI, with persisted approval/served state.
- Authenticated, server-backed sync and cross-device persistence with tested ownership and authorization.
- Physical RFID reader, scales, IoT gateway/sensors, cameras and energy integrations.
- Field baseline and measured nutritional, productivity, economic or environmental outcomes.
- Multi-farm SaaS administration, billing and enterprise tenancy.

## NOT CLAIMED

- No AI/ML model: DDNE-REF-0.9 is deterministic.
- No physical RFID scan, connected scale, camera inference, sensor telemetry, hydroponic production telemetry or measured solar output.
- Seed KPI and energy values are not measured farm results.
- No measured cost reduction, productivity uplift, market traction, revenue, customer count or certification.
- Local IndexedDB, local queue and sync-state simulation do not equal cloud synchronization.
- No completed authenticated production review/approval/serve workflow.

## VALIDATED WORKFLOWS

- Browser-proven locally: unknown RFID → create animal → dossier → 52 kg / NEC 3 → 54 kg / NEC 3 → history and recommendation survive reload/navigation.
- Browser-proven locally: changing forage category availability changes DDNE recommendation; explanations expose weight, NEC, stage, rule formulas and ration output.
- Browser-proven locally: a missing animal ID shows not-found after hydration, while a real persisted animal shows loading then its dossier.
- Store-test-proven: a `field` role cannot approve by direct store action; `production` can approve in the local policy model; `field` can serve only after approval. This does not establish a trusted production identity or production authorization.
- Production read-only route/health checks passed previously; authenticated production business workflow remains unverified.

## KNOWN LIMITATIONS

- Auth is disabled in the local demonstrator; the UI has no legitimate route to obtain `production` role. Human review is therefore incomplete for an external operator.
- Server sync/business-data persistence and ownership have not been validated end-to-end.
- Demo records can be altered locally and should not be represented as production farm data.
- Same-day weight captures do not produce a meaningful GMQ comparison; GMQ is unavailable when dates/data are insufficient.
