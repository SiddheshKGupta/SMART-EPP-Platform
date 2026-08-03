# Graph Report - Smart_EPP_Operating_Platform  (2026-08-03)

## Corpus Check
- 170 files · ~77,457 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1260 nodes · 2853 edges · 114 communities (72 shown, 42 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.74)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a20b3d59`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- MasterRecord
- claims.ts
- ManagementOverview.tsx
- scripts
- RepositoryDependencies
- MasterDataWorkbench.tsx
- InMemorySubventionRepository.ts
- SubventionProvider
- dependencies
- operationsReadModel.ts
- OperationsWorkbench.tsx
- data/seed.ts
- InMemorySubventionRepository
- compilerOptions
- PlatformShell.tsx
- SchemeProgrammeWorkspace.tsx
- PurchaseRepositoryWorkspace.tsx
- EligibilityDecision
- components.json
- purchase-import.ts
- sheet.tsx
- EmployerProgrammeMappingVersion
- types.ts
- schemas.ts
- useSubvention
- eligibility.ts
- SchemeProgrammeWorkspace
- Actor
- RouteContractPage.tsx
- controlDeskReadModel.ts
- compilerOptions
- programme-mapping.ts
- domain/package.json
- MasterHierarchy.tsx
- domain/src/index.ts
- repository.test.ts
- app/page.tsx
- ui/package.json
- eligibility.test.ts
- transactionCsv.ts
- subvention/layout.tsx
- lib/seed.ts
- platform.spec.ts
- motion.ts
- next.config.ts
- next-env.d.ts
- postcss.config.mjs
- ui/src/index.ts
- Smart EPP Subvention Vertical Slice Design
- Subvention Smart Merger Design
- EligibilityWorkspace.tsx
- File Structure
- File Structure
- devDependencies
- Smart EPP Design System
- ClaimBatch
- Subvention client data contract
- web/package.json
- AGENTS.md
- Approval April 2026 — verified source summary
- Approval May 2026 — verified source summary
- Final MIS April 2026 — verified source summary
- Smart EPP FRS — Subvention Management
- purchase-evidence.test.ts
- Smart EPP — Subvention Control Centre
- Conversation Context
- Platform Vision
- Radius Subvention Data — verified source summary
- 2026-07-29
- createDemoSubventionSeed
- Design System
- Source Index
- clsx
- lucide-react
- next
- radix-ui
- react
- react-dom
- shadcn
- tailwind-merge
- tailwindcss
- zod
- acceptance-criteria.md
- connect-business-context.md
- data-dictionary.md
- domain-model.md
- foreclosure-business-rules.md
- information-architecture.md
- onboarding-business-rules.md
- open-decisions.md
- roles-and-permissions.md
- shared-controls.md
- client-onboarding-framework.md
- credit-policy.md
- enterprise-rcsa.md
- foreclosure-sop.md
- monthly-governance-tracker.md
- prototype-reference.md
- subvention-operating-model.md
- workflow-model.md
- cross-cutting-principles.md

## God Nodes (most connected - your core abstractions)
1. `InMemorySubventionRepository` - 90 edges
2. `cn()` - 90 edges
3. `Actor` - 82 edges
4. `SchemeVersion` - 44 edges
5. `ClaimBatch` - 42 edges
6. `EmployerProgrammeMappingVersion` - 42 edges
7. `clone()` - 39 edges
8. `MasterRecord` - 37 edges
9. `SubventionProvider()` - 36 edges
10. `EligibilityDecision` - 36 edges

## Surprising Connections (you probably didn't know these)
- `ClaimPreparation()` --indirect_call--> `decision()`  [INFERRED]
  apps/web/features/subvention/claims/ClaimPreparation.tsx → tests/unit/subvention/claims.test.ts
- `ControlDeskReadModel` --references--> `QuarantinedPurchaseImportRow`  [EXTRACTED]
  apps/web/features/subvention/control-desk/controlDeskReadModel.ts → packages/domain/src/subvention/purchase-import.ts
- `ControlDeskReadModelOptions` --references--> `Actor`  [EXTRACTED]
  apps/web/features/subvention/control-desk/controlDeskReadModel.ts → packages/domain/src/subvention/types.ts
- `selectControlDeskReadModel()` --indirect_call--> `decision()`  [INFERRED]
  apps/web/features/subvention/control-desk/controlDeskReadModel.ts → tests/unit/subvention/claims.test.ts
- `resolveProgrammeMapping()` --indirect_call--> `mapping()`  [INFERRED]
  packages/domain/src/subvention/programme-mapping.ts → apps/web/features/subvention/data/seed.ts

## Import Cycles
- None detected.

## Communities (114 total, 42 thin omitted)

### Community 0 - "cn"
Cohesion: 0.07
Nodes (46): CommandRoute, routes, AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader() (+38 more)

### Community 1 - "MasterRecord"
Cohesion: 0.07
Nodes (32): MASTER_DEFINITION_BY_KIND, MasterDefinition, MasterFieldDefinition, MasterFieldType, MasterRecordFormProps, allowedMasterActions, catalogueKey, DistributorMasterRecord (+24 more)

### Community 2 - "claims.ts"
Cohesion: 0.11
Nodes (25): addClaimReconciliationAdjustment(), adjustedApprovedAmountPaise(), approveClaimBatch(), CLAIM_BATCH_STATUSES, ClaimBatchLine, ClaimBatchStatus, ClaimEvidenceSnapshot, ClaimReconciliationAdjustment (+17 more)

### Community 3 - "ManagementOverview.tsx"
Cohesion: 0.09
Nodes (43): Page(), roleFocus(), roleLabel(), ActiveDrilldown, ManagementOverview(), ManagementOverviewProps, monthLabel(), phaseLabel() (+35 more)

### Community 4 - "scripts"
Cohesion: 0.10
Nodes (19): devDependencies, @playwright/test, typescript, vitest, typescript, name, private, scripts (+11 more)

### Community 5 - "RepositoryDependencies"
Cohesion: 0.21
Nodes (5): transaction(), assertMasterMutationAuthorized(), assertSubventionCommandAuthorized(), transitionMaster(), RepositoryDependencies

### Community 6 - "MasterDataWorkbench.tsx"
Cohesion: 0.18
Nodes (18): Input(), Label(), Select(), SelectContent(), SelectItem(), SelectTrigger(), SelectValue(), ResponseDraft (+10 more)

### Community 7 - "InMemorySubventionRepository.ts"
Cohesion: 0.11
Nodes (29): actionErrorFrom(), domainIssuesFrom(), isDomainIssue(), SubventionActionError, SubventionCommandResult, SubventionContext, ClaimAccountingInput, ClaimAdjustmentInput (+21 more)

### Community 9 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, class-variance-authority, cmdk, gsap, postcss, @smart-epp/domain, @tailwindcss/postcss, tw-animate-css (+7 more)

### Community 10 - "operationsReadModel.ts"
Cohesion: 0.06
Nodes (42): outcomeCopy, RuleTrace(), RuleTraceProps, sourceHref(), EvidenceSummary(), label(), tone(), actionFor() (+34 more)

### Community 11 - "OperationsWorkbench.tsx"
Cohesion: 0.28
Nodes (12): inr, Money(), Table(), TableBody(), TableCell(), TableHead(), TableHeader(), TableRow() (+4 more)

### Community 12 - "data/seed.ts"
Cohesion: 0.06
Nodes (26): actors, auditEvents, cancelledTransactions, claimedTransactions, controlledInvoiceReferences, demoSeed, duplicateImportInput, duplicateImportTransaction (+18 more)

### Community 13 - "InMemorySubventionRepository"
Cohesion: 0.15
Nodes (4): clone(), InMemorySubventionRepository, transitionClaimFinancials(), AuditEvent

### Community 14 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+19 more)

### Community 15 - "PlatformShell.tsx"
Cohesion: 0.10
Nodes (18): metadata, AppShell(), actorLabel(), CommandBar(), GlobalRail(), RailItem, railItems, isCurrent() (+10 more)

### Community 16 - "SchemeProgrammeWorkspace.tsx"
Cohesion: 0.12
Nodes (18): EmptyState(), AlertDialog(), DialogFooter(), Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger() (+10 more)

### Community 17 - "PurchaseRepositoryWorkspace.tsx"
Cohesion: 0.12
Nodes (17): Popover(), PopoverContent(), PopoverDescription(), PopoverHeader(), PopoverTitle(), PopoverTrigger(), ColumnKey, columns (+9 more)

### Community 18 - "EligibilityDecision"
Cohesion: 0.13
Nodes (9): ControlDeskTransactionReadModel, QueueRow, CreateClaimBatchInput, AuditRepository, EligibilityDecisionRepository, PurchaseTransactionRepository, SubventionRepository, EligibilityDecision (+1 more)

### Community 19 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 20 - "purchase-import.ts"
Cohesion: 0.20
Nodes (16): MappingConflict, DomainIssue, issue(), buildPurchaseSourceRowKey(), duplicateIssue(), duplicateIssues(), importControlIssues(), inputIssue() (+8 more)

### Community 21 - "sheet.tsx"
Cohesion: 0.16
Nodes (11): AdaptiveSplitWorkspace(), AdaptiveSplitWorkspaceProps, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+3 more)

### Community 23 - "types.ts"
Cohesion: 0.09
Nodes (22): BulkResult, allowed, commandRoles, MasterAction, MasterMutationAction, statusForAction, SubventionCommandAction, VersionedMaster (+14 more)

### Community 24 - "schemas.ts"
Cohesion: 0.18
Nodes (7): calculationBasisSchema, isoDateSchema, nonNegativeIntegerSchema, positiveIntegerSchema, programmeMappingDraftSchema, purchaseSourceEvidenceSchema, schemeDraftSchema

### Community 25 - "useSubvention"
Cohesion: 0.12
Nodes (21): SemanticStatus, StatusBadge(), tone, Badge(), badgeVariants, Button(), buttonVariants, ClaimLifecycleTracker() (+13 more)

### Community 26 - "eligibility.ts"
Cohesion: 0.31
Nodes (13): addDaysIso(), dateIsWithinInclusive(), intervalsOverlapInclusive(), parseIsoDate(), assertDecisionChain(), evaluateEligibility(), failed(), isValidDateOnly() (+5 more)

### Community 27 - "SchemeProgrammeWorkspace"
Cohesion: 0.25
Nodes (4): ProgrammeMappingWorkspaceSearchParams, SchemeWorkspaceSearchParams, mapping(), SchemeProgrammeWorkspace()

### Community 28 - "Actor"
Cohesion: 0.23
Nodes (4): EvaluateEligibilityInput, SchemeRepository, Actor, SchemeVersion

### Community 29 - "RouteContractPage.tsx"
Cohesion: 0.27
Nodes (4): filterEntries(), RouteContractPage(), RouteFilters, RouteSearchParams

### Community 30 - "controlDeskReadModel.ts"
Cohesion: 0.36
Nodes (7): ControlDeskReadModel, ControlDeskReadModelOptions, DeadlineState, deadlineStateFor(), duplicateValues(), latestDecision(), selectControlDeskReadModel()

### Community 31 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+4 more)

### Community 32 - "programme-mapping.ts"
Cohesion: 0.16
Nodes (14): assertProgrammeMappingApprovalValid(), collectPrecedenceSources(), mappingIssue(), mappingProductScope(), MappingResolution, optionalConstraintOverlaps(), productScopesOverlap(), programmeMappingMatchesTransaction() (+6 more)

### Community 33 - "domain/package.json"
Cohesion: 0.18
Nodes (10): dependencies, zod, zod, main, name, private, scripts, typecheck (+2 more)

### Community 34 - "MasterHierarchy.tsx"
Cohesion: 0.22
Nodes (5): commercialPath, HierarchyNode, MasterHierarchy(), programmePath, transactionPath

### Community 35 - "domain/src/index.ts"
Cohesion: 0.29
Nodes (6): MasterHistoryInspector(), assertBatchMutable(), assertMakerChecker(), assertUniqueDeviceIdentifier(), assertWithinClaimTimeline(), PurchaseTransactionSchema

### Community 36 - "repository.test.ts"
Cohesion: 0.31
Nodes (6): approvedMasterFields(), mappingFixture(), purchaseFixture(), purchaseInputFixture(), schemeFixture(), seedFixture()

### Community 37 - "app/page.tsx"
Cohesion: 0.39
Nodes (7): addDays(), expiredTransactionItems(), ownerForRole(), Page(), AttentionItem, AttentionLedger(), formatDueDate()

### Community 38 - "ui/package.json"
Cohesion: 0.33
Nodes (5): main, name, private, type, version

### Community 39 - "eligibility.test.ts"
Cohesion: 0.53
Nodes (4): eligibilityInputFixture(), mappingFixture(), purchaseFixture(), schemeFixture()

### Community 40 - "transactionCsv.ts"
Cohesion: 0.53
Nodes (4): buildTransactionCsv(), escapeCsvCell(), headers, TransactionCsvRecord

### Community 60 - "Smart EPP Subvention Vertical Slice Design"
Cohesion: 0.04
Nodes (45): 10.1 Control Desk, 10.2 Schemes & Programmes, 10.3 Purchase Repository, 10.4 Eligibility Operations, 10. Subvention Screens, 11. Error and Exception Model, 12. Audit Model, 13. Motion and Accessibility (+37 more)

### Community 61 - "Subvention Smart Merger Design"
Cohesion: 0.09
Nodes (22): 10. Acceptance Criteria, 1. Objective, 2. Product Structure, 3. Role Model, 4. Architecture, 5. Data Flow, 6. Error and Exception Handling, 7. Delivery Sequence (+14 more)

### Community 62 - "EligibilityWorkspace.tsx"
Cohesion: 0.17
Nodes (14): EligibilitySearchParams, AuditTimeline(), daysBetween(), eligibilityHref(), EligibilityWorkspace(), evaluatePreview(), filterFromQuery(), filterLabels (+6 more)

### Community 63 - "File Structure"
Cohesion: 0.11
Nodes (17): Domain, File Structure, Global Constraints, Smart EPP Subvention Vertical Slice Implementation Plan, Task 10: Build Purchase Repository and Eligibility Workspace, Task 11: Normalise Prisma Contract and Complete Verification, Task 1: Repair Tooling and Establish UI Foundations, Task 2: Define Subvention Vocabulary, Schemas, Money, and Dates (+9 more)

### Community 64 - "File Structure"
Cohesion: 0.13
Nodes (14): Application, Domain, File Structure, Global Constraints, Routes, Standalone Subvention Smart Merger Implementation Plan, Task 1: Stabilise Current Subvention Control Patch, Task 2: Add Typed Master Data Contracts and Repository CRUD (+6 more)

### Community 65 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, eslint-config-next, @types/node, @types/react, @types/react-dom, typescript, typescript (+5 more)

### Community 66 - "Smart EPP Design System"
Cohesion: 0.15
Nodes (12): Accessibility and responsiveness, Colour, Delivery checklist, Design dials, Design read, Foundation, Motion, Prohibited patterns (+4 more)

### Community 68 - "Subvention client data contract"
Cohesion: 0.22
Nodes (8): Authority and handling, Canonical transaction import, Import and eligibility controls, Required normalisation, Rule evidence, Seed-data direction, Source populations, Subvention client data contract

### Community 69 - "web/package.json"
Cohesion: 0.25
Nodes (7): name, private, scripts, build, dev, lint, typecheck

### Community 70 - "AGENTS.md"
Cohesion: 0.33
Nodes (4): Domain rules, Mandatory direction, Mission, Quality gates

### Community 71 - "Approval April 2026 — verified source summary"
Cohesion: 0.33
Nodes (5): Approval April 2026 — verified source summary, Commercial evidence, Implementation implications, Rejection evidence, Verified population

### Community 72 - "Approval May 2026 — verified source summary"
Cohesion: 0.33
Nodes (5): Approval May 2026 — verified source summary, Commercial evidence, Implementation implications, Outcome evidence, Verified population

### Community 73 - "Final MIS April 2026 — verified source summary"
Cohesion: 0.33
Nodes (5): April response population, Final MIS April 2026 — verified source summary, Historical rejection/representation evidence, Implementation implications, Workbook structure

### Community 74 - "Smart EPP FRS — Subvention Management"
Cohesion: 0.33
Nodes (5): Critical rules, Flow, Functional areas, Objective, Smart EPP FRS — Subvention Management

### Community 75 - "purchase-evidence.test.ts"
Cohesion: 0.33
Nodes (4): purchaseTransactionInputSchema, configuredMapping, importContext, masterData

### Community 76 - "Smart EPP — Subvention Control Centre"
Cohesion: 0.33
Nodes (5): Current product scope, Principles, Smart EPP — Subvention Control Centre, Start, Structure

### Community 77 - "Conversation Context"
Cohesion: 0.40
Nodes (4): Conversation Context, Main areas, Technology, UI direction

### Community 78 - "Platform Vision"
Cohesion: 0.40
Nodes (4): Initial modules, Platform Vision, Shared layer, User outcomes

### Community 79 - "Radius Subvention Data — verified source summary"
Cohesion: 0.40
Nodes (4): Implementation implications, Radius Subvention Data — verified source summary, Rate and basis combinations, Verified population

### Community 80 - "2026-07-29"
Cohesion: 0.40
Nodes (4): 2026-07-29, Observation 1: Green gates did not prove cross-master resolution integrity, Observation 2: Graph builder backend selection must fail over to code-only mode, Skill Observation Log

### Community 81 - "createDemoSubventionSeed"
Cohesion: 0.67
Nodes (3): createDemoSubventionRepository(), createDemoSubventionSeed(), modelForSeed()

## Knowledge Gaps
- **393 isolated node(s):** `metadata`, `EligibilitySearchParams`, `metadata`, `ProgrammeMappingWorkspaceSearchParams`, `SchemeWorkspaceSearchParams` (+388 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `MasterDataWorkbench.tsx`, `OperationsWorkbench.tsx`, `PlatformShell.tsx`, `SchemeProgrammeWorkspace.tsx`, `PurchaseRepositoryWorkspace.tsx`, `sheet.tsx`, `useSubvention`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `Actor` connect `Actor` to `MasterRecord`, `claims.ts`, `ClaimBatch`, `RepositoryDependencies`, `InMemorySubventionRepository.ts`, `SubventionProvider`, `operationsReadModel.ts`, `data/seed.ts`, `InMemorySubventionRepository`, `PlatformShell.tsx`, `EligibilityDecision`, `EmployerProgrammeMappingVersion`, `types.ts`, `EligibilityWorkspace.tsx`, `eligibility.ts`, `controlDeskReadModel.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `InMemorySubventionRepository` connect `InMemorySubventionRepository` to `MasterRecord`, `ClaimBatch`, `repository.test.ts`, `RepositoryDependencies`, `InMemorySubventionRepository.ts`, `data/seed.ts`, `EligibilityDecision`, `EmployerProgrammeMappingVersion`, `Actor`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `metadata`, `EligibilitySearchParams`, `metadata` to the rest of the system?**
  _393 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.06610259122157588 - nodes in this community are weakly interconnected._
- **Should `MasterRecord` be split into smaller, more focused modules?**
  _Cohesion score 0.07457627118644068 - nodes in this community are weakly interconnected._
- **Should `claims.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._