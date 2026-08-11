# SMART EPP Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first working milestone of the full SMART EPP clickable prototype: one uniform platform shell, all approved modules and submodules, connected synthetic data, universal read-only IAM, a guided EPP journey, and a lightweight integration simulator.

**Architecture:** Extend the existing Next.js monorepo without rewriting the working Subvention slice. Add provider-independent platform contracts to `@smart-epp/domain`, a deterministic in-memory repository for the prototype, and a React provider at the application boundary. Use a registry-driven shell and dynamic workspace route so new capabilities can be added without restructuring navigation. Keep persistence behind repository interfaces; Prisma/PostgreSQL, Supabase, and Vercel work remains a later approved milestone.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.7, Zod 3.24, existing shadcn/Radix primitives, Lucide React, Vitest 2.1, Playwright 1.49, CSS design tokens.

**Design authority:** `docs/superpowers/specs/2026-08-10-smart-epp-full-clickable-prototype-design.md` and `design-system/smart-epp-operating-platform/MASTER.md`.

## Global Constraints

- Product name is `SMART EPP Platform`; architecture is `Configurable Asset Finance Core`; reference implementation is `Connect SMART EPP`.
- Apply `design-system/smart-epp-operating-platform/MASTER.md` uniformly; do not copy the standalone onboarding, foreclosure, or subvention HTML styling.
- Use a light theme, neutral canvas, deep navy structure, restrained blue/teal actions, semantic statuses, compact tables, and tabular financial numerals.
- Do not introduce gradients, glassmorphism, oversized cards, decorative charts, fake metrics, perpetual motion, dark mode, or generic AI styling.
- Every authenticated employee can navigate to every module and read records by default; IAM controls mutations, scopes, sensitive fields, exports, and configuration.
- Admin and Management use audited break-glass for self-approval; routine maker self-approval is prohibited.
- Master Hub records remain read-only; authorised changes create versioned SMART-local overrides with no upstream write-back.
- BRE Engine and Workflow Configuration are separate Admin submodules.
- Integrations remain synthetic and shallow: no credentials, live APIs, webhooks, queues, or production connectors.
- No new dependency, database schema, Supabase project, Vercel project, credential, RBAC expansion, or deployment without a separate approval gate.
- Preserve existing Subvention domain rules, routes, and tests.
- AI assistance remains future scope and is absent from this milestone.
- Validate responsive behavior at 375px, 768px, 1024px, and 1440px.

---

## File Structure

### Domain package

- `packages/domain/src/platform/module-registry.ts`: canonical module/submodule registry and route resolution.
- `packages/domain/src/platform/iam.ts`: read-default permissions, explicit action grants, masking, and break-glass decisions.
- `packages/domain/src/platform/types.ts`: shared employers, employees, applications, assets, leases, work items, journey, and integration demo types.
- `packages/domain/src/platform/repositories.ts`: provider-neutral `PlatformRepository` contract.
- `packages/domain/src/index.ts`: exports the platform contracts.

### Web application

- `apps/web/features/platform/data/seed.ts`: deterministic connected mock data.
- `apps/web/features/platform/data/InMemoryPlatformRepository.ts`: repository implementation for demo and tests.
- `apps/web/features/platform/store/PlatformProvider.tsx`: UI state, actor/access context, guided journey, and integration simulation.
- `apps/web/components/shell/CapabilitySidebar.tsx`: full capability navigation.
- `apps/web/components/shell/ModuleNavigation.tsx`: registry-driven submodule navigation.
- `apps/web/components/shell/CommandBar.tsx`: global search and platform controls.
- `apps/web/components/shell/PlatformShell.tsx`: uniform shell composition.
- `apps/web/features/platform/command-centre/CommandCentre.tsx`: universal operations and executive views.
- `apps/web/features/platform/workbench/Workbench.tsx`: tasks, approvals, exceptions, queues, and notifications.
- `apps/web/features/platform/workspaces/ModuleWorkspace.tsx`: reusable module/submodule workspace.
- `apps/web/features/platform/guided-demo/GuidedDemoDrawer.tsx`: guided full-journey control.
- `apps/web/features/platform/admin/IntegrationSimulator.tsx`: lightweight synthetic adapter states.
- `apps/web/app/[module]/[[...submodule]]/page.tsx`: registry-backed route for approved modules.
- `apps/web/app/page.tsx`: Command Centre entry.
- `apps/web/app/globals.css`: shell, workspace, guided demo, responsive, and state styles.

### Tests

- `tests/unit/platform/module-registry.test.ts`
- `tests/unit/platform/iam.test.ts`
- `tests/unit/platform/seed.test.ts`
- `tests/unit/platform/repository.test.ts`
- `tests/e2e/platform-navigation.spec.ts`
- `tests/e2e/guided-demo.spec.ts`
- `tests/e2e/admin-integrations.spec.ts`

---

### Task 1: Define the canonical capability registry

