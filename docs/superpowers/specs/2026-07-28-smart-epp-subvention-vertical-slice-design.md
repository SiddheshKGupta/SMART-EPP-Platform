# Smart EPP Subvention Vertical Slice Design

**Date:** 28 July 2026  
**Status:** Approved design, pending written-spec review  
**Scope:** Smart EPP platform UX foundation plus Scheme Master, Employer Programme Mapping, Purchase Transaction Repository, and Eligibility Engine

## 1. Purpose

This design defines the first complete vertical slice of the Smart EPP Operating Platform. It establishes the shared platform experience and implements the beginning of the Subvention lifecycle:

```text
Scheme Master
→ Employer Programme Mapping
→ Purchase Transaction Repository
→ Eligibility Engine
```

The slice must demonstrate that Smart EPP can operate as Connect's institutional operating layer rather than as a collection of standalone prototypes or spreadsheet replacements.

The existing onboarding and foreclosure HTML prototypes are business references only. They contribute workflows, fields, validations, calculations, role gates, evidence requirements, and audit expectations. Their layout, styling, component patterns, and visual hierarchy must not be reused.

## 2. Product Context

Smart EPP is an employer-anchored B2B2E device-leasing programme:

```text
OEM / Distributor / Reseller
→ Connect
→ Employer contractual obligor
→ Employee beneficiary
```

Connect underwrites the employer. The platform must therefore retain employer, programme, transaction, financial, evidence, and control context together.

The initial platform contains three business modules:

1. Onboarding & Programme Readiness
2. Foreclosure & Lease Closure
3. Subvention Management

These modules share masters, workflow controls, roles, exceptions, documents, audit events, reporting conventions, and one application shell.

## 3. Validated Starter State

The starter repository has appropriate high-level monorepo boundaries:

- `apps/web` for the Next.js application
- `packages/domain` for shared business rules
- `packages/ui` for reusable UI contracts
- `prisma` for the future persistence model
- `tests` for unit and browser specifications

The current implementation is only a shell:

- The web application does not consume the domain or UI packages.
- Subvention contains static seeded metrics only.
- The Prisma schema does not model scheme-to-programme mapping or eligibility decisions.
- Business rules are isolated assertion helpers rather than a decision engine.
- ESLint is not configured and the existing `next lint` command is deprecated.
- One Playwright test uses an ambiguous text locator.
- A production build and TypeScript check pass.
- Four existing unit-control tests pass.

This slice will preserve the monorepo structure while creating explicit domain, repository, application, and presentation boundaries.

## 4. Scope

### 4.1 Included

- Shared enterprise application shell
- Role-aware platform home
- Hybrid global and module navigation
- Global command/search affordance
- Subvention Control Desk
- Scheme Master list, detail, versioning, submission, and approval
- Employer Programme Mapping list, detail, versioning, submission, and approval
- Purchase Transaction Repository with deterministic LMS seed adapter
- Import validation summary and row quarantine
- Eligibility evaluation and re-evaluation
- Rule trace and preserved rule snapshots
- Typed exception outcomes
- Audit events for every material action
- Prisma schema as a future persistence contract
- Unit and Playwright coverage
- Lint, type-check, test, E2E, and build repair

### 4.2 Excluded

- Live PostgreSQL connectivity or migrations against a deployed database
- Authentication provider integration
- Live LMS, accounting, GST, email, or document-storage integration
- Claim batch creation and claim approval
- OEM submission and OEM response processing
- Rejection representation
- Invoicing, collection, accounting, reconciliation, and closure
- Onboarding and Foreclosure implementation inside the new shell
- Codex-mem installation
- Graphify installation

Later Subvention slices will build on the decision snapshots and repository interfaces defined here.

## 5. Locked Experience Direction

### 5.1 Platform structure

The platform uses a hybrid control-desk structure:

- A global icon-and-label rail provides stable platform navigation.
- Entering a module reveals its contextual navigation.
- A persistent command bar provides global search, employer/programme context, quick actions, notifications, and the active role.
- The main canvas supports dashboards, work queues, split workspaces, record details, and reconciliation views.

