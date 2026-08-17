# Standalone Subvention Smart Merger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one standalone Subvention Control Centre that combines Management reporting, a simple Operations workbench, and controlled browser CRUD for master data.

**Architecture:** Keep business rules in `@smart-epp/domain`, commands and snapshots behind `SubventionRepository`, and role-aware workspaces inside the `/subvention` route tree. Use the current in-memory adapter for the prototype while preserving interfaces for a later Prisma/PostgreSQL adapter. Treat the supplied V5 HTML as behavior reference only.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Zod, Tailwind/CSS tokens, Vitest, Playwright, Prisma schema compatibility.

## Global Constraints

- Deliver Subvention as a standalone product; no page may depend on Onboarding, Foreclosure, or shared platform routes.
- Management, Operations, and Master Data views must use one repository and one status vocabulary.
- Employer is contractual obligor; employee is beneficiary.
- Maker cannot approve own work.
- Approved claim batches and approved master versions are immutable.
- Master changes are effective-dated and versioned.
- Historical records retain the exact rule snapshot used at processing.
- OEM logic is configurable and cannot be hardcoded.
- Duplicate device identifiers and duplicate claims are prohibited.
- Claims beyond filing timelines require authorised override.
- Invoice eligibility uses approved value.
- Claims close only after billing, collection, and accounting reconcile.
- Every material action writes an audit event with actor, timestamp, reason, source, before state, and after state.
- Operations sees plain outcomes and recovery actions; technical rule IDs stay behind progressive disclosure.
- Deep Plum `#53284F` marks V L & CO provenance and restrained accents, never operational status.
- Operational text is at least 12 px; all material controls are keyboard accessible.
- `graphify-out/` and `skill-observations/` remain untracked and excluded from commits.

---

## File Structure

### Domain

- `packages/domain/src/subvention/master-data.ts`: discriminated master records, permissions, relationship validation.
- `packages/domain/src/subvention/management.ts`: financial-period filtering, metric definitions, drill-down read model.
- `packages/domain/src/subvention/claims.ts`: claim batches, lifecycle transitions, locking, reconciliation state.
- `packages/domain/src/subvention/evidence.ts`: PO, document, invoice-line, and transaction-evidence contracts.
- `packages/domain/src/subvention/repositories.ts`: repository command/query interfaces and audit actions.
- `packages/domain/src/subvention/types.ts`: shared Subvention types only.

### Application

- `apps/web/features/subvention/masters/`: Master Data catalogue, grid, form, history inspector, hierarchy.
- `apps/web/features/subvention/management/`: Management filters, metrics, phase position, dues, drill-down drawer.
- `apps/web/features/subvention/operations/`: four-step Operations navigation and work queues.
- `apps/web/features/subvention/claims/`: preparation cards and lifecycle tracker.
- `apps/web/features/subvention/evidence/`: upload evidence summary and evidence drawer.
- `apps/web/features/subvention/data/InMemorySubventionRepository.ts`: in-memory command implementation.
- `apps/web/features/subvention/data/seed.ts`: synthetic and privacy-safe corporate seed data.
- `apps/web/features/subvention/store/SubventionProvider.tsx`: application command/query contract.

### Routes

- `apps/web/app/subvention/page.tsx`: Management plus Operations landing page.
- `apps/web/app/subvention/masters/page.tsx`: Master Data workbench.
- `apps/web/app/subvention/administration/data-model/page.tsx`: hierarchy view.
- `apps/web/app/subvention/operations/page.tsx`: Operations queue.
- `apps/web/app/subvention/claims/page.tsx`: claim preparation and tracking.

---

### Task 1: Stabilise Current Subvention Control Patch

**Files:**
- Modify: current dirty files listed by `git status --short`
- Test: `tests/unit/subvention/*.test.ts`
- Test: `tests/e2e/platform.spec.ts`
- Test: `tests/e2e/subvention-schemes.spec.ts`

**Interfaces:**
- Consumes: current repository and provider contracts.
- Produces: clean baseline commit with discriminated provider results, immutable successor rules, command authorisation, audit snapshots, and route-focus behavior.

- [ ] **Step 1: Inspect dirty scope and exclude generated artifacts**

Run:

```powershell
git status --short
git diff --check
```

Expected: only Subvention control files, tests, `apps/web/package.json`, and `package-lock.json` are tracked changes; generated directories remain untracked.

