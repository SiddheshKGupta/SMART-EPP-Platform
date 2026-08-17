# Task 9 report — Scheme and Programme Workspace

## Status

Implemented the Scheme and Employer Programme master workspace on `feature/subvention-vertical-slice`.

## Delivered

- Replaced the scheme and programme-mapping route contracts with one functional, provider-backed workspace.
- Added a 52/48 desktop split and sub-1024px Sheet detail with focus entry/return behavior.
- Added searchable, filterable semantic tables with sticky identity columns.
- Added Summary, Configuration, Products, Versions, Approvals, and Audit detail views.
- Added required-remarks submit, approve, return, reject, and new-version flows.
- Enforced maker-checker separation and approved-version immutability through repository commands.
- Added immutable derived-version commands with audit correlation metadata.
- Added domain-resolution conflict rows, `Not evaluated` financial impact, and the prescribed recovery link.
- Added restrained, token-driven master-workspace layers without gradients, hero decoration, or card sprawl.
- Added reduced-motion-safe motion and mobile touch sizing.

## TDD evidence

- Initial Task 9 Playwright run failed because the workspace/row did not exist.
- Repository command tests failed with missing `returnScheme` and `createNextSchemeVersion`, then passed after implementation.
- Mobile focus test failed because the detail heading was not focused, then passed after Sheet auto-focus control.
- Known-green focused E2E result before the production build: 4/4 passing in 13.0s.
- A post-build rerun reused an orphaned development server after `.next` had been replaced, serving current HTML without client hydration. The orphaned Task 9 server processes were terminated; this was an environment lifecycle issue, not an application assertion failure.

## Quality gates

- Focused Playwright: 6/6 passed on a hydrated server.
- Full Playwright: 10/10 passed.
- Unit tests: 136/136 passed.
- Lint: passed with zero warnings.
- Strict typecheck: web and domain passed.
- Production build: passed; all 15 app pages generated.
- `git diff --check`: passed (line-ending notices only).

## Independent review fix â€” round 1

- Added domain and repository authorization: Master Data Admin and Sales Ops may maintain drafts, Sales Ops submits, and only Business Head Checker may approve, return, or reject.
- Retained the separate-user maker-checker prohibition.
- Added explicit successor effective dates to programme-mapping new-version creation.
- Programme approval now closes an overlapping prior version to the day before the successor, preserves intentional gaps, rejects any remaining approved business-key overlap before mutation, and audits both changed records.
- Updated desktop focus return when selection changes while the detail pane remains open.
- Restored route-specific headings and query-driven status filters after the shared workspace replaced the Task 8 route contracts.
- Cold-development compilation caused one initial 30-second E2E timeout; the isolated successor test then passed in 4.2 seconds and the complete browser suite passed after the server was ready.

## Visual review

- Desktop at 1440×960: dense master list and detail hierarchy remain legible; selection and immutable actions are clear.
- Mobile at 390×844: detail Sheet preserves context, conflict recovery remains readable, and controls meet mobile target sizing.
- Reduced motion is covered by the existing global media query; detail motion uses owned Sheet/Dialog primitives.

## Self-review

- Material transitions append audit events.
- Approved source versions cannot be edited and new drafts preserve the source snapshot.
- Conflict communication uses icon, text, and recovery guidance rather than color alone.
- Keyboard row activation and detail focus return are covered by Playwright.
- Both master routes are functional and share the same provider-backed implementation.

## Client-data contract concerns

Task 9 intentionally did not broaden into seed-model remediation. Current demo seeds still diverge from `docs/subvention-client-data-contract.md`:

- rates include 3.25%, 3.15%, 2.90%, and a 3.75% draft, while evidenced rates are 2.45%, 2.50%, 2.75%, 3.00%, and 3.50%;
- settlement paths use generic national reseller/distributor IDs rather than explicit Ingram and Redington paths;
- transactions do not yet carry the Equipment Leasing versus Residuary Connect legal-entity dimension.

These should be reconciled in the dedicated seed/domain task so Task 9 remains scoped to master-control UX and workflow behavior.

## Independent review fix — round 2

- Replaced the remaining route-contract usage with explicit route-local query types for schemes and programme mappings.
- `status`, `scheme`, `mapping`, `employer`, and `programme` now pass into typed initial workspace props; repeated query values are discarded instead of selecting an arbitrary array member.
- The workspace validates initial scheme and mapping IDs, plus employer/programme scope, against the provider snapshot and conflict results before applying them.
- Valid deep links now open the selected scheme, mapping, or conflict detail while status filtering remains intact; unknown IDs stay unselected and unsupported scope values are discarded.
- Added browser coverage for scheme selection, programme-mapping selection, and employer/programme conflict-recovery links. The new tests first failed with the expected empty-detail state, then passed 3/3 after the route-state fix.
- Made Playwright deterministic for a cold local run: one worker, a 60-second test budget, and no reuse of stale development servers.
- Fresh post-fix gates: full Playwright 13/13, unit 136/136, lint, strict web/domain typecheck, and production build all passed.