Global navigation:

```text
Command Centre
Workbench
Programmes
Operations
Transactions
Controls
Analytics
Administration
```

Subvention contextual navigation:

```text
Control Desk
Schemes & Programmes
Purchase Repository
Eligibility Operations
Exceptions
Audit
```

### 5.2 Platform home

The default home is a role-aware attention ledger.

- Operational users see tasks, approvals, exceptions, deadlines, ownership, and waiting states.
- Management sees the same underlying records grouped by financial value, risk, ageing, module health, and responsible function.
- Auditors receive read-only evidence and history views.
- Every headline value opens the filtered underlying records.

The platform must not contain decorative or non-drillable KPI cards.

### 5.3 Record interaction

Records use an adaptive split workspace:

- The work queue stays visible on the left.
- The selected record opens on the right.
- The detail pane can expand into a deep-linked full record.
- Back navigation restores filters, sorting, scroll position, and selected record.
- Complex approval or audit views can use the full canvas without losing a route back to the original queue.

### 5.4 Visual character

The selected direction is expressive Apple-inspired layering adapted for dense enterprise operations.

This means:

- Precise typography and information hierarchy
- Larger controlled radii on shell, sheets, signals, and primary workspaces
- Quiet translucency in the command bar and modal background separation
- Layered surfaces with a consistent, restrained elevation scale
- Strong spatial continuity between list, inspector, and record states
- Dense tables with flatter geometry and minimal visual movement
- One clear primary action per context

It does not mean:

- Copying Apple product screens
- Consumer-style whitespace that reduces operating density
- Decorative glassmorphism
- Large marketing heroes
- Floating gradients behind working tables
- Motion that delays access to data

### 5.5 Design tokens

The documented Smart EPP palette remains authoritative:

- Navy: `#132A4F`
- Primary blue: `#2457D6`
- Brand red: `#C83B3B`
- Canvas: `#F6F8FB`
- Surface: `#FFFFFF`
- Main text: `#182230`
- Muted text: `#667085`
- Border: `#DDE3EA`
- Success: `#168A5B`
- Warning: `#C87912`
- Critical: `#C43C3C`
- Authorised exception: purple

Core radius levels:

- Dense control: 8px
- Table or compact panel: 12px
- Primary workspace: 18px
- Sheet, shell, or major layered surface: 22px

Typography:

- Interface: Geist Sans or a system-safe equivalent
- IDs, financial values, timestamps, and rule codes: Geist Mono or a system monospace equivalent
- Table body: 12–13px
- General interface body: 13–14px
- Section heading: 16–18px
- Page heading: 24–28px
- No operational body copy below 12px

## 6. Component Architecture

### 6.1 Domain package

`packages/domain` owns:

- Domain types and Zod schemas
- Money and date helpers
- Effective-date interval rules
- Scheme-overlap validation
- Programme-mapping resolution
- Eligibility evaluation
- Rule-result and issue codes
- Maker-checker and immutability controls

The domain package must not import React, Next.js, Prisma, browser APIs, or seeded presentation data.

### 6.2 Repository contracts

The application consumes interfaces rather than direct fixture arrays:

```ts
interface Actor {
  userId: string;
  role: string;
}

type SchemeDraftInput = Omit<
  SchemeVersion,
  "id" | "version" | "workflowStatus" | "makerUserId" | "checkerUserId" | "approvedAt" | "createdAt"
>;

type ProgrammeMappingDraftInput = Omit<
  EmployerProgrammeMappingVersion,
  "id" | "version" | "workflowStatus" | "makerUserId" | "checkerUserId" | "approvedAt" | "createdAt"
>;

interface SchemeRepository {
  list(): Promise<SchemeVersion[]>;
  get(id: string): Promise<SchemeVersion | null>;
  saveDraft(input: SchemeDraftInput, actor: Actor): Promise<SchemeVersion>;
  submit(id: string, actor: Actor, remarks: string): Promise<SchemeVersion>;
  approve(id: string, actor: Actor, remarks: string): Promise<SchemeVersion>;
}

interface ProgrammeMappingRepository {
  list(): Promise<EmployerProgrammeMappingVersion[]>;
  get(id: string): Promise<EmployerProgrammeMappingVersion | null>;
  saveDraft(
    input: ProgrammeMappingDraftInput,
    actor: Actor,
  ): Promise<EmployerProgrammeMappingVersion>;
  submit(id: string, actor: Actor, remarks: string): Promise<EmployerProgrammeMappingVersion>;
  approve(id: string, actor: Actor, remarks: string): Promise<EmployerProgrammeMappingVersion>;
}

interface PurchaseTransactionRepository {
  list(filters?: PurchaseTransactionFilters): Promise<PurchaseTransaction[]>;
  import(rows: PurchaseTransactionInput[], actor: Actor): Promise<ImportResult>;
}

interface EligibilityDecisionRepository {
  list(filters?: EligibilityDecisionFilters): Promise<EligibilityDecision[]>;
  latestForTransaction(transactionId: string): Promise<EligibilityDecision | null>;
  append(decision: EligibilityDecision): Promise<void>;
}

interface ImportResult {
  accepted: PurchaseTransaction[];
  quarantined: Array<{
    rowNumber: number;
    input: PurchaseTransactionInput;
    issues: DomainIssue[];
  }>;
}

interface AuditRepository {
  append(event: AuditEvent): Promise<void>;
  listForEntity(entityType: string, entityId: string): Promise<AuditEvent[]>;
}
```

The first implementation provides deterministic in-memory adapters under the web application. Later Prisma adapters must implement the same contracts.

### 6.3 Presentation package

`packages/ui` owns stable shared contracts and reusable primitives where cross-module reuse is proven:

- Status tone and status badge
- Money and identifier presentation
- Page and record headers
- Dense data-table shell
- Empty, loading, permission-denied, and failure states
- Audit timeline
- Rule trace
- Split workspace

Module-specific business composition remains in `apps/web`.

### 6.4 UI primitives

Tailwind provides token-based styling. Selected shadcn/Radix primitives provide accessible behaviour:

- `Command`
- `Table`
- `Sheet`
- `Dialog`
- `AlertDialog`
- `Tabs`
- `Tooltip`
- `Popover`
- `Select`
- `Badge`
- `Button`
- `Input`
- `Label`
- `ScrollArea`
- `Skeleton`

Smart EPP owns the source and styling. The application must not look like an unmodified shadcn starter.

## 7. Domain Model

### 7.1 Scheme version

```ts
type MasterWorkflowStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "RETURNED"
  | "REJECTED"
  | "SUPERSEDED"
  | "INACTIVE";

type CalculationBasis = "INVOICE_VALUE" | "BASE_VALUE" | "FLAT_AMOUNT";

interface SchemeVersion {
  id: string;
  schemeId: string;
  version: number;
  code: string;
  name: string;
  oemId: string;
  distributorId?: string;
  settlementCounterpartyType: "OEM" | "DISTRIBUTOR" | "RESELLER";
  calculationBasis: CalculationBasis;
  rateBps?: number;
  flatAmountPaise?: number;
  claimTimelineDays: number;
  priority: number;
  eligibleProductIds: string[];
  effectiveFrom: string;
  effectiveTo: string;
  requiredDocumentCodes: string[];
  workflowStatus: MasterWorkflowStatus;
  makerUserId: string;
  checkerUserId?: string;
  approvedAt?: string;
  createdAt: string;
}
```

Rules:

- `code` is unique per logical scheme.
- Versions increment monotonically within `schemeId`.
- Dates are inclusive at both boundaries.
- `effectiveFrom` must not be after `effectiveTo`.
- Percentage rules require `rateBps` between 1 and 10,000.
- Flat rules require a positive `flatAmountPaise`.
- Non-flat rules must not carry `flatAmountPaise`.
- Approved versions are immutable.
- Changes to an approved scheme create a new draft version.
- Overlapping approved versions with equal resolution priority are prohibited.

