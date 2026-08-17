# Task 10 independent review fix report

## Status

All Critical, Important, and local quality findings in the Task 10 review-fix
brief are resolved. No Task 10 blocker remains.

Base reviewed implementation: `2f096b653100632c2853f2a0679e4ef09328e4d2`

## Controls corrected

- Programme mapping resolution now enforces optional reseller and distributor
  scope. Approval conflict detection uses the same wildcard-aware scope model,
  while the demo data exposes distinct Ingram and Redington paths.
- Import validation now quarantines approved-claim duplicates,
  alternative-partner identifiers, incompatible product ID/code pairs, and
  employer/programme/OEM/reseller/distributor mapping mismatches.
- Quarantine records now return a stable audit row ID plus import ID, actor,
  timestamp, checksum, sheet, source row, and issue codes. Audit events join on
  that returned row ID.
- Eligibility deep links restore blocked, selected-transaction, overdue, 7-day,
  15-day, and decision filters. Filter and selection changes write canonical,
  encoded URLs; invalid and repeated parameters degrade safely.
- Unevaluated projections are labelled as previews and excluded from persisted
  Eligible, Ineligible, and Exception Review queue counts.
- Bulk evaluation is serialized and atomic in the repository. The provider
  returns persisted command results, and the UI summarizes only those results;
  failures remain visible and do not produce predicted-success summaries.
- Focused checkboxes consume Space without opening their row. Row Enter/Space
  activation remains available on the row itself.
- Money renders two fractional digits. CSV export includes the complete filtered
  operational record and neutralizes formula-leading text.
- FAIL and REVIEW rule results require recovery guidance at the type boundary,
  and the ordered rule trace renders it.
- Operational table, evidence, rule, and comparison text meets the 12px design
  minimum. The transaction repository has a directed empty state and reset.
- High-frequency inspector/evidence tweening was removed. Keyboard and
  row-to-row selection are immediate and do not mutate inspector transform or
  opacity styles.
- Prisma now maps `deviceIdentifier` to the deployed `imei` column with
  `@map("imei")`. The previously compressed schema was formatted into valid
  Prisma syntax and validated with the Prisma 6.19 CLI.

## TDD evidence

- Programme counterparty tests first failed 2/16; corrected suite passed 16/16.
- Distributor-aware approval overlap first failed in the repository suite; the
  corrected suite passed 38/38.
- Six import-control regressions first failed, then passed after the validation
  boundary was extended.
- Quarantine identity and atomic bulk tests first failed against missing
  behavior, then passed after repository implementation.
- Three recovery-guidance tests first failed, then the eligibility suite passed
  48/48.
- Formula-safe CSV tests first failed because the export helper did not exist;
  the completed helper suite passed 2/2.
- The expanded browser suite established RED on 11/16 review cases, then passed
  16/16 after the UI fixes.

## Verification

- `npm run lint`: passed.
- `npm run typecheck`: passed for web and domain.
- `npm test`: 163/163 tests passed across 12 files.
- Focused Task 10 unit verification: 129/129 passed across 6 files.
- Focused Task 10 Playwright suite: 16/16 passed.
- Full Playwright coverage: the first 29-test run passed 27 and exposed two
  ambiguous legacy programme-row selectors after the new distributor paths were
  added; both selectors were made path-specific and the affected 2/2 tests then
  passed.
- `npm run build`: passed; 16 application pages generated.
- `npx --yes prisma@6.19.0 validate --schema prisma/schema.prisma`: passed.
- `git diff --check`: passed; only repository line-ending notices were emitted.
- Desktop and 375px adaptive behavior is covered by Playwright, including no
  mobile horizontal overflow, focus entry/return, checkbox Space behavior, and
  motion mutation checks.

## Independent craft review

- Motion verdict: approved. Task 10 has no keyboard-triggered or row-to-row
  inspector motion, and no fixed-offset replay.
- React review: approved. Eligibility projections are memoized against snapshot
  and actor dependencies rather than unrelated busy/error state.
- Apple interaction review: approved. Dense desktop controls retain immediate
  feedback, visible focus, predictable keyboard behavior, and compact adaptive
  detail on mobile.

## Workspace hygiene

`graphify-out/` and `skill-observations/` were present before this work and were
not modified or staged.
