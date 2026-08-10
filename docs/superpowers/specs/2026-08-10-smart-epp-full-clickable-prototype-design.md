# SMART EPP Full Clickable Prototype Design

**Date:** 10 August 2026  
**Status:** Approved design baseline pending written-spec review  
**Product:** SMART EPP Platform  
**Architecture:** Configurable Asset Finance Core  
**Reference implementation:** Connect SMART EPP

## 1. Objective

Build a responsive, clickable SMART EPP prototype for Connect's internal operations team and senior management. The prototype demonstrates the full employer-to-closure EPP journey with realistic synthetic data, configurable controls, traceable decisions, and connected operational workspaces.

The existing onboarding, subvention, and foreclosure standalone applications are workflow references only. Their visual implementation is not copied. The existing SMART EPP design system is applied uniformly across every module.

## 2. Prototype Boundaries

The prototype includes a coherent application shell, all agreed modules, representative end-to-end interactions, mock integrations, configurable BRE and workflow demonstrations, IAM control states, management drill-downs, and synthetic portfolio data.

It does not claim production readiness. It excludes live integrations, real credentials, real customer or employee data, production accounting, production AI decisioning, and complete regulatory validation. AI assistance remains future scope and is not part of the operating prototype.

## 3. Users and Access Model

All authenticated employees can navigate to every module and view records in read-only mode by default. Access is not restricted by departmental navigation.

IAM controls:

- create, edit, submit, approve, reject, return, reopen, override, export, configure, and delete actions;
- employer and record scopes;
- sensitive-field visibility and masking;
- multiple concurrent role assignments;
- temporary access and delegation;
- administrator, management, and auditor capabilities.

Admin and Management have superseding authority. They may bypass segregation of duties only through an explicit break-glass action requiring a reason, enhanced audit entry, and immediate notification. Routine self-approval is prohibited.

## 4. Product Structure

The product uses one capability-based application shell. A collapsible left sidebar exposes all modules. The top command bar provides global search, guided-demo entry, work queue, alerts, integration health, and user/access context. Quick record inspection uses a contextual right drawer; complex workflows use full pages.

### 4.1 Command Centre

Executive Overview; Operations Overview; Portfolio Health; Exposure and Utilisation; Financial Snapshot; SLA and Ageing; Exceptions and Control Alerts; Integration Health; Guided Demo Journey.

### 4.2 Workbench

My Tasks; My Approvals; My Exceptions; Team Queues; Unassigned Work; Notifications; Escalations; Delegations; Recently Viewed.

### 4.3 Employer Programmes

Leads and Prospects; Requirement Capture; Commercial Structuring; Proposal and Closure; Credit Handoff; Legal and MLA Coordination; Programme Readiness; Governance Setup; Platform Onboarding; BRE Alignment; HRMS Integration; UAT and Go-Live; Programme Performance; Programme Amendments and Closure.

### 4.4 Employees

Employee Master; Employee Enrolment; Bulk Imports; Programme Mapping; Employment and Payroll Status; Eligibility Profile; Employee Documents and Consent; Asset and Lease History; Employment Changes; Separation Feed.

### 4.5 Applications & Eligibility

New Applications; Application Register; Evidence Capture; Eligibility Assessment; Credit Assessment; Exposure Reservation; BRE Results; Manual Review; Approval Routing; Rejections and Returns; Decision History; Reservation, Utilisation and Release.

### 4.6 Assets, Vendors & OEMs

OEM Master; National Distributor Master; Reseller Master; Vendor Master; Product Catalogue; Device and Asset Registry; Serial/IMEI Identification; Scheme Catalogue; Product Pricing; Location and GST Mapping; Vendor Performance; Asset Status and Ownership History.

### 4.7 Orders & Approvals

Quotations; Order Requests; Order Register; Purchase Orders; Vendor Invoices; E-way Bill Evidence; Approval Queues; Fulfilment and Delivery; Employee Acceptance; Cancellations and Returns; Lease-Execution Handoff; Handoff Acknowledgements.

### 4.8 Leases, Lots & Portfolio

