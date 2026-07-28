# Smart EPP Subvention Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved Smart EPP platform shell and a complete, testable Subvention slice covering Scheme Master, Employer Programme Mapping, Purchase Transaction Repository, and Eligibility Engine.

**Architecture:** Keep business behaviour in a framework-free `@smart-epp/domain` package, implement deterministic in-memory repositories behind explicit contracts, and compose Next.js client workspaces over those repositories. Use Tailwind and owned shadcn/Radix source for accessible primitives, with GSAP limited to approved spatial transitions.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Zod 3, Tailwind CSS 4, shadcn/ui with Radix, GSAP, Vitest 2, Playwright 1, Prisma schema contract.

## Global Constraints

- Read `AGENTS.md` and every Markdown file under `docs` before implementation.
- Employer is contractual obligor; employee is beneficiary; Connect underwrites employer.
- Do not visually copy the onboarding or foreclosure prototypes.
- Use prototypes only for workflows, fields, controls, calculations, and business rules.
- OEM behaviour must be configurable; no OEM-specific conditional branch is permitted.
- Master data is effective-dated, versioned, maker-checker controlled, and immutable after approval.
- Historical eligibility decisions preserve the rule snapshot used during processing.
- IMEI, lease, invoice-upload key, and prior-claim duplicates cannot become eligible.
- Every material action creates an audit event.
- Use integer paise for money and basis points for rates.
- Use the documented Smart EPP colour tokens and the approved expressive Apple-inspired geometry.
- Use adaptive split workspaces and a role-aware attention-ledger home.
- Respect keyboard navigation, visible focus, semantic status, WCAG AA contrast, and `prefers-reduced-motion`.
- No live PostgreSQL, LMS, accounting, GST, email, authentication, or document-storage integration.
- Do not initialize Git automatically. This workspace currently has no recognised Git metadata; run commit steps only if `git rev-parse --is-inside-work-tree` succeeds.
- Completion requires fresh successful lint, type-check, unit-test, E2E-test, and production-build runs.

---

## File Structure

### Domain

```text
packages/domain/src/
├── index.ts                     Public exports
├── controls.ts                  Existing generic control assertions
└── subvention/
    ├── types.ts                 Domain entities and result types
    ├── schemas.ts               Zod input schemas
    ├── issues.ts                Stable issue codes and issue factory
    ├── dates.ts                 Inclusive interval and deadline helpers
    ├── money.ts                 Integer-paise calculations
    ├── master-workflow.ts       Maker-checker transitions and immutability
    ├── scheme-rules.ts          Scheme overlap and configuration rules
    ├── programme-mapping.ts     Mapping resolution and rule precedence
    ├── purchase-import.ts       Import validation and quarantine
    ├── eligibility.ts           Ordered eligibility decision engine
    └── repositories.ts          Persistence contracts
```

### Web application

```text
apps/web/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── subvention/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── schemes/page.tsx
│       ├── transactions/page.tsx
│       └── eligibility/page.tsx
├── components/
│   ├── shell/
│   │   ├── PlatformShell.tsx
│   │   ├── GlobalRail.tsx
│   │   ├── CommandBar.tsx
│   │   └── ModuleNavigation.tsx
│   ├── shared/
│   │   ├── AdaptiveSplitWorkspace.tsx
│   │   ├── AttentionLedger.tsx
│   │   ├── AuditTimeline.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Money.tsx
│   │   ├── RuleTrace.tsx
│   │   └── StatusBadge.tsx
│   └── ui/                     Owned shadcn/Radix source
├── features/subvention/
│   ├── data/
│   │   ├── seed.ts
│   │   └── InMemorySubventionRepository.ts
│   ├── store/SubventionProvider.tsx
│   ├── control-desk/ControlDesk.tsx
│   ├── schemes/SchemeProgrammeWorkspace.tsx
│   ├── transactions/PurchaseRepositoryWorkspace.tsx
│   └── eligibility/EligibilityWorkspace.tsx
└── lib/
    ├── cn.ts
    └── motion.ts
```

### Tests and persistence contract

```text
tests/
├── unit/
│   ├── controls.test.ts
│   ├── prisma-schema.test.ts
│   └── subvention/
│       ├── fixtures.ts
│       ├── schemas-money-dates.test.ts
│       ├── master-workflow.test.ts
│       ├── scheme-rules.test.ts
│       ├── programme-mapping.test.ts
│       ├── purchase-import.test.ts
│       ├── eligibility.test.ts
│       └── repository.test.ts
└── e2e/
    ├── platform.spec.ts
    ├── subvention-schemes.spec.ts
    └── subvention-eligibility.spec.ts

prisma/schema.prisma
apps/web/eslint.config.mjs
apps/web/postcss.config.mjs
apps/web/components.json
```

---

### Task 1: Repair Tooling and Establish UI Foundations

**Files:**

- Modify: `package.json`
- Modify: `apps/web/package.json`
- Modify: `apps/web/tsconfig.json`
- Modify: `apps/web/app/globals.css`
- Create: `apps/web/eslint.config.mjs`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/components.json`
- Create: `apps/web/lib/cn.ts`
- Create: `apps/web/lib/motion.ts`
- Create: selected files under `apps/web/components/ui/`
- Modify: `.gitignore`
- Modify: `tests/e2e/platform.spec.ts`

**Interfaces:**

- Consumes: Existing npm workspaces, Next.js application, Vitest and Playwright configuration.
- Produces: `cn(...inputs: ClassValue[]): string`, shared CSS tokens, `MOTION` timing constants, working lint command, accessible shadcn/Radix primitives.

- [ ] **Step 1: Reproduce the existing setup failures**

Run:

```powershell
npm.cmd run lint
npm.cmd run test:e2e
```

Expected:

- Lint fails because `next lint` is deprecated and requests interactive configuration.
- Command Centre E2E fails because `getByText("Command Centre")` matches both navigation and heading.

- [ ] **Step 2: Install exact capability groups**

Install workspace dependencies from the repository root, then run the shadcn CLI
from the web workspace so generated paths and aliases remain scoped to the
Next.js application:

```powershell
npm.cmd install --workspace apps/web tailwindcss @tailwindcss/postcss postcss gsap radix-ui lucide-react class-variance-authority clsx tailwind-merge tw-animate-css
npm.cmd install --workspace apps/web --save-dev eslint eslint-config-next
Push-Location apps/web
npx.cmd shadcn@latest init -d --base radix
npx.cmd shadcn@latest add button badge command dialog alert-dialog input label popover scroll-area select sheet skeleton table tabs tooltip
Pop-Location
```

After CLI generation, retain existing App Router paths and replace generated colour values with Smart EPP tokens. Do not accept a generated dark-green palette.

- [ ] **Step 3: Replace deprecated lint script**

Keep the root scripts as workspace delegates:

```json
{
  "scripts": {
    "lint": "npm run lint --workspace apps/web",
    "typecheck": "npm run typecheck --workspace apps/web"
  }
}
```

Set the web scripts to:

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc --noEmit"
  }
}
```

