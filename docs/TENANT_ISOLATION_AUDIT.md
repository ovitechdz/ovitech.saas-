# Tenant Isolation Audit Notes

Every resource carries `farm_id` and the server contract scopes access per farm
(membership check + farm-scoped queries/migrations). This document separates three
different levels of verification so "present in code" is not confused with
"runtime-tested".

Verification levels:

- **Code controls present** — farm-scoped enforcement exists in the code/contract. YES.
- **Static verification** — code/contract reviewed read-only. YES (this document).
- **Runtime end-to-end** — two-farm hostile test executed against a running server/staging. **NOT PERFORMED.**
- **Multi-tenant cloud hardening** — production authorization/ownership hardening. ROADMAP.

Resource | Scope | Enforcement | Code controls | Static verification | Runtime test | Production gap
--- | --- | --- | --- | --- | --- | ---
Farm | farm_id | farm-scoped access | present | SUPPORTED | untested | multi-user cloud hardening
Animal | farm_id | farm-scoped | present | SUPPORTED | untested | multi-user cloud hardening
Measurement | farm_id | farm-scoped | present | SUPPORTED | untested | multi-user cloud hardening
Feed | farm_id | farm-scoped | present | SUPPORTED | untested | multi-user cloud hardening
Recommendation | farm_id | farm-scoped | present | SUPPORTED | untested | multi-user cloud hardening

Clarification: "SUPPORTED" above means **statically reviewed (code/contract only)**.
It must NOT be read as a passed runtime isolation test. No authenticated two-farm
runtime isolation test has been executed. The claims matrix uses the same wording.