- [ ] **Step 2: Run current regression suite**

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
```

Expected: lint and type-check pass; all unit tests pass.

- [ ] **Step 3: Run browser and build gates**

```powershell
npm.cmd run test:e2e
npm.cmd run build
npx.cmd prisma validate
```

Expected: full Playwright, production build, and Prisma validation pass.

- [ ] **Step 4: Commit only baseline fixes**

```powershell
git add apps/web packages/domain prisma tests package-lock.json
git commit -m "fix(subvention): harden master and eligibility controls"
```

---

### Task 2: Add Typed Master Data Contracts and Repository CRUD

**Files:**
- Create: `packages/domain/src/subvention/master-data.ts`
- Modify: `packages/domain/src/subvention/repositories.ts`
- Modify: `packages/domain/src/subvention/types.ts`
- Modify: `packages/domain/src/index.ts`
- Modify: `apps/web/features/subvention/data/InMemorySubventionRepository.ts`
- Modify: `apps/web/features/subvention/data/seed.ts`
- Test: `tests/unit/subvention/master-data.test.ts`
- Test: `tests/unit/subvention/repository.test.ts`

**Interfaces:**
- Produces: `MasterRecord`, `MasterKind`, `MasterCommand`, `validateMasterRecord`, `masterDependencies`, `MasterDataRepository.listMasters`, `saveMasterDraft`, `deactivateMaster`.
- Consumes: `Actor`, `AuditEvent`, current `SchemeVersion` and `EmployerProgrammeMappingVersion` workflows.

- [ ] **Step 1: Write failing domain tests**

```ts
it("rejects a reseller whose OEM does not exist", () => {
  const issue = validateMasterRecord(reseller, { ...catalogue, oems: [] });
  expect(issue.map((item) => item.code)).toContain("MASTER_OEM_NOT_FOUND");
});

it("blocks deletion when a product is referenced by an approved scheme", () => {
  expect(masterDependencies("product-1", snapshot)).toContainEqual(
    expect.objectContaining({ entityType: "SchemeVersion" }),
  );
});
```

- [ ] **Step 2: Run tests and verify RED**

```powershell
npx.cmd vitest run tests/unit/subvention/master-data.test.ts
```

Expected: FAIL because `master-data` contracts do not exist.

- [ ] **Step 3: Implement discriminated records**

```ts
export type MasterKind =
  | "OEM"
  | "DISTRIBUTOR"
  | "RESELLER"
  | "PRODUCT"
  | "EMPLOYER";

export interface MasterRecordBase {
  id: string;
  kind: MasterKind;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}
```

Add typed discriminator-specific fields: OEM defaults; distributor OEM; reseller OEM and distributor; product OEM and model; employer programme code.

- [ ] **Step 4: Implement repository commands and audit events**

`saveMasterDraft` must validate codes and relationships, authorise `MASTER_DATA_ADMIN`, retain before/after snapshots, and never overwrite versioned schemes or mappings. `deactivateMaster` must fail when `masterDependencies` returns active dependants.

- [ ] **Step 5: Run focused and full unit tests**

```powershell
npx.cmd vitest run tests/unit/subvention/master-data.test.ts tests/unit/subvention/repository.test.ts
npm.cmd test
```

- [ ] **Step 6: Commit**

```powershell
git add packages/domain apps/web/features/subvention/data tests/unit/subvention
git commit -m "feat(subvention): add controlled master data repository"
```

---

### Task 3: Build Master Data CRUD Workbench and Hierarchy

**Files:**
- Create: `apps/web/features/subvention/masters/masterDefinitions.ts`
- Create: `apps/web/features/subvention/masters/MasterDataWorkbench.tsx`
- Create: `apps/web/features/subvention/masters/MasterRecordForm.tsx`
- Create: `apps/web/features/subvention/masters/MasterHistoryInspector.tsx`
- Create: `apps/web/features/subvention/masters/MasterHierarchy.tsx`
- Create: `apps/web/app/subvention/masters/page.tsx`
- Create: `apps/web/app/subvention/administration/data-model/page.tsx`
- Modify: `apps/web/features/subvention/store/SubventionProvider.tsx`
- Modify: `apps/web/components/shell/ModuleNavigation.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `tests/e2e/subvention-masters.spec.ts`