### 7.2 Employer programme mapping version

```ts
interface ProgrammeRuleOverride {
  calculationBasis?: CalculationBasis;
  rateBps?: number;
  flatAmountPaise?: number;
  claimTimelineDays?: number;
  eligibleProductIds?: string[];
  approvalReference: string;
}

interface EmployerProgrammeMappingVersion {
  id: string;
  mappingId: string;
  version: number;
  employerId: string;
  programmeId: string;
  oemId: string;
  schemeVersionId: string;
  resellerId?: string;
  distributorId?: string;
  launchDate: string;
  effectiveFrom: string;
  effectiveTo: string;
  overrides?: ProgrammeRuleOverride;
  workflowStatus: MasterWorkflowStatus;
  makerUserId: string;
  checkerUserId?: string;
  approvedAt?: string;
  createdAt: string;
}
```

Rules:

- Mapping dates are inclusive.
- Launch date is mandatory.
- A purchase before launch date is not eligible.
- A mapping must point to an approved scheme version.
- An approved override requires an approval reference.
- Mapping changes create a new version.
- A transaction must resolve to exactly one approved mapping.
- Two mappings that can match the same employer, programme, OEM, product, and date are prohibited.

### 7.3 Purchase transaction

Money is stored as integer paise in the domain to avoid floating-point financial errors.

```ts
type LeaseTransactionStatus = "ACTIVE" | "CANCELLED" | "RETURNED" | "REVERSED";

interface PurchaseTransaction {
  id: string;
  leaseId: string;
  lotId: string;
  employeeId: string;
  employerId: string;
  programmeId: string;
  oemId: string;
  productId: string;
  imei: string;
  purchaseOrderNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValuePaise: number;
  baseValuePaise: number;
  gstAmountPaise: number;
  resellerId: string;
  distributorId?: string;
  leaseStatus: LeaseTransactionStatus;
  sourceSystem: "LMS" | "CONTROLLED_UPLOAD";
  importedAt: string;
}
```

Rules:

- IMEI is globally unique.
- Lease ID is unique.
- Duplicate invoice upload is rejected by the stable source-row key
  `sourceSystem + leaseId + imei + invoiceNumber`.
- Existing claimed IMEIs and lease IDs cannot be claimed again.
- Cancelled, returned, or reversed transactions cannot become eligible.
- Invalid rows are quarantined without blocking valid rows in the same import.

### 7.4 Eligibility decision

```ts
type EligibilityStatus =
  | "ELIGIBLE"
  | "INELIGIBLE"
  | "EXCEPTION_REVIEW";

type RuleOutcome = "PASS" | "FAIL" | "REVIEW";

interface RuleResult {
  code: string;
  label: string;
  outcome: RuleOutcome;
  reason: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
}

interface EligibilityRuleSnapshot {
  employerProgrammeMappingVersionId: string;
  schemeVersionId: string;
  calculationBasis: CalculationBasis;
  rateBps?: number;
  flatAmountPaise?: number;
  claimTimelineDays: number;
  eligibleProductIds: string[];
  settlementCounterpartyType: "OEM" | "DISTRIBUTOR" | "RESELLER";
  precedenceSources: string[];
}

interface EligibilityDecision {
  id: string;
  transactionId: string;
  version: number;
  status: EligibilityStatus;
  expectedAmountPaise: number;
  filingDeadline: string;
  evaluatedAt: string;
  evaluatedBy: string;
  ruleSnapshot?: EligibilityRuleSnapshot;
  ruleResults: RuleResult[];
  previousDecisionId?: string;
}
```

Eligibility decisions are append-only. A re-evaluation creates the next decision version and links it to the previous decision.

## 8. Master Workflow and Controls

Scheme versions and programme-mapping versions use:

```text
Draft
→ Submitted
→ Approved

Submitted
→ Returned
→ Draft

Submitted
→ Rejected

Approved
→ Superseded by a later approved version
```

Controls:

- Maker cannot approve own work.
- Submission and approval require remarks.
- The approved payload is immutable.
- A correction to approved data creates a new draft version.
- Approval creates a version snapshot and audit event.
- Historical decisions continue to reference their original version IDs.
- Elevated reopening is not part of this slice; version replacement is the supported correction path.

## 9. Eligibility Resolution

### 9.1 Inputs

```ts
interface EvaluateEligibilityInput {
  transaction: PurchaseTransaction;
  schemes: SchemeVersion[];
  mappings: EmployerProgrammeMappingVersion[];
  existingClaimedImeis: ReadonlySet<string>;
  existingClaimedLeaseIds: ReadonlySet<string>;
  evaluationDate: string;
  actor: Actor;
}
```

### 9.2 Evaluation order

The engine evaluates rules in this fixed order:

1. Validate transaction fields and positive financial values.
2. Confirm lease status is `ACTIVE`.
3. Confirm IMEI and lease are not duplicated in the repository.
4. Confirm IMEI and lease have not already been claimed.
5. Find approved mapping versions matching employer, programme, OEM, and invoice date.
6. Require exactly one matching mapping.
7. Confirm invoice date is on or after the programme launch date.
8. Resolve the explicitly mapped approved scheme version.
9. Confirm the scheme covers the invoice date.
10. Confirm the scheme or approved programme override covers the product.
11. Resolve rule values using:

```text
Approved employer programme override
→ approved scheme rule
→ configured OEM default
→ authorised exception
```

12. Calculate expected amount.
13. Calculate filing deadline from invoice date plus configured timeline days.
14. Compare evaluation date with the filing deadline.
15. Emit decision, rule results, immutable snapshot, and audit event.

The configured OEM default is read-only seed configuration in this slice. A full OEM Master UI is deferred.

```ts
interface OemRuleDefaults {
  oemId: string;
  calculationBasis?: CalculationBasis;
  rateBps?: number;
  flatAmountPaise?: number;
  claimTimelineDays?: number;
  settlementCounterpartyType?: "OEM" | "DISTRIBUTOR" | "RESELLER";
}
```

OEM defaults may fill a missing scheme value only where configuration explicitly permits inheritance. They cannot override an approved scheme or programme value.

### 9.3 Calculation

Percentage calculation:

```ts
expectedAmountPaise = Math.round(
  (basisAmountPaise * rateBps) / 10_000,
);
```

Flat calculation:

```ts
expectedAmountPaise = flatAmountPaise;
```

`basisAmountPaise` is:

- `invoiceValuePaise` for `INVOICE_VALUE`
- `baseValuePaise` for `BASE_VALUE`

All amounts remain integer paise. Display formatting uses the `en-IN` locale.

### 9.4 Outcome rules

`ELIGIBLE`:

- Every mandatory rule passes.
- Exactly one mapping and one approved scheme resolve.
- The filing deadline has not passed.

`INELIGIBLE`:

- Transaction is cancelled, returned, or reversed.
- Product is not covered.
- Transaction predates programme launch.
- Duplicate IMEI, lease, invoice upload, or prior claim is confirmed.
- Required financial data is invalid.

`EXCEPTION_REVIEW`:

- No mapping resolves.
- More than one mapping resolves.
- Scheme validity is ambiguous.
- Filing deadline has passed and an override route may be available.
- Required configuration is missing.

The engine never guesses a mapping, scheme, basis, rate, or counterparty.

## 10. Subvention Screens

### 10.1 Control Desk

The Control Desk shows:

- Transactions awaiting evaluation
- Eligible value
- Exception count and value
- Filing deadlines within 15 and 7 days
- Expired transaction value
- Duplicate IMEI incidents
- Mapping conflicts
- Scheme and programme expiries

Each signal opens a filtered queue.

### 10.2 Schemes & Programmes

