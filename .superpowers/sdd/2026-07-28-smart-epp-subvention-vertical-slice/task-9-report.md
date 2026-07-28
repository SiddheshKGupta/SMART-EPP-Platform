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

- Focused Playwright: 4/4 passed (known-green clean hydrated run).
- Unit tests: 118/118 passed.
- Lint: passed with zero warnings.
- Strict typecheck: web and domain passed.
- Production build: passed; all 15 app pages generated.
- `git diff --check`: passed (line-ending notices only).

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