**Interfaces:**
- Consumes: Task 2 `MasterRecord`, `MasterKind`, repository CRUD commands.
- Produces: role-aware browser CRUD and hierarchy routes.

- [ ] **Step 1: Write failing browser tests**

```ts
test("master admin creates and edits a reseller draft", async ({ page }) => {
  await page.goto("/subvention/masters");
  await page.getByRole("button", { name: "Resellers" }).click();
  await page.getByRole("button", { name: "Add reseller" }).click();
  await page.getByLabel("Code").fill("RS-RADIUS");
  await page.getByLabel("Name").fill("Radius Systems");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("RS-RADIUS")).toBeVisible();
});
```

Add tests for read-only Auditor, dependency-blocked deactivate, and hierarchy-to-catalogue navigation.

- [ ] **Step 2: Run tests and verify RED**

```powershell
npx.cmd playwright test tests/e2e/subvention-masters.spec.ts
```

Expected: FAIL with 404 or missing workbench controls.

- [ ] **Step 3: Implement catalogue and table**

Use one catalogue rail, one dense table, status/search filters, pagination, row actions, and a right-side inspector. Render fields from typed `masterDefinitions`; do not build one giant switch inside the component.

- [ ] **Step 4: Implement forms and permissions**

Save failures keep the form open. `MANAGEMENT_VIEWER` and `AUDITOR` receive no mutating controls. Approved Scheme and Programme Mapping actions continue using existing maker-checker dialogs.

- [ ] **Step 5: Implement hierarchy**

```text
OEM → Distributor → Reseller → Product
Employer → Employer Programme Mapping → Scheme
Purchase Transaction → Eligibility Decision → Claim Batch
```

Each node opens the related workbench view.

- [ ] **Step 6: Verify and commit**

```powershell
npx.cmd playwright test tests/e2e/subvention-masters.spec.ts
npm.cmd run lint
npm.cmd run typecheck
git add apps/web tests/e2e/subvention-masters.spec.ts
git commit -m "feat(subvention): add master data workbench"
```

---

### Task 4: Add Management Metrics, Filters, and Exact Drill-downs

**Files:**
- Create: `packages/domain/src/subvention/management.ts`
- Create: `apps/web/features/subvention/management/managementReadModel.ts`
- Create: `apps/web/features/subvention/management/ManagementOverview.tsx`
- Create: `apps/web/features/subvention/management/ManagementDrilldown.tsx`
- Modify: `apps/web/features/subvention/data/seed.ts`
- Modify: `apps/web/app/subvention/page.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `tests/unit/subvention/management.test.ts`
- Test: `tests/e2e/subvention-management.spec.ts`

**Interfaces:**
- Produces: `ManagementPeriodFilter`, `SubventionFinancialRecord`, `selectManagementOverview`.
- Consumes: transaction, decision, claim, invoice, and receipt snapshots. Until Task 6 adds live claims, use explicit seeded financial records with source IDs.

- [ ] **Step 1: Write failing period and drill-down tests**

```ts
it("returns exactly the records counted by payment due", () => {
  const model = selectManagementOverview(records, {
    financialYear: "2026-27",
    quarter: "Q1",
    month: "ALL",
  });
  expect(model.paymentDue.amountPaise).toBe(
    model.paymentDue.records.reduce((sum, row) => sum + row.outstandingPaise, 0),
  );
});
```

- [ ] **Step 2: Verify RED**

```powershell
npx.cmd vitest run tests/unit/subvention/management.test.ts
```

- [ ] **Step 3: Implement Indian FY filtering and metric definitions**

Metrics: received, payment due, in progress, overdue. Group phase position by canonical claim phase and dues by settlement counterparty. Preview eligibility decisions must not contribute financial amounts.

- [ ] **Step 4: Build Management UI**

Place Management above Operations on `/subvention`. Each tile and grouped row opens a drill-down drawer with IDs, employer, counterparty, phase, amount, received, outstanding, and due date. Keep filter state in URL query parameters.

- [ ] **Step 5: Verify and commit**

```powershell
npx.cmd vitest run tests/unit/subvention/management.test.ts
npx.cmd playwright test tests/e2e/subvention-management.spec.ts
git add packages/domain apps/web tests
git commit -m "feat(subvention): add management financial overview"
```

---

### Task 5: Build Simplified Operations Workbench

**Files:**
- Create: `apps/web/features/subvention/operations/operationsReadModel.ts`
- Create: `apps/web/features/subvention/operations/OperationsWorkbench.tsx`
- Create: `apps/web/features/subvention/operations/TransactionEvidenceDrawer.tsx`
- Create: `apps/web/app/subvention/operations/page.tsx`
- Modify: `apps/web/app/subvention/page.tsx`
- Modify: `apps/web/app/subvention/eligibility/page.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `tests/unit/subvention/operations-read-model.test.ts`
- Test: `tests/e2e/subvention-operations.spec.ts`