The combined workspace has switchable Scheme and Programme Mapping views.

Scheme columns:

- Scheme code and version
- OEM
- Settlement counterparty
- Calculation basis
- Rate or flat amount
- Filing timeline
- Effective dates
- Priority
- Workflow status

Programme-mapping columns:

- Employer
- Programme
- OEM
- Scheme and version
- Launch date
- Effective dates
- Distributor or reseller
- Override indicator
- Workflow status

The adaptive detail pane contains:

- Summary
- Configuration
- Product coverage
- Mapping impact
- Documents
- Version history
- Approval history
- Audit history

### 10.3 Purchase Repository

The grid supports:

- Search by lease, lot, employee, employer, IMEI, invoice, or programme
- Saved filters for eligible, ineligible, exception review, expired, duplicate, and previously claimed
- Frozen identifier columns
- Sortable financial and date columns
- Column visibility
- Export of the current filtered view
- Row warnings with text and icon, not colour alone

The import summary reports:

- Total rows
- Accepted rows
- Quarantined rows
- Duplicate IMEIs
- Duplicate leases
- Duplicate invoice-upload keys
- Missing mandatory fields
- Downloadable row-level issue register

### 10.4 Eligibility Operations

The split workspace displays:

Left:

- Evaluation queue
- Filters
- Decision status
- Filing deadline
- Expected amount
- Previous-decision indicator

Right:

- Transaction summary
- Applied programme mapping
- Applied scheme version
- Calculation breakdown
- Settlement counterparty
- Ordered rule trace
- Previous-versus-current decision comparison
- Audit timeline

Bulk evaluation shows counts and values by outcome. A failed row does not roll back successful independent decisions.

## 11. Error and Exception Model

Domain failures return typed issues:

```ts
type IssueSeverity = "ERROR" | "WARNING" | "REVIEW";

interface DomainIssue {
  code: string;
  severity: IssueSeverity;
  entityType: string;
  entityId?: string;
  field?: string;
  message: string;
  recoveryAction: string;
}
```

UI behaviour:

- Field issues appear next to affected controls.
- A linked summary appears above forms with multiple issues.
- Import issues attach to individual rows.
- Permission failures explain the required role.
- Empty states identify the next valid action.
- Loading uses stable skeleton geometry.
- Failed requests preserve user input and provide retry.
- Unsaved sheet dismissal requires confirmation.

Exceptions are records, not badge-only states. They carry category, severity, financial impact, owner, due date, escalation level, recovery action, evidence, and closure approval.

## 12. Audit Model

Every material action appends an audit event:

```ts
interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorRole: string;
  occurredAt: string;
  priorState?: unknown;
  newState?: unknown;
  remarks?: string;
  source: "USER" | "SYSTEM" | "INTEGRATION";
}
```

Material actions include:

- Create or modify draft
- Submit, return, reject, or approve master version
- Supersede master version
- Import transaction
- Quarantine import row
- Evaluate or re-evaluate eligibility
- Create exception
- Request or decide override

Audit history is read-only and presented chronologically with actor, role, timestamp, action, remarks, and state change.

## 13. Motion and Accessibility

GSAP is limited to:

- Inspector entrance and expansion
- Record-to-detail spatial continuity
- Shared context when switching between list and full record
- Important workflow state transitions

Motion constraints:

- Micro-interactions: 150–220ms
- Inspector and record transitions: 180–320ms
- Exit duration is shorter than entrance duration
- Only transform and opacity animate
- Navigation never waits for animation
- Dense table rows do not stagger or overshoot
- Animations remain interruptible
- `prefers-reduced-motion` disables nonessential motion

Accessibility:

- Text contrast meets WCAG AA.
- Keyboard focus is visible.
- Navigation and records are fully keyboard reachable.
- Icon-only controls have accessible names.
- Status never relies on colour alone.
- Route changes move focus to the main heading.
- Tables use semantic table markup.
- Sheets and dialogs manage focus and restore it to their trigger.
- Touch targets remain at least 44px where touch interaction is expected.