Create `apps/web/eslint.config.mjs`:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  globalIgnores([
    "**/.next/**",
    "**/node_modules/**",
    "**/playwright-report/**",
    "**/test-results/**",
  ]),
]);
```

Add `.superpowers/` to the repository `.gitignore`; this excludes visual
companion runtime state without hiding product source.

- [ ] **Step 4: Establish theme and motion constants**

Create `apps/web/lib/cn.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Create `apps/web/lib/motion.ts`:

```ts
export const MOTION = {
  micro: 0.18,
  enter: 0.3,
  exit: 0.18,
  panelEase: "power2.out",
  exitEase: "power1.in",
} as const;
```

Define in `globals.css`:

```css
:root {
  --navy: #132a4f;
  --primary: #2457d6;
  --brand-red: #c83b3b;
  --canvas: #f6f8fb;
  --surface: #ffffff;
  --text: #182230;
  --muted: #667085;
  --border: #dde3ea;
  --success: #168a5b;
  --warning: #c87912;
  --critical: #c43c3c;
  --exception: #7254b3;
  --radius-control: 8px;
  --radius-panel: 12px;
  --radius-workspace: 18px;
  --radius-layer: 22px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Fix the ambiguous E2E locator**

Change `tests/e2e/platform.spec.ts` to:

```ts
import { expect, test } from "@playwright/test";

test("command centre", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Command Centre" }),
  ).toBeVisible();
});

test("subvention", async ({ page }) => {
  await page.goto("/subvention");
  await expect(
    page.getByRole("heading", { level: 1, name: "Subvention Control Desk" }),
  ).toBeVisible();
});
```

The second test is expected to fail until Task 8 implements the approved shell and Control Desk.

- [ ] **Step 6: Verify setup**

Run:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
```

Expected: all three commands exit `0`. E2E retains one expected red test for the not-yet-built Control Desk.

- [ ] **Step 7: Record checkpoint**

Run:

```powershell
git rev-parse --is-inside-work-tree
```

If it returns `true`:

```powershell
git add package.json package-lock.json apps/web/package.json apps/web/tsconfig.json apps/web/app/globals.css apps/web/components/ui apps/web/lib apps/web/eslint.config.mjs apps/web/postcss.config.mjs apps/web/components.json .gitignore tests/e2e/platform.spec.ts
git commit -m "chore: establish Smart EPP UI and quality tooling"
```

If it fails with `not a git repository`, leave files unstaged and continue without initializing Git.

---

### Task 2: Define Subvention Vocabulary, Schemas, Money, and Dates

**Files:**

- Create: `packages/domain/src/controls.ts`
- Create: `packages/domain/src/subvention/types.ts`
- Create: `packages/domain/src/subvention/issues.ts`
- Create: `packages/domain/src/subvention/schemas.ts`
- Create: `packages/domain/src/subvention/money.ts`
- Create: `packages/domain/src/subvention/dates.ts`
- Modify: `packages/domain/src/index.ts`
- Modify: `packages/domain/package.json`
- Create: `tests/unit/subvention/fixtures.ts`
- Create: `tests/unit/subvention/schemas-money-dates.test.ts`

**Interfaces:**

- Consumes: Zod 3.
- Produces: Types from approved spec; `schemeDraftSchema`, `programmeMappingDraftSchema`, `purchaseTransactionInputSchema`, `intervalsOverlapInclusive`, `dateIsWithinInclusive`, `addDaysIso`, `calculateExpectedAmountPaise`, `issue`.

- [ ] **Step 1: Move existing generic controls without changing behaviour**

Move existing assertions into `packages/domain/src/controls.ts` and re-export them from `index.ts`:

```ts
export function assertUniqueImei(existing: string[], imei: string) {
  if (existing.includes(imei)) throw new Error("Duplicate IMEI");
}

export function assertWithinClaimTimeline(
  invoiceDate: Date,
  filingDate: Date,
  days: number,
) {
  const elapsed = Math.floor(
    (filingDate.getTime() - invoiceDate.getTime()) / 86_400_000,
  );
  if (elapsed > days) throw new Error("Claim timeline expired");
}

export function assertMakerChecker(maker: string, checker: string) {
  if (maker === checker) throw new Error("Maker cannot approve own work");
}

export function assertBatchMutable(status: string) {
  if (["APPROVED", "LOCKED"].includes(status)) {
    throw new Error("Approved batch is immutable");
  }
}
```

Run:

```powershell
npm.cmd run test -- tests/unit/controls.test.ts
```

Expected: existing four tests pass.

- [ ] **Step 2: Write failing primitive-domain tests**

Create `tests/unit/subvention/schemas-money-dates.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  calculateExpectedAmountPaise,
  dateIsWithinInclusive,
  intervalsOverlapInclusive,
  schemeDraftSchema,
} from "../../../packages/domain/src";

describe("subvention primitives", () => {
  it("treats both effective-date boundaries as inclusive", () => {
    expect(
      dateIsWithinInclusive("2026-07-01", "2026-07-01", "2026-09-30"),
    ).toBe(true);
    expect(
      dateIsWithinInclusive("2026-09-30", "2026-07-01", "2026-09-30"),
    ).toBe(true);
    expect(
      intervalsOverlapInclusive(
        "2026-07-01",
        "2026-07-31",
        "2026-07-31",
        "2026-08-31",
      ),
    ).toBe(true);
  });

  it("adds filing days using date-only UTC arithmetic", () => {
    expect(addDaysIso("2026-01-01", 90)).toBe("2026-04-01");
  });

  it("calculates basis-point percentage using integer paise", () => {
    expect(
      calculateExpectedAmountPaise({
        calculationBasis: "INVOICE_VALUE",
        invoiceValuePaise: 8_250_050,
        baseValuePaise: 7_000_000,
        rateBps: 350,
      }),
    ).toBe(288_752);
  });

  it("requires a positive flat amount for flat schemes", () => {
    const result = schemeDraftSchema.safeParse({
      schemeId: "scheme-1",
      code: "APL-Q3-26",
      name: "Corporate Q3",
      oemId: "oem-apple",
      settlementCounterpartyType: "DISTRIBUTOR",
      calculationBasis: "FLAT_AMOUNT",
      claimTimelineDays: 90,
      priority: 10,
      eligibleProductIds: ["iphone-16"],
      effectiveFrom: "2026-07-01",
      effectiveTo: "2026-09-30",
      requiredDocumentCodes: ["PURCHASE_INVOICE"],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Verify red**

Run:

```powershell
npm.cmd run test -- tests/unit/subvention/schemas-money-dates.test.ts
```

Expected: FAIL because imported subvention primitives do not exist.

- [ ] **Step 4: Implement types and helpers**

Copy the approved entity definitions from the design spec into `types.ts`. Add:

```ts
export interface DomainIssue {
  code: string;
  severity: "ERROR" | "WARNING" | "REVIEW";
  entityType: string;
  entityId?: string;
  field?: string;
  message: string;
  recoveryAction: string;
}

