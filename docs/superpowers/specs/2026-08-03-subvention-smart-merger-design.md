# Subvention Smart Merger Design

Date: 3 August 2026  
Status: Approved in conversation; pending written-spec confirmation  
Product: Smart EPP Subvention Control Centre  
Module: Subvention Management  

## 1. Objective

Build Subvention as a standalone product by merging the strongest behavior from
`Connect_Smart_EPP_Subvention_OS_Final_v5.html` with the repository's controlled
Subvention vertical slice.

The standalone Subvention product will serve three audiences through one shared domain
and repository:

- Management monitors financial position, stage movement, ageing, and counterparty dues.
- Operations processes documents, resolves exceptions, prepares claims, and tracks progress.
- Master Data Administrators maintain reference data through controlled CRUD workflows.

The supplied HTML remains a functional reference. Production code will not copy its
global mutable state, repeated function overrides, client-side role controls, or coupled
rendering and business rules.

This delivery will not integrate Onboarding, Foreclosure, Command Centre, or other Smart
EPP modules. Subvention will use a self-contained shell and navigation that can join the
wider platform later without changing its domain contracts.

## 2. Product Structure

### Management Overview

Management receives a summary above the Operations workbench:

- Subvention received
- Payment due
- Claim value in progress
- Overdue amount
- Claim count and value by phase
- Payment due by national distributor or vendor
- Employer, counterparty, phase, FY, quarter, and month breakups
- Drill-down from every metric to the records included in that metric

Filters use Indian financial years. Quarter and month choices must remain coherent with
the selected financial year.

### Operations Workbench

Operations follows four steps:

1. Upload Documents
2. Review Transactions
3. Prepare Claims
4. Track Claims

The system runs deterministic validations after ingestion. Operations handles only
exceptions, judgement points, and claim preparation.

Each transaction must preserve this evidence chain:

```text
Approved Purchase Order
→ Recognised Vendor Invoice
→ Invoice Line and Device Identifier
→ Employer Programme
→ Effective Scheme
→ Settlement Counterparty
→ Eligibility Decision
→ Claim Batch
```

### Master Data Workbench

Authorised administrators receive browser CRUD for:

- OEM
- National Distributor
- Reseller or Vendor
- Product
- Employer
- Employer Programme
- Scheme
- Platform Provider
- Legal Entity and GST Registration
- User and Role assignment

The first implemented slice must support existing platform masters: OEM, distributor,
reseller, product, employer programme mapping, and scheme. Remaining catalogues can use
the same contracts in later slices.

The workbench provides:

- Master catalogue and record counts
- Search, status filter, sort, and pagination
- Create, view, edit, submit, return, approve, deactivate, and version-history actions
- Relation-aware selectors
- Referential-integrity warnings
- Data-model hierarchy under Administration

Approved or effective records cannot be edited in place. An administrator creates a
successor version with a defined effective window. Maker-checker segregation applies to
master approval.

## 3. Role Model

| Role | Management | Operations | Master CRUD | Approval |
|---|---|---|---|---|
| Management Viewer | Full | Read-only | Read-only | None |
| Operations Executive | Limited daily metrics | Full | Read-only | Claim preparation only |
| Business Approver | Full | Approval queues | Read-only | Scheme, mapping, and claim approval |
| Master Data Administrator | Read-only | Read-only | Create and edit drafts | Submit only |
| Auditor | Read-only | Read-only | Read-only with history | None |

Repository commands enforce permissions. Hiding a button does not provide security.

## 4. Architecture

```text
Standalone Subvention shell and role-aware workspaces
                ↓
Application command/query services
                ↓
Subvention domain rules and status models
                ↓
Repository interfaces
                ↓
In-memory adapter now; Prisma/PostgreSQL adapter later
```

### Domain additions

- Canonical master catalogue metadata
- Typed CRUD command results
- Effective-dated master version contracts
- Referential-integrity checks
- Management metric definitions and filter periods
- Claim preparation and lifecycle read models
- PO, document, invoice-line, and evidence-link contracts