Lease Register; Lot Register; Lease Activation; Asset Assignment; Rental Schedules; Residual Value; Sanction and Exposure Utilisation; Portfolio Movements; Lease Amendments; Lease Milestones; External Platform Synchronisation; Portfolio Reconciliation.

### 4.9 Billing & Collections

Billing Schedules; Invoice Register; Tax, GST and IRN; Receivables; Collection Work Queue; Receipt Capture; Receipt Allocation; Credit and Debit Notes; Ageing and Follow-up; Bank Reconciliation; Accounting Events; Tally Handoff and Status.

### 4.10 Subvention

Control Desk; Scheme Versions; Employer Programme Mappings; Purchase Repository; Import and Quarantine; Purchase Evidence; Eligibility Operations; Claim Preparation; Claim Batching; Maker-Checker Review; OEM Submission; OEM Response; Claim Reconciliation; Rejections; Representation; Subvention Invoicing; Receipts and Allocation; Accounting and Closure; Subvention MIS.

### 4.11 Foreclosure

Foreclosure Intake; Bulk Intake; Master File Flagging; Billing Treatment; Foreclosure Computation; Maker Submission; Checker Validation; Tax Sign-off; Invoice Dispatch; Payment Confirmation; Settlement Letter; Case Closure; Foreclosure Tracker; Foreclosure MIS.

### 4.12 Documents & Evidence

Central Repository; Document Checklists; Document Types; Evidence Links; Version History; Missing Documents; Expiry Monitoring; Verification Queue; Templates; Correspondence Archive; Access and Download History.

### 4.13 Exceptions & Reconciliations

Exception Inbox; Data-Quality Exceptions; Import Quarantine; Duplicate Conflicts; Rule Failures; SLA Breaches; Reconciliation Breaks; Approval Deviations; Manual Overrides; Remediation Tracker; Root-Cause Analysis; Exception Closure.

### 4.14 Reports & MIS

Management Dashboard; Operational MIS; Employer Programme MIS; Employee and Application MIS; Portfolio and Lease MIS; Exposure and Sanction MIS; Billing and Collection MIS; Subvention MIS; Foreclosure MIS; Exception and SLA MIS; Audit and Control MIS; Scheduled Reports; Export Centre.

### 4.15 Admin

- **IAM:** users, role bundles, permission sets, multi-role assignments, action permissions, data scopes, field masking, temporary access, delegation, maker-checker administration, break-glass access, and access reviews.
- **Masters:** catalogue, source-system records, SMART-local overrides, version history, effective dating, approval workflow, data quality, and synchronisation.
- **BRE Engine:** decision tables, condition and formula builders, advanced expressions, rule sets, simulation, test cases, versioning, publishing, rollback, and execution traces.
- **Workflow Configuration:** definitions, stages, transitions, status lifecycles, approval matrices, maker-checker rules, SLAs, escalations, notifications, reopening rules, and closure conditions.
- **Integrations:** Master Hub, existing leasing platform, Tally, employer HRMS, GST/e-invoicing, banking, OEM/vendor, API/webhook registry, interface monitoring, retry, and reprocessing.
- **Audit & System Logs:** business, access, IAM, rule, workflow, master override, break-glass, integration, export, and download logs.
- **Platform Settings:** organisation, entity and transaction roles, numbering, business calendar, currencies, tax defaults, notification channels, module registry, and feature controls.

## 5. Guided Demo Journey

The guided journey follows one synthetic case through employer setup, employee enrolment, eligibility and credit, exposure reservation, asset selection, order approval, lease handoff, activation, servicing, and foreclosure or normal closure. The journey opens the real module screens with contextual narration rather than using a separate presentation-only interface.

Subvention runs as a connected financial journey from purchase evidence through eligibility, claim batching, approvals, OEM response, reconciliation, invoicing, collection, accounting, and closure.

Operations users can leave the guided path at any time and explore every module freely.

## 6. Mock Data

The prototype uses deterministic synthetic data representing multiple employers, programme configurations, employees, assets, vendors, OEMs, applications, leases, lots, invoices, receipts, subvention claims, foreclosure cases, tasks, exceptions, and audit events.