**Interfaces:**
- Consumes: persisted decisions, transactions, rule snapshots, Task 4 landing layout.
- Produces: four-step workbench and canonical Operations outcomes.

- [ ] **Step 1: Write failing outcome tests**

```ts
it("shows unevaluated records as Processing, not Ready for Claim", () => {
  expect(selectOperationsRow(transaction, undefined).status).toBe("PROCESSING");
});
```

Canonical visible outcomes: Processing, Needs Review, Blocked, Ready for Claim, In Claim Batch, Submitted, Approved, Rejected, Invoiced, Collected.

- [ ] **Step 2: Verify RED, implement read model, verify GREEN**

```powershell
npx.cmd vitest run tests/unit/subvention/operations-read-model.test.ts
```

- [ ] **Step 3: Build compact work queue**

Columns: Transaction, Employer, PO and Invoice, System Result, Action. Evidence details open in a drawer and show Purchase Order, Vendor Invoice, Device Identifier, Programme, Scheme, settlement route, expected amount, and deadline.

- [ ] **Step 4: Add exception-led actions**

Automatic evaluation runs after controlled import. Bulk actions report persisted results. Operations sees recovery text for failed or review rules.

- [ ] **Step 5: Verify and commit**

```powershell
npx.cmd playwright test tests/e2e/subvention-operations.spec.ts
npm.cmd run lint
npm.cmd run typecheck
git add apps/web tests
git commit -m "feat(subvention): add operations workbench"
```

---

### Task 6: Add Claim Preparation and Lifecycle Tracking

**Files:**
- Create: `packages/domain/src/subvention/claims.ts`
- Modify: `packages/domain/src/subvention/repositories.ts`
- Modify: `apps/web/features/subvention/data/InMemorySubventionRepository.ts`
- Create: `apps/web/features/subvention/claims/ClaimPreparation.tsx`
- Create: `apps/web/features/subvention/claims/ClaimLifecycleTracker.tsx`
- Modify: `apps/web/app/subvention/claims/page.tsx`
- Modify: `apps/web/features/subvention/store/SubventionProvider.tsx`
- Test: `tests/unit/subvention/claims.test.ts`
- Test: `tests/e2e/subvention-claims.spec.ts`

**Interfaces:**
- Produces: `ClaimBatch`, `ClaimBatchLine`, `createClaimBatch`, `submitClaimBatch`, `approveClaimBatch`, `recordClaimSubmission`, `recordClaimResponse`.
- Consumes: persisted eligible decisions and configured settlement counterparty.

- [ ] **Step 1: Write failing claim-control tests**

```ts
it("groups only persisted eligible transactions for one settlement route", () => {
  const batch = createClaimBatch(input);
  expect(new Set(batch.lines.map((line) => line.settlementCounterpartyId))).toEqual(
    new Set(["distributor-ingram"]),
  );
});

it("locks an approved batch", () => {
  expect(() => addLine(approvedBatch, line)).toThrow("CLAIM_BATCH_LOCKED");
});
```

- [ ] **Step 2: Verify RED and implement domain transitions**

Statuses: DRAFT, SUBMITTED_FOR_APPROVAL, APPROVED_LOCKED, COUNTERPARTY_SUBMITTED, PARTIALLY_RESPONDED, RESPONDED, INVOICED, PARTIALLY_COLLECTED, COLLECTED, ACCOUNTED, CLOSED.

- [ ] **Step 3: Implement repository commands and audit snapshots**

Reject duplicate transaction inclusion. Maker cannot approve own batch. Approved batch lines and expected amounts remain immutable.

- [ ] **Step 4: Build route cards and lifecycle tracker**

Cards show counterparty, transaction count, expected amount, oldest invoice, remaining claim window, and warnings. Tracker shows current phase, days in phase, next owner, and next action.