## 14. Persistence Contract

The Prisma schema will be normalised to represent:

- OEM
- Product
- Employer
- Programme
- Scheme
- SchemeVersion
- EmployerProgrammeMapping
- EmployerProgrammeMappingVersion
- PurchaseTransaction
- EligibilityDecision
- EligibilityRuleResult
- EligibilityRuleSnapshot
- Exception
- AuditEvent

The slice does not require `DATABASE_URL`, Prisma Client generation, or a running PostgreSQL instance. The schema is a reviewed future contract while deterministic adapters keep the demonstration runnable.

## 15. Test Strategy

### 15.1 Unit tests

Tests cover:

- Scheme input schema
- Date interval validation
- Scheme overlap at inclusive boundaries
- Programme mapping overlap
- Exactly-one-match resolution
- Programme launch-date boundary
- Scheme effective-date boundaries
- Product inclusion
- Override precedence
- Percentage calculation
- Base-value calculation
- Flat-amount calculation
- Integer-paise rounding
- Filing-deadline boundary
- Duplicate IMEI
- Duplicate lease
- Duplicate invoice-upload key
- Prior claim detection
- Cancelled, returned, and reversed lease states
- Missing and ambiguous mapping outcomes
- Historical snapshot preservation
- Re-evaluation version linking
- Maker-checker segregation
- Approved-version immutability
- Typed issue codes and recovery actions

Every new domain behaviour follows red-green-refactor.

### 15.2 Browser tests

Playwright covers:

- Platform and Subvention navigation
- Role-aware home content
- Scheme draft creation
- Scheme submission
- Approval by a different user
- Self-approval prevention
- Approved-version read-only state
- Programme mapping conflict
- Purchase-repository search and filters
- Adaptive split record selection
- Eligibility rule trace
- Re-evaluation comparison
- KPI-to-filtered-record drill-down
- Keyboard navigation through primary workflow

### 15.3 Quality gates

Completion requires fresh successful runs of:

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## 16. Setup Changes

The implementation will:

- Replace deprecated `next lint` with ESLint CLI.
- Add a non-interactive ESLint configuration.
- Fix the ambiguous Command Centre Playwright locator.
- Add Tailwind.
- Add selected shadcn/Radix primitives.
- Add GSAP.
- Preserve Next.js App Router and TypeScript strict mode.
- Keep dependency additions limited to capabilities used by this slice.

## 17. Acceptance Criteria

The slice is accepted when:

1. Smart EPP presents one scalable platform shell with the approved experience direction.
2. Role-aware home signals drill into filtered source records.
3. Scheme versions are effective-dated, approved through maker-checker, and immutable after approval.
4. Programme mappings resolve unambiguously and preserve approved overrides.
5. Duplicate IMEI, lease, invoice upload, and prior claim conditions cannot become eligible.
6. Purchase transaction imports quarantine invalid rows without losing valid rows.
7. Eligibility calculates expected subvention from the approved basis and preserves integer-paise accuracy.
8. Every decision displays an ordered, understandable rule trace.
9. Re-evaluation appends a decision version without overwriting history.
10. Historical decisions retain the exact scheme and programme rule snapshot used.
11. No OEM-specific branch is hardcoded.
12. Every material action creates an audit event.
13. UI supports keyboard operation, visible focus, semantic status, and reduced motion.
14. Onboarding and Foreclosure prototypes are not visually copied.
15. Lint, type-check, unit tests, E2E tests, and production build pass.

## 18. Future Extension Path

The next Subvention slice will consume eligible decisions to implement:

```text
Claim Preparation
→ Maker Review
→ Checker Approval
→ Approved Batch Lock
→ OEM Submission
```

Later slices add OEM response, rejection and representation, approved-value invoicing, collection allocation, accounting events, reconciliation, and controlled closure.

Graphify becomes useful after all three modules and shared services create a materially larger code and document graph. Codex-mem remains deferred until its privacy, operational, and licence implications are explicitly accepted.
