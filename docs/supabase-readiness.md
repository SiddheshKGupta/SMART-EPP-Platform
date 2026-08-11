# Supabase readiness

Status: local schema and synthetic seed are ready; nothing has been applied or connected to credentials.

## Files and order

1. Apply `supabase/migrations/20260811000100_platform_core.sql`.
2. Run Supabase security and performance advisors.
3. Apply `supabase/seed.sql` only to a demo/development database.
4. Generate database types, implement `SupabasePlatformRepository` behind the existing async ports, then run RLS persona and command-transaction tests.

## Port mapping

| Platform snapshot field | Persistence source |
| --- | --- |
| profiles | `iam_principals` + `iam_module_grants` + `iam_employer_scopes` |
| employers | `employers` + one-to-one `programmes` |
| employees, assets, applications, leases | same-named normalized tables |
| applications.reservedPaise | `applications.reserved_paise`; lifecycle evidence is in `exposure_events` |
| workItems | `work_items` (`queue_keys` remains a JSON array) |
| guidedJourneys.steps | `guided_journeys` + ordered `guided_journey_steps` |
| integrations | `integration_adapters` (constrained to `MOCK`) |
| exceptions | `platform_exceptions` |
| auditEvents | append-only `audit_events` |

`PlatformQueryPort.readSnapshot()` composes these tables into the existing camelCase domain shape. `PlatformCommandPort.execute()` must use one trusted server transaction to lock/version the aggregate, re-evaluate IAM and maker-checker controls, change state, append an `audit_events` row, and enqueue an `outbox_events` row.

## Security boundary

- `anon` receives no grants.
- `authenticated` receives scoped `SELECT` only; employer-linked reads use indexed RLS predicates.
- IAM authorization is stored in normalized tables, never user-editable JWT metadata.
- Sensitive-field masking remains an application projection concern; RLS prevents cross-employer rows, while the existing domain projection masks PAN, payroll and bank fields before UI use.
- Direct browser writes are intentionally unavailable. The future server adapter may use a server-side secret but must never expose it to the browser.
- Replace the synthetic principal `subject_id` values with real authentication subjects during the auth/IAM wiring migration.

## Deferred pre-wiring gates

- Apply to a disposable branch/local Postgres and validate migration/seed execution.
- Run RLS personas: no session, inactive user, scoped operations, management, admin, and stale/removed scope.
- Verify every foreign key index and run Supabase security/performance advisors.
- Test command idempotency, optimistic concurrency, atomic audit/outbox writes, and outbox retry/locking.
- Decide whether production Data API access remains read-only or all data access moves behind the application server.
