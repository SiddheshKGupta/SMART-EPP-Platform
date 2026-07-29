# Task 10 report — Purchase Repository and Eligibility Workspace

## Status

Implemented the Task 10 purchase repository and eligibility-evaluation vertical slice on `feature/subvention-vertical-slice`.

Implementation commit: `eacd7eb4b02ecb51223962cc8945e79ecd91083f`

## Delivered

- Added `/subvention/transactions` as a dense operational repository with search, status/OEM/employer/deadline filters, sortable columns, sticky lease/device identity, column visibility, CSV export, and adaptive evidence inspection.
- Added deterministic synthetic import and atomic quarantine views for source, formula, control, duplicate, unresolved-master, and unresolved-alias failures.
- Added `/subvention/eligibility` with queue filters, single and bulk evaluation, outcome counts and values, preview/persisted decisions, calculation and variance evidence, rule traces, previous/current comparison, override context, and audit history.
- Added shared rule-trace rendering and reused the adaptive split workspace for desktop detail and mobile Sheet presentation.
- Restricted GSAP to inspector/evidence entry, with transform/opacity-only motion, 200–240 ms durations, `power3.out`, and deterministic reduced-motion final states.
- Updated module navigation and status presentation for the new operational routes and exception-review state.
- Kept `Deep Plum #53284F` limited to the single restrained `Developed by V L & CO` provenance mark.

## Domain and source-evidence migration

- Replaced the production `PurchaseTransaction.imei` field with the canonical `deviceIdentifier` field across domain types, schemas, repository controls, seed data, Prisma, UI, and tests.
- Renamed duplicate-check inputs and controls to device-identifier terminology while retaining duplicate-device prohibition.
- Added required product code, Connect legal entity, source file/sheet/row/checksum, source labels, counterparty aliases, calculation basis/rate, and expected subvention evidence.
- Added configurable import master data to the seed/repository boundary; OEM, employer, programme, product, legal-entity, and counterparty-alias resolution is no longer hardcoded in import logic.
- Made source-row identity checksum/sheet/row based and preserved evidence into accepted transactions.
- Added explicit formula-row and control-row quarantine outcomes.
- Seeded only client-evidenced rates: 245, 250, 275, 300, and 350 bps.
- Added Ingram and Redington settlement paths, Equipment Leasing and Residuary legal entities, Base and Invoice calculation bases, numeric and alphanumeric identifiers, and approved/rejected/deferred source outcomes.

## TDD evidence

- The initial Task 10 Playwright run failed 5/5 because the transactions route and eligibility workspace controls did not exist.
- The initial source-evidence unit suite failed 11/11 on the legacy `imei` contract, incomplete source identity, missing formula/control classification, and unresolved master/legal-entity/alias behavior.
- After implementation, the focused source-evidence and eligibility tests passed.
- The first full browser run exposed a legacy deep-link regression: `deadline=7d` was accepted but not visible on the eligibility page. A compact active-query context was added and the focused regression test passed before rerunning the full browser suite.

## Quality gates

- `npm.cmd run lint`: passed.
- `npm.cmd run typecheck`: passed for web and domain.
- `npm.cmd test`: 147/147 tests passed across 11 files.
- `npm.cmd run test:e2e`: 19/19 tests passed.
- `npm.cmd run build`: passed; 16 application pages generated.
- `git diff --check`: passed; Git emitted only repository line-ending conversion notices.
- Canonical-field search found no remaining production/test/schema use of `.imei`, `imei:`, `existingClaimedImeis`, `duplicateImeis`, or `assertUniqueImei`.
- Forbidden-rate search found no seeded 290, 315, 325, or 375 bps values.

## Visual and interaction review

- Desktop at 1440 px: inspected the purchase repository split view and eligibility exception detail. The eligibility cockpit height was constrained after review so its detail pane scrolls independently without turning the page into an excessively long canvas.
- Mobile at 375 px: inspected the transaction evidence Sheet; the page has no horizontal overflow, the heading receives focus, Escape closes the Sheet, and focus returns to the triggering row.
- Playwright screenshots were generated under ignored `test-results` output and were not committed.
- Motion review verdict: approved. New motion has no bounce/overshoot, animates only inspector/evidence entry, respects reduced motion, and does not animate rows, filters, sorting, numbers, or bulk results.
- React review found no newly introduced inline component definitions or avoidable repeated evaluation work; transaction and eligibility projections are memoized and the new interactive rows have keyboard semantics.

## Changed areas

- `apps/web/app/subvention/transactions/`
- `apps/web/app/subvention/eligibility/`
- `apps/web/features/subvention/transactions/`
- `apps/web/features/subvention/eligibility/`
- `apps/web/components/shared/AdaptiveSplitWorkspace.tsx`
- `apps/web/components/shared/RuleTrace.tsx`
- `apps/web/features/subvention/data/`
- `apps/web/features/subvention/store/SubventionProvider.tsx`
- `packages/domain/src/subvention/`
- `packages/domain/src/controls.ts`
- `prisma/schema.prisma`
- `design-system/smart-epp-operating-platform/MASTER.md`
- `tests/e2e/subvention-eligibility.spec.ts`
- `tests/unit/subvention/`

## Concerns and follow-up

- The supplied workspace contains the client data contract but not the original client workbooks, so the repository demonstrates the specified evidence dimensions with deterministic synthetic rows and contract-backed seed values rather than importing proprietary workbook data.
- The build emits the existing Vite CommonJS deprecation notice; it does not fail any gate.
- No Task 10 functional blockers remain.