### UI additions

- Standalone Subvention application shell and landing page
- Management metric strip with drill-down drawer
- Operations work queue
- Master Data workbench
- Master record form and history inspector
- Data-model hierarchy page
- Route-wise claim preparation cards
- Timeline-led claim tracking

Components will use current design tokens, Deep Plum provenance accents, restrained
motion, 12 px minimum operational text, and keyboard-accessible controls.

## 5. Data Flow

### Master maintenance

```text
Create draft
→ Validate fields and relationships
→ Submit
→ Independent approval or return
→ Approved effective version
→ Immutable historical reference
```

Every command writes an audit event with actor, role, timestamp, reason, source,
prior state, and new state.

### Transaction processing

```text
Document or LMS import
→ PO and invoice linkage
→ Device identifier validation
→ Programme and scheme resolution
→ Eligibility decision snapshot
→ Ready for Claim or exception queue
```

### Claim lifecycle

```text
Ready for Claim
→ Draft batch by settlement route
→ Maker submission
→ Checker approval and lock
→ Counterparty submission
→ Response
→ Invoice
→ Collection
→ Accounting reconciliation
→ Closure
```

## 6. Error and Exception Handling

- Validation errors appear beside fields and in a compact form summary.
- Repository commands return discriminated success or failure results.
- Failed commands keep forms and dialogs open with user input intact.
- Unknown or conflicting relationships enter an exception queue.
- Delete becomes unavailable when a record has dependants; deactivate or version replaces it.
- Management totals exclude previews and unevaluated transactions.
- Every metric exposes its definition, period, amount basis, and underlying records.

## 7. Delivery Sequence

1. Stabilise and commit current Subvention control fixes.
2. Add shared master CRUD domain and repository contracts.
3. Build Master Data workbench and data-model hierarchy.
4. Build Management Overview and exact drill-down read models.
5. Build simplified Operations workbench over existing transactions and eligibility.
6. Add claim preparation and lifecycle tracking.
7. Add document-intelligence evidence contracts and seeded provider data.
8. Run full system verification.

Tasks 3 and 4 may proceed in parallel after Task 2 establishes shared interfaces.
Tasks 5 and 6 remain sequential because claim preparation depends on transaction state.

## 8. Testing

### Unit tests

- CRUD validation and unique codes
- Referential-integrity protection
- Returned-record editing
- Effective-date overlap and successor rules
- Maker-checker segregation
- Metric definitions and period filters
- Exact drill-down population
- Claim grouping by configured settlement route

### Browser tests

- Management filter and drill-down journey
- Operations upload-to-exception-to-claim journey
- Admin create, edit, submit, return, and approve journey
- Read-only role restrictions
- Keyboard operation and route-focus behavior
- Laptop and narrow-viewport layout

### Completion gates

- Lint
- Strict type-check
- Full unit suite
- Full Playwright suite
- Production build
- Prisma schema validation
- Browser inspection of Management, Operations, and Administration views

## 9. Non-goals for this slice

- Live OCR or PDF extraction
- Live LMS, accounting, GST, bank, or email integration
- Production authentication
- Physical deletion of approved or referenced records
- Full Onboarding or Foreclosure implementation

Adapters and interfaces must leave these integrations open without exposing them in the
daily Operations flow.

## 10. Acceptance Criteria

- One standalone Subvention product exposes role-appropriate Management, Operations, and Admin views.
- All three views use one repository and one status vocabulary.
- Management metrics drill into exactly the records counted.
- Operations can follow the normal path without seeing rule IDs or template internals.
- Administrators can maintain supported masters without editing code.
- Approved masters remain immutable and historically reproducible.
- Transactions retain PO, invoice, device, programme, and scheme evidence references.
- Every material mutation creates an audit event.
- Existing documented business controls and current green tests remain intact.
- No page depends on Onboarding, Foreclosure, or other platform modules.