**Files:**
- Create: `packages/domain/src/platform/module-registry.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `tests/unit/platform/module-registry.test.ts`

**Interfaces:**
- Produces: `PlatformModuleKey`, `PlatformModuleDefinition`, `PlatformSubmoduleDefinition`, `PLATFORM_MODULES`, `moduleBySlug(slug)`, and `submoduleByPath(moduleSlug, segments)`.
- Consumes: no new project interfaces.

- [ ] **Step 1: Write the failing registry test**

```ts
import { describe, expect, it } from "vitest";
import {
  PLATFORM_MODULES,
  moduleBySlug,
  submoduleByPath,
} from "@smart-epp/domain";

describe("platform module registry", () => {
  it("exposes the approved fifteen capabilities with unique paths", () => {
    expect(PLATFORM_MODULES).toHaveLength(15);
    expect(new Set(PLATFORM_MODULES.map((item) => item.slug)).size).toBe(15);
    expect(PLATFORM_MODULES.map((item) => item.label)).toContain("Foreclosure");
    expect(PLATFORM_MODULES.map((item) => item.label)).not.toContain(
      "Foreclosure & Closure",
    );
  });

  it("resolves admin configuration and integration routes", () => {
    expect(moduleBySlug("admin")?.label).toBe("Admin");
    expect(submoduleByPath("admin", ["bre-engine"])?.label).toBe("BRE Engine");
    expect(submoduleByPath("admin", ["integrations"])?.demoOnly).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node node_modules/vitest/vitest.mjs run tests/unit/platform/module-registry.test.ts --no-cache`

Expected: FAIL because `PLATFORM_MODULES` is not exported.

- [ ] **Step 3: Implement the registry types and exact module inventory**

```ts
export type PlatformModuleKey =
  | "COMMAND_CENTRE"
  | "WORKBENCH"
  | "EMPLOYER_PROGRAMMES"
  | "EMPLOYEES"
  | "APPLICATIONS_ELIGIBILITY"
  | "ASSETS_PARTNERS"
  | "ORDERS_APPROVALS"
  | "LEASES_PORTFOLIO"
  | "BILLING_COLLECTIONS"
  | "SUBVENTION"
  | "FORECLOSURE"
  | "DOCUMENTS_EVIDENCE"
  | "EXCEPTIONS_RECONCILIATIONS"
  | "REPORTS_MIS"
  | "ADMIN";

export interface PlatformSubmoduleDefinition {
  key: string;
  label: string;
  slug: string;
  description: string;
  demoOnly?: boolean;
}

export interface PlatformModuleDefinition {
  key: PlatformModuleKey;
  label: string;
  slug: string;
  description: string;
  icon: string;
  submodules: readonly PlatformSubmoduleDefinition[];
}
```

Create `PLATFORM_MODULES` with these exact slug sets:

```ts
const approvedPaths = {
  "command-centre": ["executive-overview", "operations-overview", "portfolio-health", "exposure-utilisation", "financial-snapshot", "sla-ageing", "control-alerts", "integration-health", "guided-demo"],
  workbench: ["my-tasks", "my-approvals", "my-exceptions", "team-queues", "unassigned-work", "notifications", "escalations", "delegations", "recently-viewed"],
  programmes: ["leads", "requirements", "commercials", "proposal-closure", "credit-handoff", "legal-mla", "readiness", "governance", "platform-onboarding", "bre-alignment", "hrms-integration", "uat-go-live", "performance", "amendments-closure"],
  employees: ["master", "enrolment", "bulk-imports", "programme-mapping", "employment-payroll", "eligibility-profile", "documents-consent", "asset-lease-history", "employment-changes", "separation-feed"],
  applications: ["new", "register", "evidence", "eligibility", "credit", "exposure-reservation", "bre-results", "manual-review", "approval-routing", "rejections-returns", "decision-history", "exposure-lifecycle"],
  assets: ["oems", "national-distributors", "resellers", "vendors", "product-catalogue", "asset-registry", "device-identifiers", "scheme-catalogue", "pricing", "gst-location-mapping", "vendor-performance", "ownership-history"],
  orders: ["quotations", "requests", "register", "purchase-orders", "vendor-invoices", "eway-bills", "approval-queues", "fulfilment-delivery", "employee-acceptance", "cancellations-returns", "lease-handoff", "handoff-acknowledgements"],
  portfolio: ["leases", "lots", "activation", "asset-assignment", "rental-schedules", "residual-value", "sanction-utilisation", "portfolio-movements", "amendments", "milestones", "external-sync", "reconciliation"],
  billing: ["schedules", "invoices", "tax-gst-irn", "receivables", "collection-queue", "receipts", "allocation", "credit-debit-notes", "ageing-follow-up", "bank-reconciliation", "accounting-events", "tally-handoff"],
  subvention: ["control-desk", "schemes", "programme-mappings", "purchase-repository", "import-quarantine", "purchase-evidence", "eligibility", "claim-preparation", "claim-batching", "maker-checker", "oem-submission", "oem-response", "claim-reconciliation", "rejections", "representation", "invoicing", "receipts-allocation", "accounting-closure", "mis"],
  foreclosure: ["intake", "bulk-intake", "master-file-flagging", "billing-treatment", "computation", "maker-submission", "checker-validation", "tax-signoff", "invoice-dispatch", "payment-confirmation", "settlement-letter", "case-closure", "tracker", "mis"],
  documents: ["repository", "checklists", "types", "evidence-links", "version-history", "missing-documents", "expiry-monitoring", "verification-queue", "templates", "correspondence", "access-history"],
  exceptions: ["inbox", "data-quality", "import-quarantine", "duplicate-conflicts", "rule-failures", "sla-breaches", "reconciliation-breaks", "approval-deviations", "manual-overrides", "remediation", "root-cause", "closure"],
  reports: ["management", "operations", "programmes", "employees-applications", "portfolio-leases", "exposure-sanction", "billing-collections", "subvention", "foreclosure", "exceptions-sla", "audit-controls", "scheduled", "exports"],
  admin: ["iam", "masters", "bre-engine", "workflow-configuration", "integrations", "audit-logs", "platform-settings"],
} as const;
```

Populate human-readable descriptions and icon keys for every module and submodule. Mark only `admin/integrations` as `demoOnly: true`.

- [ ] **Step 4: Export and verify the registry**

Add `export * from "./platform/module-registry";` to `packages/domain/src/index.ts`.

Run: `node node_modules/vitest/vitest.mjs run tests/unit/platform/module-registry.test.ts --no-cache`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/platform/module-registry.ts packages/domain/src/index.ts tests/unit/platform/module-registry.test.ts
git commit -m "feat(platform): define capability registry"
```

### Task 2: Implement default-read IAM and break-glass decisions

**Files:**
- Create: `packages/domain/src/platform/iam.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `tests/unit/platform/iam.test.ts`

**Interfaces:**
- Produces: `PlatformAction`, `AccessProfile`, `AccessDecision`, `evaluateAccess(input)`, and `assertApprovalSeparation(input)`.
- Consumes: `PlatformModuleKey` from Task 1.

- [ ] **Step 1: Write failing IAM tests**

```ts
import { describe, expect, it } from "vitest";
import { evaluateAccess } from "@smart-epp/domain";

const baseProfile = {
  userId: "user-ops-01",
  roleKeys: ["OPERATIONS"],
  grants: [],
  dataScopes: ["ALL_EMPLOYERS"],
  maskedFields: ["employee.pan", "employee.bankAccount"],
  isAdmin: false,
  isManagement: false,
};

describe("platform IAM", () => {
  it("allows module reads but denies mutation without an explicit grant", () => {
    expect(evaluateAccess({ profile: baseProfile, module: "EMPLOYEES", action: "READ" }).allowed).toBe(true);
    expect(evaluateAccess({ profile: baseProfile, module: "EMPLOYEES", action: "EDIT" }).allowed).toBe(false);
  });

  it("requires break-glass when management approves its own action", () => {
    const decision = evaluateAccess({
      profile: { ...baseProfile, isManagement: true },
      module: "APPLICATIONS_ELIGIBILITY",
      action: "APPROVE",
      initiatedBy: "user-ops-01",
    });
    expect(decision.allowed).toBe(false);
    expect(decision.requiresBreakGlass).toBe(true);
  });
});
```

- [ ] **Step 2: Run and verify the tests fail**

Run: `node node_modules/vitest/vitest.mjs run tests/unit/platform/iam.test.ts --no-cache`

Expected: FAIL because the IAM contract does not exist.

- [ ] **Step 3: Implement the policy**

```ts
export type PlatformAction =
  | "READ"
  | "CREATE"
  | "EDIT"
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "RETURN"
  | "REOPEN"
  | "OVERRIDE"
  | "EXPORT"
  | "CONFIGURE"
  | "DELETE";

export interface AccessProfile {
  userId: string;
  roleKeys: string[];
  grants: Array<{ module: PlatformModuleKey | "ALL"; actions: PlatformAction[] }>;
  dataScopes: string[];
  maskedFields: string[];
  isAdmin: boolean;
  isManagement: boolean;
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  requiresBreakGlass: boolean;
  maskedFields: string[];
}
```

`evaluateAccess` must allow `READ`, deny ungranted mutations, allow matching grants, and return `requiresBreakGlass: true` when Admin or Management attempts `APPROVE` on a record with the same `initiatedBy`. A break-glass approval is allowed only when `breakGlassReason.trim().length >= 20`.

- [ ] **Step 4: Export and verify**

Add `export * from "./platform/iam";` to `packages/domain/src/index.ts`.

Run: `node node_modules/vitest/vitest.mjs run tests/unit/platform/iam.test.ts --no-cache`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/platform/iam.ts packages/domain/src/index.ts tests/unit/platform/iam.test.ts
git commit -m "feat(platform): enforce default-read IAM"
```

### Task 3: Define the connected platform model and deterministic seed

**Files:**
- Create: `packages/domain/src/platform/types.ts`
- Create: `packages/domain/src/platform/repositories.ts`
- Create: `apps/web/features/platform/data/seed.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `tests/unit/platform/seed.test.ts`

**Interfaces:**
- Produces: `PlatformSnapshot`, `EmployerRecord`, `EmployeeRecord`, `ApplicationRecord`, `AssetRecord`, `LeaseRecord`, `WorkItem`, `GuidedJourney`, `IntegrationAdapterDemo`, `PlatformRepository`, and `createPlatformDemoSeed()`.
- Consumes: `AccessProfile` and `PlatformModuleKey` from Tasks 1–2.

- [ ] **Step 1: Write the failing referential-integrity test**

```ts
import { describe, expect, it } from "vitest";
import { createPlatformDemoSeed } from "@/features/platform/data/seed";

describe("platform demo seed", () => {
  it("builds one deterministic connected employer-to-lease journey", () => {
    const seed = createPlatformDemoSeed();
    const journey = seed.guidedJourneys[0]!;
    const employee = seed.employees.find((item) => item.id === journey.employeeId);
    const application = seed.applications.find((item) => item.id === journey.applicationId);
    const lease = seed.leases.find((item) => item.id === journey.leaseId);

    expect(employee?.employerId).toBe(journey.employerId);
    expect(application?.employeeId).toBe(employee?.id);
    expect(lease?.applicationId).toBe(application?.id);
    expect(seed.generatedAt).toBe("2026-08-10T09:00:00.000Z");
  });

  it("contains healthy, pending, overdue, rejected, and reconciled conditions", () => {
    const states = new Set(createPlatformDemoSeed().workItems.map((item) => item.state));
    expect(states).toEqual(new Set(["HEALTHY", "PENDING", "OVERDUE", "REJECTED", "RECONCILED"]));
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node node_modules/vitest/vitest.mjs run tests/unit/platform/seed.test.ts --no-cache`

Expected: FAIL because the seed module is missing.

- [ ] **Step 3: Implement focused platform types**

```ts
export type OperatingState =
  | "HEALTHY"
  | "PENDING"
  | "OVERDUE"
  | "REJECTED"
  | "RECONCILED";

export interface EmployerRecord { id: string; name: string; programmeId: string; sanctionPaise: number; utilisedPaise: number; status: OperatingState; }
export interface EmployeeRecord { id: string; employerId: string; name: string; payrollId: string; status: OperatingState; }
export interface ApplicationRecord { id: string; employeeId: string; assetId: string; requestedPaise: number; reservedPaise: number; status: OperatingState; }
export interface AssetRecord { id: string; oem: string; model: string; category: string; serialNumber: string; invoiceValuePaise: number; }
export interface LeaseRecord { id: string; applicationId: string; lotId: string; tenureMonths: number; rentalPaise: number; residualValuePaise: number; status: OperatingState; }
export interface WorkItem { id: string; module: PlatformModuleKey; title: string; owner: string; dueDate: string; state: OperatingState; financialImpactPaise: number; href: string; }
export interface GuidedJourney { id: string; employerId: string; employeeId: string; applicationId: string; leaseId: string; steps: Array<{ id: string; label: string; href: string; status: "COMPLETE" | "CURRENT" | "UPCOMING" }>; }
export interface IntegrationAdapterDemo { id: string; name: string; mode: "MOCK"; status: "HEALTHY" | "PARTIAL" | "FAILED"; lastSyncAt: string; accepted: number; rejected: number; pending: number; }
export interface PlatformAuditEvent { id: string; entityType: string; entityId: string; action: string; actorId: string; reason: string; occurredAt: string; }
export interface PlatformSnapshot {
  generatedAt: string;
  profiles: AccessProfile[];
  employers: EmployerRecord[];
  employees: EmployeeRecord[];
  applications: ApplicationRecord[];
  assets: AssetRecord[];
  leases: LeaseRecord[];
  workItems: WorkItem[];
  guidedJourneys: GuidedJourney[];
  integrations: IntegrationAdapterDemo[];
  auditEvents: PlatformAuditEvent[];
}
```

Create a `PlatformSnapshot` that holds those collections, three employers, twelve employees, eight applications, eight assets, six leases, at least ten mixed-state work items, one guided journey, and seven mock adapters: Master Hub, Existing Leasing Platform, Tally, Employer HRMS, GST/E-invoicing, Bank, and OEM/Vendor.

- [ ] **Step 4: Define the provider-neutral repository port**

```ts
export interface PlatformRepository {
  getSnapshot(): PlatformSnapshot;
  replaceSnapshot(snapshot: PlatformSnapshot): void;
}
```

Export all platform types and the repository contract from `packages/domain/src/index.ts`.

- [ ] **Step 5: Verify and commit**

Run: `node node_modules/vitest/vitest.mjs run tests/unit/platform/seed.test.ts --no-cache`

Expected: PASS.

```bash
git add packages/domain/src/platform packages/domain/src/index.ts apps/web/features/platform/data/seed.ts tests/unit/platform/seed.test.ts
git commit -m "feat(platform): seed connected EPP portfolio"
```

### Task 4: Add the in-memory repository and platform provider

**Files:**
- Create: `apps/web/features/platform/data/InMemoryPlatformRepository.ts`
- Create: `apps/web/features/platform/store/PlatformProvider.tsx`
- Modify: `apps/web/components/shell/PlatformShell.tsx`
- Test: `tests/unit/platform/repository.test.ts`

**Interfaces:**
- Produces: `InMemoryPlatformRepository`, `PlatformProvider`, and `usePlatform()`.
- Consumes: `PlatformRepository`, `PlatformSnapshot`, `AccessProfile`, and `createPlatformDemoSeed()`.

- [ ] **Step 1: Write the failing repository test**

```ts
import { describe, expect, it } from "vitest";
import { InMemoryPlatformRepository } from "@/features/platform/data/InMemoryPlatformRepository";

describe("in-memory platform repository", () => {
  it("returns clones so callers cannot mutate stored state", () => {
    const repository = new InMemoryPlatformRepository();
    const first = repository.getSnapshot();
    first.employers[0]!.name = "Changed outside repository";
    expect(repository.getSnapshot().employers[0]!.name).not.toBe(
      "Changed outside repository",
    );
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node node_modules/vitest/vitest.mjs run tests/unit/platform/repository.test.ts --no-cache`

Expected: FAIL because the repository class is missing.

- [ ] **Step 3: Implement repository cloning**

```ts
export class InMemoryPlatformRepository implements PlatformRepository {
  private snapshot: PlatformSnapshot;

  constructor(seed: PlatformSnapshot = createPlatformDemoSeed()) {
    this.snapshot = structuredClone(seed);
  }

  getSnapshot(): PlatformSnapshot {
    return structuredClone(this.snapshot);
  }

  replaceSnapshot(snapshot: PlatformSnapshot): void {
    this.snapshot = structuredClone(snapshot);
  }
}
```

- [ ] **Step 4: Implement provider state**

`PlatformProvider` exposes:

```ts
interface PlatformContextValue {
  snapshot: PlatformSnapshot;
  activeProfile: AccessProfile;
  setActiveProfile(profile: AccessProfile): void;
  activeJourneyId: string | null;
  startJourney(journeyId: string): void;
  stopJourney(): void;
  setJourneyStep(stepId: string): void;
  simulateIntegration(adapterId: string, outcome: "SUCCESS" | "PARTIAL" | "FAILURE"): void;
}
```

Seed Operations, Management, Admin, and Auditor demo profiles. Every profile can read all modules. Operations receives bounded action grants; Management and Admin receive `ALL` grants but still require break-glass for self-approval.

Wrap the existing `SubventionProvider` inside `PlatformProvider` in `PlatformShell.tsx`; do not change `SubventionProvider` behavior.

- [ ] **Step 5: Verify and commit**

Run: `node node_modules/vitest/vitest.mjs run tests/unit/platform/repository.test.ts --no-cache`

Expected: PASS.

```bash
git add apps/web/features/platform apps/web/components/shell/PlatformShell.tsx tests/unit/platform/repository.test.ts
git commit -m "feat(platform): provide portable demo state"
```

### Task 5: Replace fragmented navigation with the uniform platform shell

**Files:**
- Create: `apps/web/components/shell/CapabilitySidebar.tsx`
- Modify: `apps/web/components/shell/PlatformShell.tsx`
- Modify: `apps/web/components/shell/ModuleNavigation.tsx`
- Modify: `apps/web/components/shell/CommandBar.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `tests/e2e/platform-navigation.spec.ts`

**Interfaces:**
- Produces: a single visible capability shell on every route.
- Consumes: `PLATFORM_MODULES`, `moduleBySlug`, `usePlatform()`, existing `Button`, `Command`, `Select`, and `Tooltip` primitives.

- [ ] **Step 1: Write the failing navigation test**

```ts
import { expect, test } from "@playwright/test";

test("every approved capability is visible and navigable", async ({ page }) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "SMART EPP capabilities" });
  await expect(navigation.getByRole("link", { name: "Employer Programmes" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Foreclosure" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Admin" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Employees" })).toHaveAttribute(
    "href",
    "/employees",
  );
});

test("subvention keeps its workspace inside the common shell", async ({ page }) => {
  await page.goto("/subvention");
  await expect(page.getByRole("navigation", { name: "SMART EPP capabilities" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Subvention Control Desk" })).toBeVisible();
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx playwright test tests/e2e/platform-navigation.spec.ts`

Expected: FAIL because the current rail exposes only four modules and hides itself on Subvention. Dynamic module route rendering is verified in Task 6, after the route exists.

- [ ] **Step 3: Build `CapabilitySidebar`**

Render all `PLATFORM_MODULES` as labeled links. Support an explicit collapse button that reduces the sidebar to icon-plus-tooltip mode without changing route visibility. Place Admin in a separated final group. Use `aria-current="page"`, a text label in expanded mode, and an accessible tooltip in collapsed mode.

- [ ] **Step 4: Make `ModuleNavigation` registry-driven**

Resolve the active module from `usePathname()`. Render its complete submodule list using `/${module.slug}/${submodule.slug}`. Preserve the existing Subvention links by mapping approved Subvention submodule slugs to their existing route paths where they already exist.

- [ ] **Step 5: Make `CommandBar` global**

Replace the Subvention-only route list with registry-derived commands. Add controls labeled `Start Demo Journey`, `Work queue`, `Alerts`, and `Integration health`. Keep the actor/profile switcher, but its selection changes permissions rather than module visibility.

- [ ] **Step 6: Unify `PlatformShell` and CSS**

Remove `data-standalone-subvention`. Always render `CapabilitySidebar`; render `ModuleNavigation` when the active module has submodules. Preserve heading focus management and the existing skip link. Use the existing design tokens and add no foundational hex values.

- [ ] **Step 7: Run the navigation test and regression test**

Run: `npx playwright test tests/e2e/platform-navigation.spec.ts tests/e2e/platform.spec.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/shell apps/web/app/globals.css tests/e2e/platform-navigation.spec.ts
git commit -m "feat(platform): unify capability navigation"
```

### Task 6: Make every approved module and submodule clickable

**Files:**
- Create: `apps/web/features/platform/workspaces/ModuleWorkspace.tsx`
- Create: `apps/web/app/[module]/[[...submodule]]/page.tsx`
- Modify: `apps/web/app/onboarding/page.tsx`
- Modify: `apps/web/app/foreclosure/page.tsx`
- Test: `tests/e2e/platform-navigation.spec.ts`

**Interfaces:**
- Produces: `ModuleWorkspace({ module, submodule, snapshot, filters })`.
- Consumes: registry resolution, `PlatformSnapshot`, `StatusBadge`, `Money`, and `RouteFilters`.

- [ ] **Step 1: Extend the failing E2E route contract**

Add these exact destinations to `platform-navigation.spec.ts`:

```ts
const destinations = [
  ["/programmes/credit-handoff", "Credit Handoff"],
  ["/employees/enrolment", "Employee Enrolment"],
  ["/applications/exposure-lifecycle", "Reservation, Utilisation and Release"],
  ["/assets/device-identifiers", "Serial/IMEI Identification"],
  ["/orders/lease-handoff", "Lease-Execution Handoff"],
  ["/portfolio/sanction-utilisation", "Sanction and Exposure Utilisation"],
  ["/billing/tally-handoff", "Tally Handoff and Status"],
  ["/foreclosure/checker-validation", "Checker Validation"],
  ["/documents/evidence-links", "Evidence Links"],
  ["/exceptions/reconciliation-breaks", "Reconciliation Breaks"],
  ["/reports/management", "Management Dashboard"],
  ["/admin/bre-engine", "BRE Engine"],
] as const;
```

For each route, assert the heading, a `Read only` badge, source freshness, and absence of `404`.

- [ ] **Step 2: Run and verify failure**

Run: `npx playwright test tests/e2e/platform-navigation.spec.ts`

Expected: FAIL on the first missing dynamic workspace.

- [ ] **Step 3: Implement the dynamic route**

The page receives asynchronous Next.js 15 params, resolves the module and submodule, calls `notFound()` for unknown paths, and renders `ModuleWorkspace`. Do not let the dynamic route override existing static Subvention routes.

```ts
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ module: string; submodule?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const route = await params;
  const module = moduleBySlug(route.module);
  if (!module) notFound();
  const submodule = submoduleByPath(route.module, route.submodule ?? []);
  if ((route.submodule?.length ?? 0) > 0 && !submodule) notFound();
  return <ModuleWorkspace module={module} submodule={submodule} filters={await searchParams} />;
}
```

- [ ] **Step 4: Implement the reusable operational workspace**

Render page identity, `Read only` state, freshness timestamp, compact relevant totals, filters, a dense record table, and a right-side contextual inspector trigger. Derive displayed records from the connected seed by module; never generate values inside render functions.

Redirect `/onboarding` to `/programmes/readiness`. Keep `/foreclosure` as the module overview but render through the same `ModuleWorkspace` so the design language is uniform.

- [ ] **Step 5: Verify and commit**

Run: `npx playwright test tests/e2e/platform-navigation.spec.ts`

Expected: PASS.

```bash
git add apps/web/app apps/web/features/platform/workspaces tests/e2e/platform-navigation.spec.ts
git commit -m "feat(platform): expose full clickable workspace map"
```

### Task 7: Build the universal Command Centre and Workbench

**Files:**
- Create: `apps/web/features/platform/command-centre/CommandCentre.tsx`
- Create: `apps/web/features/platform/workbench/Workbench.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/features/platform/workspaces/ModuleWorkspace.tsx`
- Test: `tests/e2e/platform-navigation.spec.ts`

**Interfaces:**
- Produces: `CommandCentre()` and `Workbench()`.
- Consumes: `usePlatform()`, `WorkItem`, `Money`, `StatusBadge`, and registry routes.

- [ ] **Step 1: Write failing Command Centre assertions**

```ts
test("command centre exposes operations and executive lenses to every profile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Command Centre" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Operations" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Executive" })).toBeVisible();
  await page.getByRole("tab", { name: "Executive" }).click();
  await expect(page.getByText("Exposure and utilisation")).toBeVisible();
});

test("workbench retains all queue types without hiding modules", async ({ page }) => {
  await page.goto("/workbench");
  await expect(page.getByRole("tab", { name: "My Tasks" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "My Approvals" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "My Exceptions" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Employer Programmes" })).toBeVisible();
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx playwright test tests/e2e/platform-navigation.spec.ts`

Expected: FAIL because `/` still renders the role-filtered Subvention workbench.

- [ ] **Step 3: Implement `CommandCentre`**

Render Operations and Executive tabs for all profiles. Operations shows work queue, overdue items, pending approvals, and control alerts. Executive shows portfolio health, sanction/utilisation, financial exposure, programme pipeline, and drill-down links. Every metric links to a filtered underlying route.

- [ ] **Step 4: Implement `Workbench`**

Render all approved queue tabs. Profile selection changes permitted actions and default filters only; it does not hide modules or queue categories. Disabled actions show `Requires IAM permission` through accessible text.

- [ ] **Step 5: Wire routes and verify**

Render `CommandCentre` from `app/page.tsx`. In `ModuleWorkspace`, delegate the `WORKBENCH` module overview to `Workbench`.

Run: `npx playwright test tests/e2e/platform-navigation.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/page.tsx apps/web/features/platform tests/e2e/platform-navigation.spec.ts
git commit -m "feat(platform): add command centre and workbench"
```

### Task 8: Add the connected guided demo journey

**Files:**
- Create: `apps/web/features/platform/guided-demo/GuidedDemoDrawer.tsx`
- Modify: `apps/web/components/shell/CommandBar.tsx`
- Modify: `apps/web/components/shell/PlatformShell.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `tests/e2e/guided-demo.spec.ts`

**Interfaces:**
- Produces: `GuidedDemoDrawer()`.
- Consumes: `usePlatform()` journey methods and the seeded `GuidedJourney` step routes.

- [ ] **Step 1: Write the failing journey test**

```ts
import { expect, test } from "@playwright/test";

test("guided demo follows one connected case across modules", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start Demo Journey" }).click();
  await expect(page.getByRole("dialog", { name: "Guided Demo Journey" })).toBeVisible();
  await expect(page.getByText("Northstar Consulting Private Limited")).toBeVisible();
  await page.getByRole("button", { name: "Open current step" }).click();
  await expect(page).toHaveURL(/\/programmes\/readiness/);
  await page.getByRole("button", { name: "Next journey step" }).click();
  await expect(page).toHaveURL(/\/employees\/enrolment/);
  await page.getByRole("button", { name: "Exit Demo" }).click();
  await expect(page.getByRole("dialog", { name: "Guided Demo Journey" })).toHaveCount(0);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx playwright test tests/e2e/guided-demo.spec.ts`

Expected: FAIL because the start control has no journey behavior.

- [ ] **Step 3: Implement the drawer**

Show the seeded employer, employee, application, asset, and lease identifiers; the full lifecycle step list; current-step explanation; `Open current step`, `Previous journey step`, `Next journey step`, and `Exit Demo` controls. Route changes must open real module workspaces and preserve the drawer.

Use the connected Northstar case and eight registered workspace destinations covering employer programme readiness, employee enrolment, eligibility/credit, asset identification, approval, lease handoff/activation, servicing, and foreclosure. Encode record context through supported query filters; do not route to record IDs as if they were registry submodules.

- [ ] **Step 4: Add accessible and responsive behavior**

Use the existing `Sheet` primitive. Keep focus trapped while open, return focus to the trigger on exit, announce step changes through `aria-live="polite"`, and render final state immediately under `prefers-reduced-motion`.

- [ ] **Step 5: Verify and commit**

Run: `npx playwright test tests/e2e/guided-demo.spec.ts`

Expected: PASS.

```bash
git add apps/web/features/platform/guided-demo apps/web/components/shell apps/web/app/globals.css tests/e2e/guided-demo.spec.ts
git commit -m "feat(platform): add guided full EPP journey"
```

### Task 9: Build Admin control surfaces and the mock integration simulator

**Files:**
- Create: `apps/web/features/platform/admin/AdminWorkspace.tsx`
- Create: `apps/web/features/platform/admin/IntegrationSimulator.tsx`
- Modify: `apps/web/features/platform/workspaces/ModuleWorkspace.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `tests/e2e/admin-integrations.spec.ts`

**Interfaces:**
- Produces: `AdminWorkspace({ submodule })` and `IntegrationSimulator()`.
- Consumes: `evaluateAccess`, `usePlatform()`, and seeded `IntegrationAdapterDemo` records.

- [ ] **Step 1: Write failing Admin and integration tests**

```ts
import { expect, test } from "@playwright/test";

test("admin keeps IAM, BRE, and workflow configuration separate", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("link", { name: "IAM" })).toBeVisible();
  await expect(page.getByRole("link", { name: "BRE Engine" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Workflow Configuration" })).toBeVisible();
});

test("integration simulator changes mock state without a live connector", async ({ page }) => {
  await page.goto("/admin/integrations");
  await expect(page.getByText("Demo only")).toBeVisible();
  await page.getByRole("row", { name: /Tally/ }).getByRole("button", { name: "Simulate partial failure" }).click();
  await expect(page.getByRole("row", { name: /Tally.*Partial/ })).toBeVisible();
  await page.getByRole("row", { name: /Tally/ }).getByRole("button", { name: "Retry mock sync" }).click();
  await expect(page.getByRole("row", { name: /Tally.*Healthy/ })).toBeVisible();
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx playwright test tests/e2e/admin-integrations.spec.ts`

Expected: FAIL because Admin uses only the generic workspace.

- [ ] **Step 3: Implement Admin overview**

Show IAM, Masters, BRE Engine, Workflow Configuration, Integrations, Audit & System Logs, and Platform Settings as dense navigation rows with read-only status, approval requirements, last change, and drill-down links. Do not merge BRE and workflow settings.

- [ ] **Step 4: Implement the simulator**

Render the seven seeded adapters in a compact table with mock status, last sync, accepted/rejected/pending counts, sample payload inspector, and permission-aware simulation buttons. The simulator updates React state only and records a synthetic audit line. It must display `No live connection or credential is used`.

- [ ] **Step 5: Verify and commit**

Run: `npx playwright test tests/e2e/admin-integrations.spec.ts`

Expected: PASS.

```bash
git add apps/web/features/platform/admin apps/web/features/platform/workspaces apps/web/app/globals.css tests/e2e/admin-integrations.spec.ts
git commit -m "feat(admin): demonstrate controls and integrations"
```

### Task 10: Harden responsive behavior, accessibility, and regression coverage

**Files:**
- Modify: `apps/web/app/globals.css`
- Modify: `tests/e2e/platform-navigation.spec.ts`
- Modify: `tests/e2e/guided-demo.spec.ts`
- Modify: `tests/e2e/platform.spec.ts`

**Interfaces:**
- Produces: verified responsive and keyboard behavior.
- Consumes: all Milestone 1 components.

- [ ] **Step 1: Add failing responsive assertions**

```ts
for (const viewport of [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
]) {
  test(`platform has no page overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
}
```

- [ ] **Step 2: Run and verify at least the narrow layout fails before hardening**

Run: `npx playwright test tests/e2e/platform-navigation.spec.ts tests/e2e/guided-demo.spec.ts`

Expected: FAIL if the sidebar, table, or drawer causes page-level overflow.

- [ ] **Step 3: Implement responsive priority**

At narrow widths, collapse the capability sidebar behind an accessible menu, convert submodule navigation to a horizontal overflow region or sheet, preserve priority table columns, and keep contextual detail inside a full-width sheet. Do not reduce operational text below 12px.

- [ ] **Step 4: Add keyboard and permission-state assertions**

Verify skip link, sidebar links, command palette, tabs, table rows, inspector trigger, guided drawer controls, and disabled mutation explanations are keyboard reachable with visible focus. Verify status copy remains present when colour is ignored.

- [ ] **Step 5: Run deterministic gates**

Run: `npm.cmd run typecheck`

Expected: PASS.

Run: `node node_modules/vitest/vitest.mjs run --no-cache`

Expected: all unit tests PASS.

Run: `npx playwright test tests/e2e/platform-navigation.spec.ts tests/e2e/guided-demo.spec.ts tests/e2e/admin-integrations.spec.ts tests/e2e/platform.spec.ts`

Expected: PASS.

Run: `npm.cmd run lint`

Expected: PASS with zero warnings. If the worktree dependency junction causes another timeout, run the same command in the source checkout after applying the branch or replace the junction with a complete local `npm ci`; do not report lint as passing from a timeout.

Run: `npm.cmd run build`

Expected: production build PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/globals.css tests/e2e
git commit -m "test(platform): verify responsive prototype foundation"
```

### Task 11: Review Milestone 1 and prepare the next bounded plan

**Files:**
- Modify only files required by review findings.
- Create after review: `docs/superpowers/plans/2026-08-10-smart-epp-origination-lease-journey.md`

**Interfaces:**
- Produces: a reviewed Milestone 1 and a separate plan for employer, employee, application, order, and lease workflow depth.
- Consumes: Milestone 1 verification evidence.

- [ ] **Step 1: Request code review**

Use `superpowers:requesting-code-review` against the branch diff from `a9343a5` to the Milestone 1 head. Review architecture boundaries, registry completeness, IAM semantics, synthetic-data integrity, Subvention regressions, accessibility, and responsive behavior.

- [ ] **Step 2: Address only confirmed findings**

For every accepted defect, reproduce it with a failing unit or E2E test, implement the minimal correction, and rerun the affected test plus the full deterministic gates.

- [ ] **Step 3: Verify the final branch state**

Use `superpowers:verification-before-completion`. Record exact command outputs for lint, type-check, unit tests, selected E2E tests, and production build. Do not call the milestone complete if any critical check is failing or timed out.

- [ ] **Step 4: Create the next plan only after Milestone 1 approval**

The next plan deepens Employer Programmes, Employees, Applications & Eligibility, Assets, Orders & Approvals, and Leases/Lots/Portfolio. Later bounded plans cover Billing, Foreclosure, preserved Subvention integration, Admin control depth, PostgreSQL/Supabase persistence, and Vercel deployment.

- [ ] **Step 5: Close the review gate truthfully**

If the review reports no confirmed findings, make no correction commit and record that outcome with the verification evidence. If it reports a confirmed finding, stop this plan, add a numbered correction task containing that finding's exact file paths and failing test, then execute and commit that correction task before preparing the next milestone plan.