export type CalculationInput = {
  calculationBasis: "INVOICE_VALUE" | "BASE_VALUE" | "FLAT_AMOUNT";
  invoiceValuePaise: number;
  baseValuePaise: number;
  rateBps?: number;
  flatAmountPaise?: number;
};
```

Implement `dates.ts` with UTC date-only parsing:

```ts
const DAY_MS = 86_400_000;

function parseIsoDate(value: string) {
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) throw new Error(`Invalid ISO date: ${value}`);
  return parsed;
}

export function dateIsWithinInclusive(
  date: string,
  start: string,
  end: string,
) {
  const value = parseIsoDate(date);
  return value >= parseIsoDate(start) && value <= parseIsoDate(end);
}

export function intervalsOverlapInclusive(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) {
  return parseIsoDate(aStart) <= parseIsoDate(bEnd)
    && parseIsoDate(bStart) <= parseIsoDate(aEnd);
}

export function addDaysIso(date: string, days: number) {
  return new Date(parseIsoDate(date) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}
```

Implement `money.ts`:

```ts
import type { CalculationInput } from "./types";

export function calculateExpectedAmountPaise(input: CalculationInput) {
  if (input.calculationBasis === "FLAT_AMOUNT") {
    if (!input.flatAmountPaise || input.flatAmountPaise <= 0) {
      throw new Error("Positive flat amount required");
    }
    return input.flatAmountPaise;
  }

  if (!input.rateBps || input.rateBps <= 0 || input.rateBps > 10_000) {
    throw new Error("Rate must be between 1 and 10000 basis points");
  }

  const basis = input.calculationBasis === "INVOICE_VALUE"
    ? input.invoiceValuePaise
    : input.baseValuePaise;
  return Math.round((basis * input.rateBps) / 10_000);
}
```

Implement discriminated Zod refinements in `schemas.ts` so flat rules require `flatAmountPaise`, percentage rules require `rateBps`, and `effectiveFrom <= effectiveTo`.

- [ ] **Step 5: Verify green**

Run:

```powershell
npm.cmd run test -- tests/unit/controls.test.ts tests/unit/subvention/schemas-money-dates.test.ts
npm.cmd run typecheck
```

Expected: all tests pass and type-check exits `0`.

- [ ] **Step 6: Record checkpoint**

If Git is available:

```powershell
git add packages/domain tests/unit/subvention
git commit -m "feat: define subvention domain primitives"
```

---

### Task 3: Implement Master Workflow and Scheme Rules

**Files:**

- Create: `packages/domain/src/subvention/master-workflow.ts`
- Create: `packages/domain/src/subvention/scheme-rules.ts`
- Modify: `packages/domain/src/index.ts`
- Create: `tests/unit/subvention/master-workflow.test.ts`
- Create: `tests/unit/subvention/scheme-rules.test.ts`

**Interfaces:**

- Consumes: `Actor`, `SchemeVersion`, `DomainIssue`, inclusive date helpers.
- Produces:

```ts
transitionMaster<T extends VersionedMaster>(
  master: T,
  action: "SUBMIT" | "APPROVE" | "RETURN" | "REJECT",
  actor: Actor,
  remarks: string,
  occurredAt: string,
): T

validateSchemeOverlap(
  candidate: SchemeVersion,
  existing: SchemeVersion[],
): DomainIssue[]
```

- [ ] **Step 1: Write failing master tests**

Use exact cases:

```ts
it("prevents maker from approving own submitted version", () => {
  const submitted = schemeFixture({
    workflowStatus: "SUBMITTED",
    makerUserId: "maker-1",
  });
  expect(() =>
    transitionMaster(
      submitted,
      "APPROVE",
      { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
      "Approved",
      "2026-07-28T10:00:00.000Z",
    ),
  ).toThrow("Maker cannot approve own work");
});

it("makes an approved version immutable", () => {
  const approved = schemeFixture({ workflowStatus: "APPROVED" });
  expect(() =>
    transitionMaster(
      approved,
      "SUBMIT",
      { userId: "maker-2", role: "MASTER_DATA_ADMIN" },
      "Resubmit",
      "2026-07-28T10:00:00.000Z",
    ),
  ).toThrow("Approved master version is immutable");
});
```

Add overlap cases:

```ts
it("flags equal-priority approved overlap at a shared boundary", () => {
  const existing = schemeFixture({
    id: "scheme-v1",
    priority: 10,
    effectiveFrom: "2026-07-01",
    effectiveTo: "2026-09-30",
    workflowStatus: "APPROVED",
  });
  const candidate = schemeFixture({
    id: "scheme-v2",
    priority: 10,
    effectiveFrom: "2026-09-30",
    effectiveTo: "2026-12-31",
    workflowStatus: "SUBMITTED",
  });
  expect(validateSchemeOverlap(candidate, [existing])[0]?.code)
    .toBe("SCHEME_OVERLAP");
});
```

- [ ] **Step 2: Verify red**

Run:

```powershell
npm.cmd run test -- tests/unit/subvention/master-workflow.test.ts tests/unit/subvention/scheme-rules.test.ts
```

Expected: FAIL because transition and overlap functions are missing.

- [ ] **Step 3: Implement minimal transition table**

Use:

```ts
const allowed = {
  DRAFT: ["SUBMIT"],
  RETURNED: ["SUBMIT"],
  SUBMITTED: ["APPROVE", "RETURN", "REJECT"],
  APPROVED: [],
  REJECTED: [],
  SUPERSEDED: [],
  INACTIVE: [],
} as const;
```

Require non-empty trimmed remarks for every action. On approval, require a different actor, set `checkerUserId`, `approvedAt`, and `workflowStatus: "APPROVED"`.

Implement overlap validation only for matching OEM and intersecting product sets. Equal-priority inclusive overlaps return:

```ts
issue({
  code: "SCHEME_OVERLAP",
  severity: "ERROR",
  entityType: "SchemeVersion",
  entityId: candidate.id,
  field: "effectiveFrom",
  message: "Approved scheme versions overlap with equal priority.",
  recoveryAction: "Change validity, product coverage, or priority.",
});
```

- [ ] **Step 4: Verify green**

Run:

```powershell
npm.cmd run test -- tests/unit/subvention/master-workflow.test.ts tests/unit/subvention/scheme-rules.test.ts
npm.cmd run test
```

Expected: all unit tests pass.

- [ ] **Step 5: Record checkpoint**

If Git is available:

```powershell
git add packages/domain/src/subvention tests/unit/subvention
git commit -m "feat: enforce scheme workflow and overlap controls"
```

---

### Task 4: Resolve Employer Programme Mappings and Rule Precedence

**Files:**

- Create: `packages/domain/src/subvention/programme-mapping.ts`
- Modify: `packages/domain/src/index.ts`
- Create: `tests/unit/subvention/programme-mapping.test.ts`

**Interfaces:**

- Consumes: `PurchaseTransaction`, `EmployerProgrammeMappingVersion`, `SchemeVersion`, `OemRuleDefaults`.
- Produces:

```ts
type MappingResolution =
  | { status: "RESOLVED"; mapping: EmployerProgrammeMappingVersion }
  | { status: "MISSING" | "AMBIGUOUS"; issues: DomainIssue[] };

resolveProgrammeMapping(
  transaction: PurchaseTransaction,
  mappings: EmployerProgrammeMappingVersion[],
): MappingResolution

resolveEffectiveRules(
  mapping: EmployerProgrammeMappingVersion,
  scheme: SchemeVersion,
  oemDefaults?: OemRuleDefaults,
): EligibilityRuleSnapshot
```

- [ ] **Step 1: Write failing resolution tests**

Cover exact-one, missing, ambiguous, invoice-date, and launch-date conditions:

```ts
it("returns ambiguous when two approved mappings match", () => {
  const transaction = purchaseFixture();
  const mappings = [
    mappingFixture({ id: "map-v1" }),
    mappingFixture({ id: "map-v2" }),
  ];
  const result = resolveProgrammeMapping(transaction, mappings);
  expect(result.status).toBe("AMBIGUOUS");
  if (result.status === "AMBIGUOUS") {
    expect(result.issues[0]?.code).toBe("PROGRAMME_MAPPING_AMBIGUOUS");
  }
});

it("applies approved programme override before scheme values", () => {
  const snapshot = resolveEffectiveRules(
    mappingFixture({
      overrides: {
        calculationBasis: "BASE_VALUE",
        rateBps: 300,
        approvalReference: "BH-APR-2026-014",
      },
    }),
    schemeFixture({
      calculationBasis: "INVOICE_VALUE",
      rateBps: 350,
    }),
  );
  expect(snapshot.calculationBasis).toBe("BASE_VALUE");
  expect(snapshot.rateBps).toBe(300);
  expect(snapshot.precedenceSources[0]).toContain("EmployerProgramme");
});
```

- [ ] **Step 2: Verify red**

Run:

```powershell
npm.cmd run test -- tests/unit/subvention/programme-mapping.test.ts
```

Expected: FAIL because resolution functions are absent.

- [ ] **Step 3: Implement deterministic matching**

Filter mappings by:

```ts
mapping.workflowStatus === "APPROVED"
mapping.employerId === transaction.employerId
mapping.programmeId === transaction.programmeId
mapping.oemId === transaction.oemId
dateIsWithinInclusive(
  transaction.invoiceDate,
  mapping.effectiveFrom,
  mapping.effectiveTo,
)
```

Return `MISSING` for zero matches and `AMBIGUOUS` for more than one. Do not select by array order.

`resolveEffectiveRules` copies programme override values first, then scheme values, then explicitly inheritable OEM defaults. It must throw if an override has no approval reference.

- [ ] **Step 4: Verify green**

Run:

```powershell
npm.cmd run test -- tests/unit/subvention/programme-mapping.test.ts
npm.cmd run test
```

Expected: all tests pass.

- [ ] **Step 5: Record checkpoint**

If Git is available:

```powershell
git add packages/domain/src/subvention/programme-mapping.ts packages/domain/src/index.ts tests/unit/subvention/programme-mapping.test.ts
git commit -m "feat: resolve employer programme rules"
```

---

### Task 5: Validate and Quarantine Purchase Imports

**Files:**

- Create: `packages/domain/src/subvention/purchase-import.ts`
- Modify: `packages/domain/src/index.ts`
- Create: `tests/unit/subvention/purchase-import.test.ts`

**Interfaces:**

- Consumes: `PurchaseTransactionInput`, existing purchases.
- Produces:

```ts
buildPurchaseSourceRowKey(input: PurchaseTransactionInput): string

validatePurchaseImport(
  existing: PurchaseTransaction[],
  rows: PurchaseTransactionInput[],
  context: { importedAt: string; idForRow: (rowNumber: number) => string },
): ImportResult
```

- [ ] **Step 1: Write failing import tests**

```ts
it("accepts valid rows and quarantines duplicate IMEI independently", () => {
  const valid = purchaseInputFixture({ imei: "351234567890111" });
  const duplicate = purchaseInputFixture({
    leaseId: "LES-2002",
    imei: "351234567890111",
    invoiceNumber: "INV-2002",
  });
  const result = validatePurchaseImport([], [valid, duplicate], {
    importedAt: "2026-07-28T10:00:00.000Z",
    idForRow: (row) => `txn-${row}`,
  });
  expect(result.accepted).toHaveLength(1);
  expect(result.quarantined).toHaveLength(1);
  expect(result.quarantined[0]?.issues[0]?.code).toBe("DUPLICATE_IMEI");
});

it("uses source system, lease, IMEI, and invoice as upload key", () => {
  expect(buildPurchaseSourceRowKey(purchaseInputFixture())).toBe(
    "LMS|LES-1001|351234567890123|INV-1001",
  );
});
```

Add separate cases for duplicate lease, duplicate source-row key, missing mandatory field, zero value, and duplicates against existing repository rows.

- [ ] **Step 2: Verify red**

Run:

```powershell
npm.cmd run test -- tests/unit/subvention/purchase-import.test.ts
```

Expected: FAIL because import functions are missing.

- [ ] **Step 3: Implement row-by-row import**

Use a working set that adds each accepted row before checking the next row. This catches duplicates inside the same batch and against repository state.

Quarantined rows contain:

```ts
{
  rowNumber,
  input,
  issues: [
    issue({
      code: "DUPLICATE_IMEI",
      severity: "ERROR",
      entityType: "PurchaseTransaction",
      field: "imei",
      message: `IMEI ${input.imei} already exists.`,
      recoveryAction: "Remove the duplicate or correct the source transaction.",
    }),
  ],
}
```

Valid rows become `PurchaseTransaction` objects using the provided deterministic ID and timestamp.

- [ ] **Step 4: Verify green**

Run:

```powershell
npm.cmd run test -- tests/unit/subvention/purchase-import.test.ts
npm.cmd run test
```

Expected: all tests pass.

- [ ] **Step 5: Record checkpoint**

If Git is available:

```powershell
git add packages/domain/src/subvention/purchase-import.ts packages/domain/src/index.ts tests/unit/subvention/purchase-import.test.ts
git commit -m "feat: validate purchase transaction imports"
```

---

### Task 6: Build the Eligibility Engine

**Files:**

- Create: `packages/domain/src/subvention/eligibility.ts`
- Modify: `packages/domain/src/index.ts`
- Create: `tests/unit/subvention/eligibility.test.ts`

**Interfaces:**

- Consumes:

```ts
interface EvaluateEligibilityInput {
  transaction: PurchaseTransaction;
  schemes: SchemeVersion[];
  mappings: EmployerProgrammeMappingVersion[];
  oemDefaults?: OemRuleDefaults;
  existingClaimedImeis: ReadonlySet<string>;
  existingClaimedLeaseIds: ReadonlySet<string>;
  evaluationDate: string;
  evaluatedAt: string;
  actor: Actor;
  decisionId: string;
  version: number;
  previousDecision?: EligibilityDecision;
}
```

- Produces:

```ts
evaluateEligibility(input: EvaluateEligibilityInput): EligibilityDecision
```

- [ ] **Step 1: Write the first failing happy-path test**

```ts
it("returns eligible with expected amount, deadline, and snapshot", () => {
  const decision = evaluateEligibility({
    transaction: purchaseFixture({
      invoiceDate: "2026-07-15",
      invoiceValuePaise: 8_250_000,
    }),
    schemes: [schemeFixture({ rateBps: 350 })],
    mappings: [mappingFixture()],
    existingClaimedImeis: new Set(),
    existingClaimedLeaseIds: new Set(),
    evaluationDate: "2026-08-01",
    evaluatedAt: "2026-08-01T10:00:00.000Z",
    actor: { userId: "ops-1", role: "SALES_OPS_MAKER" },
    decisionId: "decision-1",
    version: 1,
  });
  expect(decision.status).toBe("ELIGIBLE");
  expect(decision.expectedAmountPaise).toBe(288_750);
  expect(decision.filingDeadline).toBe("2026-10-13");
  expect(decision.ruleSnapshot?.schemeVersionId).toBe("scheme-version-1");
  expect(decision.ruleResults.every((rule) => rule.outcome === "PASS"))
    .toBe(true);
});
```

- [ ] **Step 2: Verify red**

Run:

```powershell
npm.cmd run test -- tests/unit/subvention/eligibility.test.ts -t "returns eligible"
```

Expected: FAIL because `evaluateEligibility` is missing.

- [ ] **Step 3: Implement minimal ordered engine for happy path**

Build `ruleResults` in the exact approved order. Resolve mapping, scheme, effective rules, amount, and deadline. Return an append-only decision object.

- [ ] **Step 4: Verify first green**

Run:

```powershell
npm.cmd run test -- tests/unit/subvention/eligibility.test.ts -t "returns eligible"
```

Expected: PASS.

- [ ] **Step 5: Add failing control tests one behaviour at a time**

Add separate tests for:

```text
INELIGIBLE: CANCELLED
INELIGIBLE: RETURNED
INELIGIBLE: REVERSED
INELIGIBLE: DUPLICATE_IMEI
INELIGIBLE: DUPLICATE_LEASE
INELIGIBLE: ALREADY_CLAIMED_IMEI
INELIGIBLE: ALREADY_CLAIMED_LEASE
INELIGIBLE: BEFORE_PROGRAMME_LAUNCH
INELIGIBLE: PRODUCT_NOT_ELIGIBLE
EXCEPTION_REVIEW: PROGRAMME_MAPPING_MISSING
EXCEPTION_REVIEW: PROGRAMME_MAPPING_AMBIGUOUS
EXCEPTION_REVIEW: SCHEME_NOT_APPROVED
EXCEPTION_REVIEW: SCHEME_OUTSIDE_VALIDITY
EXCEPTION_REVIEW: FILING_TIMELINE_EXPIRED
```

Each test asserts the decision status and exact first failing/review rule code.

Add re-evaluation history:

```ts
it("links re-evaluation without mutating the previous snapshot", () => {
  const previous = eligibilityDecisionFixture({
    id: "decision-1",
    version: 1,
  });
  const before = structuredClone(previous);
  const current = evaluateEligibility({
    ...eligibilityInputFixture(),
    decisionId: "decision-2",
    version: 2,
    previousDecision: previous,
  });
  expect(current.previousDecisionId).toBe("decision-1");
  expect(current.version).toBe(2);
  expect(previous).toEqual(before);
});
```

- [ ] **Step 6: Complete minimal implementation**

Stop evaluation only when further calculation is impossible, but preserve every rule result already evaluated. Missing or ambiguous configuration must never be converted to an inferred match.

- [ ] **Step 7: Verify engine**

Run:

```powershell
npm.cmd run test -- tests/unit/subvention/eligibility.test.ts
npm.cmd run test
npm.cmd run typecheck
```

Expected: all tests and type-check pass.

- [ ] **Step 8: Record checkpoint**

If Git is available:

```powershell
git add packages/domain/src/subvention/eligibility.ts packages/domain/src/index.ts tests/unit/subvention/eligibility.test.ts
git commit -m "feat: evaluate subvention eligibility"
```

---

### Task 7: Implement Deterministic Repository, Audit, and Seed Data

**Files:**

- Create: `packages/domain/src/subvention/repositories.ts`
- Modify: `packages/domain/src/index.ts`
- Create: `apps/web/features/subvention/data/seed.ts`
- Create: `apps/web/features/subvention/data/InMemorySubventionRepository.ts`
- Create: `apps/web/features/subvention/store/SubventionProvider.tsx`
- Create: `tests/unit/subvention/repository.test.ts`

**Interfaces:**

- Consumes: Repository contracts and domain functions from Tasks 2–6.
- Produces:

```ts
class InMemorySubventionRepository implements
  SchemeRepository,
  ProgrammeMappingRepository,
  PurchaseTransactionRepository,
  EligibilityDecisionRepository,
  AuditRepository

createDemoSubventionRepository(): InMemorySubventionRepository

useSubvention(): {
  snapshot: SubventionSnapshot;
  activeActor: Actor;
  setActiveActor(actor: Actor): void;
  submitScheme(id: string, remarks: string): Promise<void>;
  approveScheme(id: string, remarks: string): Promise<void>;
  evaluateTransaction(id: string): Promise<void>;
}
```

- [ ] **Step 1: Write failing repository workflow test**

```ts
it("submits and approves with different users and appends audit events", async () => {
  const repository = createRepositoryFixture();
  await repository.submitScheme(
    "scheme-version-draft",
    { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
    "Ready for approval",
  );
  await expect(
    repository.approveScheme(
      "scheme-version-draft",
      { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
      "Self approve",
    ),
  ).rejects.toThrow("Maker cannot approve own work");
  await repository.approveScheme(
    "scheme-version-draft",
    { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
    "Commercials verified",
  );
  const approved = await repository.getScheme("scheme-version-draft");
  expect(approved?.workflowStatus).toBe("APPROVED");
  expect(
    (await repository.listForEntity(
      "SchemeVersion",
      "scheme-version-draft",
    )).map((event) => event.action),
  ).toEqual(["SCHEME_SUBMITTED", "SCHEME_APPROVED"]);
});
```

Add tests proving:

- Approved payload cannot be saved as a draft.
- Eligibility evaluation appends version 2 and retains version 1.
- Quarantined import rows create audit events.
- Repository clock and ID factory make test output deterministic.

- [ ] **Step 2: Verify red**

Run:

```powershell
npm.cmd run test -- tests/unit/subvention/repository.test.ts
```

Expected: FAIL because repository does not exist.

- [ ] **Step 3: Implement repository with injected time and IDs**

Constructor:

```ts
interface RepositoryDependencies {
  now: () => string;
  nextId: (prefix: string) => string;
}

constructor(seed: SubventionSeed, dependencies: RepositoryDependencies)
```

Every mutation:

1. Reads current entity.
2. Calls a domain function.
3. Replaces or appends repository state.
4. Appends an `AuditEvent`.
5. Returns a structured clone so callers cannot mutate internal state.

- [ ] **Step 4: Create realistic deterministic seed**

Seed:

- Apple, Samsung, and Google as configuration values only.
- Six approved scheme versions and one draft.
- Eight employer programme mappings, including one submitted mapping.
- At least 30 transactions across eligible, expired, cancelled, duplicate-import, missing-mapping, and product-ineligible cases.
- Existing claimed IMEI and lease sets.
- At least eight audit events.
- Actors for Sales Ops Maker, Business Head Checker, Master Data Admin, Management Viewer, and Auditor.

No engine logic may compare OEM names or IDs.

- [ ] **Step 5: Implement provider refresh flow**

`SubventionProvider` owns one repository instance, loads a `SubventionSnapshot`, exposes role switching and command methods, and refreshes after each mutation. Errors are stored as typed `DomainIssue[]` or a user-facing action error.

- [ ] **Step 6: Verify green**

Run:

```powershell
npm.cmd run test -- tests/unit/subvention/repository.test.ts
npm.cmd run test
npm.cmd run typecheck
```

Expected: all pass.

- [ ] **Step 7: Record checkpoint**

If Git is available:

```powershell
git add packages/domain/src/subvention/repositories.ts packages/domain/src/index.ts apps/web/features/subvention tests/unit/subvention/repository.test.ts
git commit -m "feat: add deterministic subvention repository"
```

---

### Task 8: Build Platform Shell and Role-Aware Home

**Files:**

- Replace: `apps/web/components/AppShell.tsx`
- Create: `apps/web/components/shell/PlatformShell.tsx`
- Create: `apps/web/components/shell/GlobalRail.tsx`
- Create: `apps/web/components/shell/CommandBar.tsx`
- Create: `apps/web/components/shell/ModuleNavigation.tsx`
- Create: `apps/web/components/shared/AttentionLedger.tsx`
- Create: `apps/web/components/shared/StatusBadge.tsx`
- Create: `apps/web/components/shared/Money.tsx`
- Modify: `apps/web/app/layout.tsx`
- Replace: `apps/web/app/page.tsx`
- Create: `apps/web/app/subvention/layout.tsx`
- Create: `apps/web/features/subvention/control-desk/ControlDesk.tsx`
- Replace: `apps/web/app/subvention/page.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `tests/e2e/platform.spec.ts`

**Interfaces:**

- Consumes: `SubventionProvider`, `usePathname`, Smart EPP tokens.
- Produces: Approved hybrid shell, role-aware attention ledger, Subvention module navigation, Control Desk.

- [ ] **Step 1: Expand failing shell E2E**

Add:

```ts
test("role-aware home drills attention into source work", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "My Workbench" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Subvention" }).click();
  await expect(
    page.getByRole("heading", { name: "Subvention Control Desk" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Exceptions due within 7 days/ }).click();
  await expect(page).toHaveURL(/eligibility\?deadline=7d/);
});
```

- [ ] **Step 2: Verify red**

Run:

```powershell
npm.cmd run test:e2e -- tests/e2e/platform.spec.ts
```

Expected: FAIL because approved shell, workbench, and drill-down link do not exist.

- [ ] **Step 3: Implement shell**

Implement:

- 56px global rail with labelled tooltip and active indicator.
- 224px contextual module navigation when route belongs to a module.
- 56px translucent command bar.
- Main canvas with `id="main-content"` and keyboard skip link.
- `Command` dialog opened by `Ctrl+K` or `Meta+K`.
- Role control using seeded actors.
- Responsive collapse below 1024px without hiding core navigation.

Use Lucide icons only. Add `aria-label` to icon-only controls.

- [ ] **Step 4: Implement role-aware home and Control Desk**

`AttentionLedger` receives actual seed-derived rows:

```ts
interface AttentionItem {
  id: string;
  title: string;
  module: "ONBOARDING" | "FORECLOSURE" | "SUBVENTION";
  owner: string;
  dueDate: string;
  severity: "INFO" | "ATTENTION" | "CRITICAL";
  financialImpactPaise: number;
  href: string;
}
```

Control Desk signals derive from repository state and link to filtered destinations. Do not hardcode displayed counts separately from row data.

- [ ] **Step 5: Add approved motion**

Use CSS for rail, hover, and focus. Use GSAP only when contextual navigation enters:

```ts
gsap.fromTo(
  panel,
  { opacity: 0, x: -12 },
  { opacity: 1, x: 0, duration: MOTION.enter, ease: MOTION.panelEase },
);
```

Skip tween when `matchMedia("(prefers-reduced-motion: reduce)").matches`.

- [ ] **Step 6: Verify green**

Run:

```powershell
npm.cmd run test:e2e -- tests/e2e/platform.spec.ts
npm.cmd run lint
npm.cmd run typecheck
```

Expected: all pass.

- [ ] **Step 7: Record checkpoint**

If Git is available:

```powershell
git add apps/web tests/e2e/platform.spec.ts
git commit -m "feat: build Smart EPP control desk shell"
```

---

### Task 9: Build Scheme and Programme Workspace

**Files:**

- Create: `apps/web/components/shared/AdaptiveSplitWorkspace.tsx`
- Create: `apps/web/components/shared/AuditTimeline.tsx`
- Create: `apps/web/components/shared/EmptyState.tsx`
- Create: `apps/web/features/subvention/schemes/SchemeProgrammeWorkspace.tsx`
- Create: `apps/web/app/subvention/schemes/page.tsx`
- Create: `tests/e2e/subvention-schemes.spec.ts`

**Interfaces:**

- Consumes: Provider scheme/mapping lists and workflow commands.
- Produces: Filterable master tables, adaptive detail, submit/approve flows, version and audit views.

- [ ] **Step 1: Write failing scheme workflow E2E**

```ts
test("scheme uses maker-checker and locks approved version", async ({ page }) => {
  await page.goto("/subvention/schemes");
  await page.getByRole("row", { name: /APL-CORP-Q3-26.*Draft/ }).click();
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await page.getByLabel("Submission remarks").fill("Commercial terms checked");
  await page.getByRole("button", { name: "Submit scheme" }).click();
  await expect(page.getByText("Submitted")).toBeVisible();

  await page.getByRole("button", { name: "Active role" }).click();
  await page.getByRole("option", { name: "Business Head Checker" }).click();
  await page.getByRole("button", { name: "Approve scheme" }).click();
  await page.getByLabel("Approval remarks").fill("Approved against BH-2026-014");
  await page.getByRole("button", { name: "Confirm approval" }).click();

  await expect(page.getByText("Approved")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit scheme" }))
    .toBeDisabled();
  await expect(page.getByText("SCHEME_APPROVED")).toBeVisible();
});
```

Add a self-approval test that expects the message `Maker cannot approve own work`.

- [ ] **Step 2: Verify red**

Run:

```powershell
npm.cmd run test:e2e -- tests/e2e/subvention-schemes.spec.ts
```

Expected: FAIL because workspace does not exist.

- [ ] **Step 3: Implement adaptive workspace**

`AdaptiveSplitWorkspace` accepts:

```ts
interface AdaptiveSplitWorkspaceProps {
  listLabel: string;
  selectedLabel?: string;
  list: React.ReactNode;
  detail: React.ReactNode;
  isOpen: boolean;
  onClose(): void;
  onExpand?(): void;
}
```

Desktop uses a 52/48 split. Below 1024px, detail becomes a `Sheet`. Focus moves to the detail heading and returns to the selected row on close.

- [ ] **Step 4: Implement master list and detail**

Provide:

- Scheme/Programme segmented view.
- Search and status/OEM/effective-date filters.
- Semantic `Table`.
- Frozen code/name cells using CSS sticky positioning.
- Detail tabs: Summary, Configuration, Products, Versions, Approvals, Audit.
- Submit/approve/return/reject dialogs.
- Disabled mutation actions for approved versions.
- Validation summary linked to fields.
- New-version action that creates a draft derived from approved data through repository command.

- [ ] **Step 5: Implement mapping conflict presentation**

The Programme view displays conflict issues from domain resolution. Conflict rows show icon, text, financial-impact state `Not evaluated`, and recovery link `Review validity and product scope`.

- [ ] **Step 6: Verify green**

Run:

```powershell
npm.cmd run test:e2e -- tests/e2e/subvention-schemes.spec.ts
npm.cmd run lint
npm.cmd run typecheck
```

Expected: all pass.

- [ ] **Step 7: Record checkpoint**

If Git is available:

```powershell
git add apps/web/components/shared apps/web/features/subvention/schemes apps/web/app/subvention/schemes tests/e2e/subvention-schemes.spec.ts
git commit -m "feat: add scheme and programme control workspace"
```

---

### Task 10: Build Purchase Repository and Eligibility Workspace

**Files:**

- Create: `apps/web/components/shared/RuleTrace.tsx`
- Create: `apps/web/features/subvention/transactions/PurchaseRepositoryWorkspace.tsx`
- Create: `apps/web/features/subvention/eligibility/EligibilityWorkspace.tsx`
- Create: `apps/web/app/subvention/transactions/page.tsx`
- Create: `apps/web/app/subvention/eligibility/page.tsx`
- Create: `tests/e2e/subvention-eligibility.spec.ts`

**Interfaces:**

- Consumes: `PurchaseTransaction`, `EligibilityDecision`, import result, provider evaluation commands.
- Produces: Dense purchase grid, deterministic LMS import summary, eligibility queue, rule trace, history comparison.

- [ ] **Step 1: Write failing repository and eligibility E2E**

```ts
test("filters purchases and opens adaptive eligibility evidence", async ({ page }) => {
  await page.goto("/subvention/transactions");
  await page.getByPlaceholder("Search lease, IMEI, invoice, employer").fill(
    "351234567890123",
  );
  await page.getByRole("row", { name: /351234567890123/ }).click();
  await expect(
    page.getByRole("heading", { name: /Transaction evidence/ }),
  ).toBeVisible();
  await expect(page.getByText("Invoice value")).toBeVisible();
});

test("evaluates a transaction and shows ordered rule trace", async ({ page }) => {
  await page.goto("/subvention/eligibility");
  await page.getByRole("row", { name: /LES-1001/ }).click();
  await page.getByRole("button", { name: "Evaluate eligibility" }).click();
  await expect(page.getByText("Eligible", { exact: true })).toBeVisible();
  await expect(page.getByText("Programme mapping resolved")).toBeVisible();
  await expect(page.getByText("Scheme effective")).toBeVisible();
  await expect(page.getByText("Expected subvention")).toBeVisible();
});

test("shows an expired transaction as exception review", async ({ page }) => {
  await page.goto("/subvention/eligibility?status=EXCEPTION_REVIEW");
  await page.getByRole("row", { name: /Filing timeline expired/ }).click();
  await expect(page.getByText("Authorised override required")).toBeVisible();
});
```

- [ ] **Step 2: Verify red**

Run:

```powershell
npm.cmd run test:e2e -- tests/e2e/subvention-eligibility.spec.ts
```

Expected: FAIL because routes and workspaces do not exist.

- [ ] **Step 3: Implement Purchase Repository**

Grid columns:

```text
Lease ID
IMEI
Employer
Employee
Product
Invoice
Invoice date
Invoice value
Base value
Programme
Lease status
Eligibility status
Filing deadline
Expected amount
```

Provide search, status/OEM/employer/deadline filters, sortable headers, sticky identifiers, column visibility, and export of filtered rows to CSV.

The `Import transactions` sheet runs the deterministic LMS seed import and renders totals plus a quarantined-row table with issue code and recovery action.

- [ ] **Step 4: Implement Rule Trace**

`RuleTrace` receives:

```ts
interface RuleTraceProps {
  results: RuleResult[];
}
```

Render ordered semantic list items with:

- PASS check icon and text
- FAIL critical icon and recovery text
- REVIEW exception icon and recovery text
- Source entity link where present

No status relies on colour alone.

- [ ] **Step 5: Implement Eligibility Workspace**

Queue filters:

- Awaiting evaluation
- Eligible
- Ineligible
- Exception review
- Due in 15 days
- Due in 7 days
- Expired

Detail:

- Transaction summary
- Applied mapping and scheme version
- Integer-paise calculation rendered as INR
- Filing deadline and remaining days
- Rule trace
- Previous/current decision comparison
- Audit timeline

Bulk evaluation processes selected rows independently and reports count and value by outcome.

- [ ] **Step 6: Add approved inspector motion**

Use GSAP `fromTo` on detail-pane entry and expansion only. Do not animate table rows, numbers, sorting, filtering, or bulk result counts. Reduced-motion path must render final state immediately.

- [ ] **Step 7: Verify green**

Run:

```powershell
npm.cmd run test:e2e -- tests/e2e/subvention-eligibility.spec.ts
npm.cmd run lint
npm.cmd run typecheck
```

Expected: all pass.

- [ ] **Step 8: Record checkpoint**

If Git is available:

```powershell
git add apps/web/components/shared/RuleTrace.tsx apps/web/features/subvention/transactions apps/web/features/subvention/eligibility apps/web/app/subvention/transactions apps/web/app/subvention/eligibility tests/e2e/subvention-eligibility.spec.ts
git commit -m "feat: add purchase and eligibility workspaces"
```

---

### Task 11: Normalise Prisma Contract and Complete Verification

**Files:**

- Replace: `prisma/schema.prisma`
- Create: `tests/unit/prisma-schema.test.ts`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-28-smart-epp-subvention-vertical-slice.md`

**Interfaces:**

- Consumes: Approved domain model.
- Produces: Future persistence contract containing OEM, Product, Employer, Programme, Scheme, SchemeVersion, EmployerProgrammeMapping, EmployerProgrammeMappingVersion, PurchaseTransaction, EligibilityDecision, EligibilityRuleResult, EligibilityRuleSnapshot, Exception, and AuditEvent.

- [ ] **Step 1: Write failing schema-contract test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Prisma persistence contract", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const requiredModels = [
    "Oem",
    "Product",
    "Employer",
    "Programme",
    "Scheme",
    "SchemeVersion",
    "EmployerProgrammeMapping",
    "EmployerProgrammeMappingVersion",
    "PurchaseTransaction",
    "EligibilityDecision",
    "EligibilityRuleResult",
    "EligibilityRuleSnapshot",
    "Exception",
    "AuditEvent",
  ];

  it.each(requiredModels)("contains model %s", (model) => {
    expect(schema).toMatch(new RegExp(`model\\s+${model}\\s*\\{`));
  });

  it("stores purchase money as integer paise", () => {
    expect(schema).toContain("invoiceValuePaise BigInt");
    expect(schema).toContain("baseValuePaise BigInt");
  });

  it("enforces IMEI and lease uniqueness", () => {
    expect(schema).toMatch(/imei\\s+String\\s+@unique/);
    expect(schema).toMatch(/leaseId\\s+String\\s+@unique/);
  });
});
```

- [ ] **Step 2: Verify red**

Run:

```powershell
npm.cmd run test -- tests/unit/prisma-schema.test.ts
```

Expected: FAIL because required models do not exist.

- [ ] **Step 3: Implement normalised schema**

Use:

- Separate logical and version tables for Scheme and EmployerProgrammeMapping.
- `BigInt` for paise amounts.
- `Int` for basis points.
- JSON only for immutable prior/new audit payloads and explicitly versioned snapshot source arrays.
- Relations from decisions to transactions, rule results, and one snapshot.
- Unique constraints for scheme code, scheme/version, mapping/version, IMEI, lease ID, and source-row key.
- DateTime fields for effective dates and audit timestamps.

Do not add live migration files or require `DATABASE_URL` during application startup.

- [ ] **Step 4: Verify schema contract**

Run:

```powershell
npm.cmd run test -- tests/unit/prisma-schema.test.ts
npm.cmd run test
```

Expected: all unit tests pass.

- [ ] **Step 5: Update README**

Document:

```text
npm install
npx playwright install chromium
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

State that the current slice uses deterministic adapters and the Prisma schema is a future persistence contract.

- [ ] **Step 6: Run accessibility and interaction checks**

In Playwright:

- Tab from skip link to command bar and navigation.
- Open and close a record detail using keyboard.
- Confirm focus returns to selected row.
- Emulate reduced motion and confirm detail is visible without waiting on animation.
- Confirm status cells contain visible text in addition to colour.

Add failures to the relevant E2E spec before fixing them.

- [ ] **Step 7: Run final quality gates**

Run fresh, sequential commands:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run test:e2e
npm.cmd run build
```

Expected:

- Lint exits `0` with no warnings.
- Type-check exits `0`.
- Unit suite reports zero failures.
- E2E suite reports zero failures.
- Production build exits `0`.

- [ ] **Step 8: Review acceptance criteria**

Read the approved design spec line by line and verify all 15 acceptance criteria against code, UI, tests, and fresh command evidence. Record any unmet criterion before making a completion claim.

- [ ] **Step 9: Record final checkpoint**

If Git is available:

```powershell
git add prisma/schema.prisma tests/unit/prisma-schema.test.ts README.md docs/superpowers
git commit -m "feat: complete subvention vertical slice"
```

If Git remains unavailable, report that implementation is complete but uncommitted and provide the exact changed-file list.