The data set must include successful, pending, rejected, returned, overdue, duplicated, mismatched, and reconciled scenarios. Financial values use Indian formatting and internally consistent relationships. No production or confidential data is used.

## 7. Masters, BRE, and Workflow Controls

Master data received from external systems is read-only. An authorised change creates a versioned, effective-dated SMART-local override containing source, reason, actor, approval, and history. The Lighthouse does not write master changes back upstream.

BRE authoring is available only under Admin. Business modules show the outcome, reason, rule version, evidence, override, and audit link. Publishing and rollback require maker-checker approval.

Workflow Configuration is separate from BRE. It controls stages, transitions, approvals, SLAs, escalations, and closure conditions without code changes.

## 8. Integration Demonstrator

Integrations are intentionally shallow and synthetic. Each adapter shows mock health, last sync, accepted/rejected/pending counts, sample payloads, failure simulation, retry, reconciliation, and audit history.

No live authentication, credentials, APIs, webhooks, message queues, or production connector engineering are included in the prototype.

## 9. Portable Technical Architecture

Vercel is the first deployment profile and Supabase-managed PostgreSQL is the first database profile. Neither is embedded into domain or UI logic.

- Next.js App Router provides the web application.
- Domain and application packages contain provider-independent business logic.
- Repository interfaces separate modules from persistence.
- An in-memory repository supports deterministic demos and tests.
- A Prisma/PostgreSQL adapter supports Supabase and other PostgreSQL providers.
- Version-controlled Prisma migrations are the canonical schema history.
- Runtime and migration connections use separate environment variables.
- Vercel configuration remains at the deployment boundary.
- Next.js standalone output provides a Docker/self-hosting escape path.
- Authentication, file storage, notifications, and integrations use adapter interfaces.
- Business modules do not import Supabase or Vercel SDKs directly.

Schema expansion, Prisma runtime dependencies, Supabase project creation, Vercel project creation, credentials, and deployment each require their own approval gate.

## 10. Interaction and Error Model

Every material command produces visible success or failure feedback and an audit event. Disabled actions state the missing permission. Validation errors stay beside their fields. Conflicts, stale versions, duplicate records, missing evidence, rule failures, integration failures, and permission failures use distinct recoverable states.

Approved records are immutable. Reopening requires elevated permission and a reason. Financial closures require billing, collection, accounting, and reconciliation completion.

## 11. Design Direction

The uniform design language is Enterprise Structured with Data-Dense Operational influence:

- light theme only;
- neutral canvas with restrained blue and teal accents;
- semantic colours reserved for status and risk;
- compact tables, filters, work queues, and drill-downs;
- clear tabular financial numerals;
- 4–12 px radius hierarchy and visible hairlines;
- responsive priority rather than indiscriminate stacking;
- restrained purposeful motion and reduced-motion support;
- WCAG-conscious contrast, keyboard access, visible focus, and colour-independent meaning;
- no gradients, glassmorphism, oversized cards, decorative charts, or generic AI styling.

## 12. Verification Strategy

- Unit tests for domain rules, IAM decisions, workflow transitions, BRE evaluation, money/date handling, and repository contracts.
- Component tests for navigation, read-only defaults, permission states, drawers, tables, forms, and failure states.
- End-to-end tests for the guided journey, employer onboarding, application approval, lease handoff, subvention, foreclosure, break-glass access, and integration simulation.
- Visual and responsive review of representative desktop, tablet, and mobile layouts.
- Final lint, type-check, unit test, end-to-end test, and production build gates.

## 13. Delivery Approach

Implementation proceeds in bounded vertical slices: platform shell and mock domain; Command Centre and Workbench; employer and employee journey; application/order/lease journey; billing; subvention preservation and integration; foreclosure; controls and reporting; Admin; persistence adapter; deployment demonstration; verification and polish.

The first build milestone is a cohesive full-platform clickable shell with connected mock data and one guided case. Depth is then added to control-critical workflows without sacrificing extension boundaries.