- [ ] **Step 5: Verify and commit**

```powershell
npx.cmd vitest run tests/unit/subvention/claims.test.ts
npx.cmd playwright test tests/e2e/subvention-claims.spec.ts
git add packages/domain apps/web tests
git commit -m "feat(subvention): add controlled claim lifecycle"
```

---

### Task 7: Add PO and Invoice Evidence Contracts

**Files:**
- Create: `packages/domain/src/subvention/evidence.ts`
- Modify: `packages/domain/src/subvention/repositories.ts`
- Modify: `apps/web/features/subvention/data/InMemorySubventionRepository.ts`
- Modify: `apps/web/features/subvention/data/seed.ts`
- Create: `apps/web/features/subvention/evidence/EvidenceSummary.tsx`
- Create: `apps/web/features/subvention/evidence/EvidenceDrawer.tsx`
- Modify: `apps/web/features/subvention/operations/TransactionEvidenceDrawer.tsx`
- Test: `tests/unit/subvention/evidence.test.ts`
- Test: `tests/e2e/subvention-evidence.spec.ts`

**Interfaces:**
- Produces: `PurchaseOrderEvidence`, `VendorInvoiceEvidence`, `InvoiceLineEvidence`, `TransactionEvidenceLink`, `validateEvidenceLink`.
- Consumes: master records and purchase transactions.

- [ ] **Step 1: Write failing evidence tests**

```ts
it("rejects a device identifier absent from the linked invoice line", () => {
  expect(validateEvidenceLink(link, evidence).map((issue) => issue.code)).toContain(
    "EVIDENCE_DEVICE_NOT_ON_INVOICE",
  );
});

it("accepts a delivery-note-linked E-Way Bill", () => {
  expect(validateEvidenceLink(dixitLink, evidence)).not.toContainEqual(
    expect.objectContaining({ code: "EVIDENCE_EWAY_DOCUMENT_MISMATCH" }),
  );
});
```

- [ ] **Step 2: Verify RED and implement canonical contracts**

Keep employee personal information outside evidence read models. Seed Fore Excel, Bluefin, Dixit, Unicorn, and Tortoise linked-service examples using corporate names and masked personal data.

- [ ] **Step 3: Integrate evidence before eligibility**

A transaction cannot become Ready for Claim when PO, invoice, device identifier, programme, or scheme evidence is missing or mismatched. Part-A-only movement evidence produces Needs Review, not Ready for Claim.

- [ ] **Step 4: Verify and commit**

```powershell
npx.cmd vitest run tests/unit/subvention/evidence.test.ts
npx.cmd playwright test tests/e2e/subvention-evidence.spec.ts
git add packages/domain apps/web tests
git commit -m "feat(subvention): link transactions to purchase evidence"
```

---

### Task 8: Standalone Shell and Whole-System Verification

**Files:**
- Modify: `apps/web/app/subvention/layout.tsx`
- Modify: `apps/web/components/shell/ModuleNavigation.tsx`
- Modify: `apps/web/components/shell/PlatformShell.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `README.md`
- Test: `tests/e2e/subvention-standalone.spec.ts`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: self-contained Subvention product with no operational dependency on other Smart EPP modules.

- [ ] **Step 1: Write failing standalone route tests**

```ts
test("Subvention navigation contains no Onboarding or Foreclosure dependency", async ({ page }) => {
  await page.goto("/subvention");
  await expect(page.getByRole("link", { name: "Onboarding" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Foreclosure" })).toHaveCount(0);
});
```

- [ ] **Step 2: Implement standalone navigation and role landing behavior**

Management lands on Management Overview; Operations lands on Operations Workbench; Master Data Administrator lands on Masters. Keep `Developed by V L & CO` visible in persistent shell provenance.

- [ ] **Step 3: Run full automated gates**

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
npx.cmd prisma validate
git diff --check
```

- [ ] **Step 4: Inspect browser layouts**

Inspect Management, Operations, Master Data, hierarchy, claim preparation, and evidence drawer at 1440 px and 375 px widths. Confirm no clipped primary actions, no text below 12 px, visible focus, correct empty states, and reduced-motion final states.

- [ ] **Step 5: Commit**

```powershell
git add apps/web README.md tests/e2e/subvention-standalone.spec.ts
git commit -m "feat(subvention): complete standalone control centre"
```

