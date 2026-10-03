# Tenant Isolation Audit Notes

Resource | Scope | Enforcement | Test | Production gap
--- | --- | --- | --- | ---
Farm | farm_id | farm-scoped access | untested | multi-user cloud hardening
Animal | farm_id | farm-scoped | untested | multi-user cloud hardening
Measurement | farm_id | farm-scoped | untested | multi-user cloud hardening
Feed | farm_id | farm-scoped | untested | multi-user cloud hardening
Recommendation | farm_id | farm-scoped | untested | multi-user cloud hardening
