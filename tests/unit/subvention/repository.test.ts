import { describe, expect, it } from "vitest";
import type {
  AuditEvent,
  EligibilityDecision,
  EmployerProgrammeMappingVersion,
  PurchaseTransaction,
  PurchaseTransactionInput,
  RepositoryDependencies,
  SchemeVersion,
  SubventionSeed,
} from "../../../packages/domain/src";
import { InMemorySubventionRepository } from "../../../apps/web/features/subvention/data/InMemorySubventionRepository";
import { createDemoSubventionRepository } from "../../../apps/web/features/subvention/data/seed";

function schemeFixture(
  overrides: Partial<SchemeVersion> = {},
): SchemeVersion {
  return {
    id: "scheme-version-draft",
    schemeId: "scheme-1",
    version: 1,
    code: "CORP-H2-26",
    name: "Corporate H2",
    oemId: "oem-1",
    settlementCounterpartyType: "DISTRIBUTOR",
    calculationBasis: "INVOICE_VALUE",
    rateBps: 350,
    claimTimelineDays: 90,
    priority: 10,
    eligibleProductIds: ["product-1"],
    effectiveFrom: "2026-07-01",
    effectiveTo: "2026-12-31",
    requiredDocumentCodes: ["PURCHASE_INVOICE"],
    workflowStatus: "DRAFT",
    makerUserId: "maker-1",
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function mappingFixture(
  overrides: Partial<EmployerProgrammeMappingVersion> = {},
): EmployerProgrammeMappingVersion {
  return {
    id: "mapping-version-1",
    mappingId: "mapping-1",
    version: 1,
    employerId: "employer-1",
    programmeId: "programme-1",
    oemId: "oem-1",
    schemeVersionId: "scheme-version-approved",
    launchDate: "2026-07-01",
    effectiveFrom: "2026-07-01",
    effectiveTo: "2026-12-31",
    workflowStatus: "APPROVED",
    makerUserId: "maker-1",
    checkerUserId: "checker-1",
    approvedAt: "2026-06-30T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function purchaseFixture(
  overrides: Partial<PurchaseTransaction> = {},
): PurchaseTransaction {
  return {
    id: "purchase-1",
    leaseId: "lease-1",
    lotId: "lot-1",
    employeeId: "employee-1",
    employerId: "employer-1",
    programmeId: "programme-1",
    oemId: "oem-1",
    productId: "product-1",
    imei: "123456789012345",
    purchaseOrderNumber: "PO-1",
    invoiceNumber: "INV-1",
    invoiceDate: "2026-07-15",
    invoiceValuePaise: 8_250_000,
    baseValuePaise: 7_000_000,
    gstAmountPaise: 1_250_000,
    resellerId: "reseller-1",
    leaseStatus: "ACTIVE",
    sourceSystem: "LMS",
    importedAt: "2026-07-15T00:00:00.000Z",
    ...overrides,
  };
}

function purchaseInputFixture(
  overrides: Partial<PurchaseTransactionInput> = {},
): PurchaseTransactionInput {
  const transaction = purchaseFixture(overrides);
  return {
    leaseId: transaction.leaseId,
    lotId: transaction.lotId,
    employeeId: transaction.employeeId,
    employerId: transaction.employerId,
    programmeId: transaction.programmeId,
    oemId: transaction.oemId,
    productId: transaction.productId,
    imei: transaction.imei,
    purchaseOrderNumber: transaction.purchaseOrderNumber,
    invoiceNumber: transaction.invoiceNumber,
    invoiceDate: transaction.invoiceDate,
    invoiceValuePaise: transaction.invoiceValuePaise,
    baseValuePaise: transaction.baseValuePaise,
    gstAmountPaise: transaction.gstAmountPaise,
    resellerId: transaction.resellerId,
    distributorId: transaction.distributorId,
    leaseStatus: transaction.leaseStatus,
    sourceSystem: transaction.sourceSystem,
  };
}

function eligibilityDecisionFixture(
  overrides: Partial<EligibilityDecision> = {},
): EligibilityDecision {
  return {
    id: "decision-1",
    transactionId: "purchase-1",
    version: 1,
    status: "ELIGIBLE",
    expectedAmountPaise: 288_750,
    filingDeadline: "2026-10-13",
    evaluatedAt: "2026-07-27T10:00:00.000Z",
    evaluatedBy: "maker-1",
    ruleSnapshot: {
      employerProgrammeMappingVersionId: "mapping-version-1",
      schemeVersionId: "scheme-version-approved",
      calculationBasis: "INVOICE_VALUE",
      rateBps: 350,
      claimTimelineDays: 90,
      eligibleProductIds: ["product-1"],
      settlementCounterpartyType: "DISTRIBUTOR",
      precedenceSources: ["SchemeVersion:scheme-version-approved"],
    },
    ruleResults: [],
    ...overrides,
  };
}

function auditEventFixture(
  overrides: Partial<AuditEvent> = {},
): AuditEvent {
  return {
    id: "audit-existing",
    entityType: "SchemeVersion",
    entityId: "scheme-version-approved",
    action: "SCHEME_APPROVED",
    actor: { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
    occurredAt: "2026-06-30T00:00:00.000Z",
    remarks: "Approved",
    ...overrides,
  };
}

function seedFixture(overrides: Partial<SubventionSeed> = {}): SubventionSeed {
  return {
    oems: [{ id: "oem-1", name: "Configured OEM" }],
    schemes: [
      schemeFixture(),
      schemeFixture({
        id: "scheme-version-approved",
        version: 2,
        workflowStatus: "APPROVED",
        checkerUserId: "checker-1",
        approvedAt: "2026-06-30T00:00:00.000Z",
      }),
    ],
    programmeMappings: [mappingFixture()],
    transactions: [purchaseFixture()],
    eligibilityDecisions: [],
    quarantinedImports: [],
    auditEvents: [],
    actors: [
      { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
      { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
    ],
    existingClaimedImeis: [],
    existingClaimedLeaseIds: [],
    duplicateImeis: [],
    duplicateLeaseIds: [],
    ...overrides,
  };
}

function createRepositoryFixture(
  seed = seedFixture(),
  dependencies?: RepositoryDependencies,
) {
  let sequence = 0;
  return new InMemorySubventionRepository(
    seed,
    dependencies ?? {
      now: () => "2026-07-28T10:00:00.000Z",
      nextId: (prefix) => `${prefix}-${++sequence}`,
    },
  );
}

describe("subvention repository", () => {
  it("submits and approves with different users and appends audit events", async () => {
    const repository = createRepositoryFixture();
    await repository.submitScheme(
      "scheme-version-draft",
      { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
      "Ready for approval",
    );
    const submitted = await repository.getScheme("scheme-version-draft");
    if (!submitted) throw new Error("Fixture scheme missing");
    submitted.workflowStatus = "DRAFT";
    await expect(
      repository.saveSchemeDraft(
        submitted,
        { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
        "Attempt workflow rollback",
      ),
    ).rejects.toThrow("SUBMIT is not allowed from SUBMITTED");
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
      (
        await repository.listForEntity(
          "SchemeVersion",
          "scheme-version-draft",
        )
      ).map((event) => event.action),
    ).toEqual(["SCHEME_SUBMITTED", "SCHEME_APPROVED"]);
  });

  it("does not let an approved payload be resaved as a draft", async () => {
    const repository = createRepositoryFixture();
    const approved = await repository.getScheme("scheme-version-approved");
    if (!approved) throw new Error("Fixture scheme missing");
    approved.workflowStatus = "DRAFT";
    approved.name = "Attempted overwrite";

    await expect(
      repository.saveSchemeDraft(
        approved,
        { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
        "Save over approved version",
      ),
    ).rejects.toThrow("Approved master version is immutable");
    expect(
      (await repository.getScheme("scheme-version-approved"))?.name,
    ).toBe("Corporate H2");

    approved.id = "scheme-version-copied";
    await expect(
      repository.saveSchemeDraft(
        approved,
        { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
        "Copy approved payload into a draft",
      ),
    ).rejects.toThrow("Approved payload cannot be saved as a draft");
  });

  it("requires sanitized copies to use exactly the next logical version", async () => {
    const repository = createRepositoryFixture();
    const approvedScheme = await repository.getScheme(
      "scheme-version-approved",
    );
    const approvedMapping =
      await repository.getProgrammeMapping("mapping-version-1");
    if (!approvedScheme || !approvedMapping) {
      throw new Error("Fixture master missing");
    }

    const schemeCopy: SchemeVersion = {
      ...approvedScheme,
      id: "scheme-version-sanitized-copy",
      workflowStatus: "DRAFT",
      checkerUserId: undefined,
      approvedAt: undefined,
    };
    const mappingCopy: EmployerProgrammeMappingVersion = {
      ...approvedMapping,
      id: "mapping-version-sanitized-copy",
      workflowStatus: "DRAFT",
      checkerUserId: undefined,
      approvedAt: undefined,
    };

    await expect(
      repository.saveSchemeDraft(
        schemeCopy,
        { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
        "Sanitized approved scheme copy",
      ),
    ).rejects.toThrow("Scheme version must be exactly 3");
    await expect(
      repository.saveProgrammeMappingDraft(
        mappingCopy,
        { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
        "Sanitized approved mapping copy",
      ),
    ).rejects.toThrow("Programme mapping version must be exactly 2");

    expect(await repository.getScheme(schemeCopy.id)).toBeUndefined();
    expect(
      await repository.getProgrammeMapping(mappingCopy.id),
    ).toBeUndefined();

    schemeCopy.version = 3;
    mappingCopy.version = 2;
    await expect(
      repository.saveSchemeDraft(
        schemeCopy,
        { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
        "Create next scheme version",
      ),
    ).resolves.toMatchObject({ version: 3, workflowStatus: "DRAFT" });
    await expect(
      repository.saveProgrammeMappingDraft(
        mappingCopy,
        { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
        "Create next mapping version",
      ),
    ).resolves.toMatchObject({ version: 2, workflowStatus: "DRAFT" });
  });

  it("keeps logical identity and version fixed when editing a physical draft", async () => {
    const draftMapping = mappingFixture({
      workflowStatus: "DRAFT",
      checkerUserId: undefined,
      approvedAt: undefined,
    });
    const repository = createRepositoryFixture(
      seedFixture({ programmeMappings: [draftMapping] }),
    );
    const draftScheme = await repository.getScheme("scheme-version-draft");
    const mapping = await repository.getProgrammeMapping(draftMapping.id);
    if (!draftScheme || !mapping) throw new Error("Fixture draft missing");

    draftScheme.schemeId = "caller-controlled-scheme";
    draftScheme.version = 99;
    mapping.mappingId = "caller-controlled-mapping";
    mapping.version = 99;

    await expect(
      repository.saveSchemeDraft(
        draftScheme,
        { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
        "Change draft identity",
      ),
    ).rejects.toThrow("Scheme draft identity cannot be changed");
    await expect(
      repository.saveProgrammeMappingDraft(
        mapping,
        { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
        "Change draft identity",
      ),
    ).rejects.toThrow(
      "Programme mapping draft identity cannot be changed",
    );

    expect(
      (await repository.getScheme("scheme-version-draft"))?.schemeId,
    ).toBe("scheme-1");
    expect(
      (await repository.getProgrammeMapping(draftMapping.id))?.mappingId,
    ).toBe("mapping-1");
  });

  it("appends eligibility version 2 while retaining version 1 and its snapshot", async () => {
    const versionOne = eligibilityDecisionFixture();
    const repository = createRepositoryFixture(
      seedFixture({ eligibilityDecisions: [versionOne] }),
    );

    const versionTwo = await repository.evaluateTransaction(
      "purchase-1",
      { userId: "maker-1", role: "SALES_OPS_MAKER" },
    );
    versionTwo.ruleSnapshot?.eligibleProductIds.push("caller-mutation");

    const decisions =
      await repository.listEligibilityDecisions("purchase-1");
    expect(decisions.map(({ id, version }) => ({ id, version }))).toEqual([
      { id: "decision-1", version: 1 },
      { id: "eligibility-decision-1", version: 2 },
    ]);
    expect(decisions[0]).toEqual(versionOne);
    expect(decisions[1]?.previousDecisionId).toBe("decision-1");
    expect(decisions[1]?.ruleSnapshot?.eligibleProductIds).toEqual([
      "product-1",
    ]);
    expect(
      (
        await repository.listForEntity(
          "EligibilityDecision",
          "eligibility-decision-1",
        )
      )[0]?.action,
    ).toBe("ELIGIBILITY_EVALUATED");
  });

  it("serializes concurrent evaluations into one linear decision chain", async () => {
    const repository = createRepositoryFixture(
      seedFixture({
        eligibilityDecisions: [eligibilityDecisionFixture()],
      }),
    );
    const actor = { userId: "maker-1", role: "SALES_OPS_MAKER" };

    const decisions = await Promise.all([
      repository.evaluateTransaction("purchase-1", actor),
      repository.evaluateTransaction("purchase-1", actor),
    ]);

    expect(
      decisions.map(({ id, version, previousDecisionId }) => ({
        id,
        version,
        previousDecisionId,
      })),
    ).toEqual([
      {
        id: "eligibility-decision-1",
        version: 2,
        previousDecisionId: "decision-1",
      },
      {
        id: "eligibility-decision-3",
        version: 3,
        previousDecisionId: "eligibility-decision-1",
      },
    ]);
    expect(
      (
        await repository.listEligibilityDecisions("purchase-1")
      ).map(({ version }) => version),
    ).toEqual([1, 2, 3]);
  });

  it("copies a queued evaluation actor at the command boundary", async () => {
    const repository = createRepositoryFixture();
    const actor = { userId: "maker-1", role: "SALES_OPS_MAKER" };

    const pending = repository.evaluateTransaction("purchase-1", actor);
    actor.userId = "caller-mutated";
    const decision = await pending;

    expect(decision.evaluatedBy).toBe("maker-1");
    expect(
      (
        await repository.listForEntity(
          "EligibilityDecision",
          decision.id,
        )
      )[0]?.actor.userId,
    ).toBe("maker-1");
  });

  it("appends an audit event for every quarantined import row", async () => {
    const repository = createRepositoryFixture();
    const duplicate: PurchaseTransactionInput = {
      ...purchaseFixture({
        id: undefined,
        importedAt: undefined,
        leaseId: "lease-2",
        invoiceNumber: "INV-2",
      }),
    };

    const result = await repository.importTransactions(
      [duplicate],
      { userId: "maker-1", role: "SALES_OPS_MAKER" },
    );

    expect(result.accepted).toEqual([]);
    expect(result.quarantined[0]?.issues[0]?.code).toBe("DUPLICATE_IMEI");
    const events = await repository.listAuditEvents();
    expect(events).toEqual([
      expect.objectContaining({
        id: "audit-2",
        entityType: "PurchaseImportRow",
        entityId: "purchase-import-row-1",
        action: "PURCHASE_IMPORT_QUARANTINED",
        occurredAt: "2026-07-28T10:00:00.000Z",
        metadata: expect.objectContaining({
          rowNumber: 1,
          issueCodes: ["DUPLICATE_IMEI"],
        }),
      }),
    ]);
  });

  it.each([
    [
      "another row in the same import",
      seedFixture(),
      [
        purchaseInputFixture({
          employeeId: "",
          leaseId: "lease-quarantine-1",
          imei: "323456789012345",
          invoiceNumber: "INV-Q1",
        }),
        purchaseInputFixture({
          employeeId: "",
          leaseId: "lease-quarantine-2",
          imei: "423456789012345",
          invoiceNumber: "INV-Q2",
        }),
      ],
      "purchase-import-row-collision",
    ],
    [
      "a prior correlated quarantine audit",
      seedFixture({
        auditEvents: [
          auditEventFixture({
            entityType: "PurchaseImportRow",
            entityId: "purchase-import-row-existing",
            action: "PURCHASE_IMPORT_QUARANTINED",
          }),
        ],
      }),
      [
        purchaseInputFixture({
          employeeId: "",
          leaseId: "lease-quarantine-1",
          imei: "323456789012345",
          invoiceNumber: "INV-Q1",
        }),
      ],
      "purchase-import-row-existing",
    ],
  ])(
    "rolls back a complete import when a quarantine identity collides with %s",
    async (_label, seed, rows, collidingId) => {
      let auditSequence = 0;
      const repository = createRepositoryFixture(seed, {
        now: () => "2026-07-28T10:00:00.000Z",
        nextId: (prefix) =>
          prefix === "purchase-import-row"
            ? collidingId
            : `${prefix}-generated-${++auditSequence}`,
      });
      const before = await repository.getSnapshot();

      await expect(
        repository.importTransactions(
          rows,
          { userId: "maker-1", role: "SALES_OPS_MAKER" },
        ),
      ).rejects.toThrow(
        `Generated PurchaseImportRow ID ${collidingId} already exists`,
      );

      expect(await repository.getSnapshot()).toEqual(before);
    },
  );

  it("applies maker-checker workflow to programme mappings", async () => {
    const submitted = mappingFixture({
      id: "mapping-version-submitted",
      workflowStatus: "SUBMITTED",
      checkerUserId: undefined,
      approvedAt: undefined,
    });
    const repository = createRepositoryFixture(
      seedFixture({ programmeMappings: [submitted] }),
    );

    const rollback = await repository.getProgrammeMapping(submitted.id);
    if (!rollback) throw new Error("Fixture mapping missing");
    rollback.workflowStatus = "DRAFT";
    await expect(
      repository.saveProgrammeMappingDraft(
        rollback,
        { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
        "Attempt workflow rollback",
      ),
    ).rejects.toThrow("SUBMIT is not allowed from SUBMITTED");
    await expect(
      repository.approveProgrammeMapping(
        submitted.id,
        { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
        "Self approve",
      ),
    ).rejects.toThrow("Maker cannot approve own work");
    const approved = await repository.approveProgrammeMapping(
      submitted.id,
      { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
      "Mapping verified",
    );

    expect(approved).toMatchObject({
      workflowStatus: "APPROVED",
      checkerUserId: "checker-1",
    });
    expect(
      (
        await repository.listForEntity(
          "EmployerProgrammeMappingVersion",
          submitted.id,
        )
      ).map((event) => event.action),
    ).toEqual(["PROGRAMME_MAPPING_APPROVED"]);

    approved.id = "mapping-version-copied";
    approved.workflowStatus = "DRAFT";
    await expect(
      repository.saveProgrammeMappingDraft(
        approved,
        { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
        "Copy approved payload into a draft",
      ),
    ).rejects.toThrow("Approved payload cannot be saved as a draft");
  });

  it("deep-copies constructor inputs and snapshot outputs", async () => {
    const seed = seedFixture();
    const repository = createRepositoryFixture(seed);
    seed.schemes[0]!.name = "Seed mutated outside repository";

    const first = await repository.getSnapshot();
    first.schemes[0]!.name = "Snapshot mutated by caller";
    first.schemes[0]!.eligibleProductIds.push("caller-product");
    first.actors[0]!.userId = "caller-user";

    const second = await repository.getSnapshot();
    expect(second.schemes[0]?.name).toBe("Corporate H2");
    expect(second.schemes[0]?.eligibleProductIds).toEqual(["product-1"]);
    expect(second.actors[0]?.userId).toBe("maker-1");
  });

  it.each([
    [
      "scheme logical version",
      seedFixture({
        schemes: [
          schemeFixture(),
          schemeFixture({
            id: "scheme-version-duplicate-logical",
          }),
        ],
      }),
      "Duplicate SchemeVersion logical version scheme-1:1",
    ],
    [
      "physical mapping ID",
      seedFixture({
        programmeMappings: [
          mappingFixture(),
          mappingFixture({ mappingId: "mapping-2" }),
        ],
      }),
      "Duplicate EmployerProgrammeMappingVersion ID mapping-version-1",
    ],
    [
      "physical transaction ID",
      seedFixture({
        transactions: [
          purchaseFixture(),
          purchaseFixture({
            leaseId: "lease-2",
            imei: "223456789012345",
            invoiceNumber: "INV-2",
          }),
        ],
      }),
      "Duplicate PurchaseTransaction ID purchase-1",
    ],
    [
      "eligibility logical version",
      seedFixture({
        eligibilityDecisions: [
          eligibilityDecisionFixture(),
          eligibilityDecisionFixture({ id: "decision-2" }),
        ],
      }),
      "Duplicate EligibilityDecision logical version purchase-1:1",
    ],
    [
      "audit ID",
      seedFixture({
        auditEvents: [
          auditEventFixture(),
          auditEventFixture({ entityId: "scheme-version-draft" }),
        ],
      }),
      "Duplicate AuditEvent ID audit-existing",
    ],
    [
      "correlated quarantine identity",
      seedFixture({
        auditEvents: [
          auditEventFixture({
            id: "audit-quarantine-1",
            entityType: "PurchaseImportRow",
            entityId: "purchase-import-row-1",
            action: "PURCHASE_IMPORT_QUARANTINED",
          }),
          auditEventFixture({
            id: "audit-quarantine-2",
            entityType: "PurchaseImportRow",
            entityId: "purchase-import-row-1",
            action: "PURCHASE_IMPORT_QUARANTINED",
          }),
        ],
      }),
      "Duplicate PurchaseImportRow correlated identity purchase-import-row-1",
    ],
  ])("rejects duplicate seed identity: %s", (_label, seed, message) => {
    expect(() => createRepositoryFixture(seed)).toThrow(message);
  });

  it("rolls back an import when the generated transaction ID collides", async () => {
    const repository = createRepositoryFixture(seedFixture(), {
      now: () => "2026-07-28T10:00:00.000Z",
      nextId: (prefix) =>
        prefix === "purchase-transaction" ? "purchase-1" : `${prefix}-new`,
    });
    const before = await repository.getSnapshot();

    await expect(
      repository.importTransactions(
        [
          purchaseInputFixture({
            leaseId: "lease-2",
            imei: "223456789012345",
            invoiceNumber: "INV-2",
          }),
        ],
        { userId: "maker-1", role: "SALES_OPS_MAKER" },
      ),
    ).rejects.toThrow(
      "Generated PurchaseTransaction ID purchase-1 already exists",
    );

    expect(await repository.getSnapshot()).toEqual(before);
  });

  it("rolls back an evaluation when the generated decision ID collides", async () => {
    const repository = createRepositoryFixture(
      seedFixture({
        eligibilityDecisions: [eligibilityDecisionFixture()],
      }),
      {
        now: () => "2026-07-28T10:00:00.000Z",
        nextId: (prefix) =>
          prefix === "eligibility-decision"
            ? "decision-1"
            : `${prefix}-new`,
      },
    );
    const before = await repository.getSnapshot();

    await expect(
      repository.evaluateTransaction(
        "purchase-1",
        { userId: "maker-1", role: "SALES_OPS_MAKER" },
      ),
    ).rejects.toThrow(
      "Generated EligibilityDecision ID decision-1 already exists",
    );

    expect(await repository.getSnapshot()).toEqual(before);
  });

  it("rolls back a master transition when the generated audit ID collides", async () => {
    const repository = createRepositoryFixture(
      seedFixture({ auditEvents: [auditEventFixture()] }),
      {
        now: () => "2026-07-28T10:00:00.000Z",
        nextId: () => "audit-existing",
      },
    );
    const before = await repository.getSnapshot();

    await expect(
      repository.submitScheme(
        "scheme-version-draft",
        { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
        "Ready for approval",
      ),
    ).rejects.toThrow("Generated AuditEvent ID audit-existing already exists");

    expect(await repository.getSnapshot()).toEqual(before);
  });

  it("exposes realistic deterministic demo data without OEM-specific engine branches", async () => {
    const first = await createDemoSubventionRepository().getSnapshot();
    const second = await createDemoSubventionRepository().getSnapshot();

    expect(second).toEqual(first);
    expect(first.oems.map((oem) => oem.name)).toEqual([
      "Apple",
      "Samsung",
      "Google",
    ]);
    expect(
      first.schemes.filter(
        (scheme) => scheme.workflowStatus === "APPROVED",
      ),
    ).toHaveLength(6);
    expect(
      first.schemes.filter((scheme) => scheme.workflowStatus === "DRAFT"),
    ).toHaveLength(1);
    expect(first.programmeMappings).toHaveLength(8);
    expect(
      first.programmeMappings.filter(
        (mapping) => mapping.workflowStatus === "SUBMITTED",
      ),
    ).toHaveLength(1);
    expect(first.transactions.length).toBeGreaterThanOrEqual(30);
    expect(
      first.quarantinedImports[0]?.issues.map((foundIssue) => foundIssue.code),
    ).toEqual(["DUPLICATE_IMEI", "DUPLICATE_LEASE"]);
    expect(first.existingClaimedImeis.length).toBeGreaterThan(0);
    expect(first.existingClaimedLeaseIds.length).toBeGreaterThan(0);
    expect(first.auditEvents.length).toBeGreaterThanOrEqual(8);
    expect(first.actors.map((actor) => actor.role)).toEqual([
      "SALES_OPS_MAKER",
      "BUSINESS_HEAD_CHECKER",
      "MASTER_DATA_ADMIN",
      "MANAGEMENT_VIEWER",
      "AUDITOR",
    ]);
  });

  it("correlates seeded material events with entity transitions and timestamps", async () => {
    const snapshot =
      await createDemoSubventionRepository().getSnapshot();

    snapshot.transactions.forEach((transaction) => {
      const importEvents = snapshot.auditEvents.filter(
        (event) =>
          event.entityType === "PurchaseTransaction" &&
          event.entityId === transaction.id &&
          event.action === "PURCHASE_IMPORTED",
      );
      expect(importEvents).toHaveLength(1);
      expect(importEvents[0]?.occurredAt).toBe(transaction.importedAt);
    });

    snapshot.programmeMappings.forEach((mapping) => {
      const events = snapshot.auditEvents.filter(
        (event) =>
          event.entityType === "EmployerProgrammeMappingVersion" &&
          event.entityId === mapping.id,
      );
      const submission = events.find(
        (event) => event.action === "PROGRAMME_MAPPING_SUBMITTED",
      );
      expect(events.map((event) => event.action)).toContain(
        "PROGRAMME_MAPPING_SUBMITTED",
      );
      if (!submission) throw new Error("Seed submission audit missing");
      expect(submission.occurredAt >= mapping.createdAt).toBe(true);
      if (mapping.workflowStatus === "APPROVED") {
        const approval = events.find(
          (event) => event.action === "PROGRAMME_MAPPING_APPROVED",
        );
        if (!approval) throw new Error("Seed approval audit missing");
        expect(approval.occurredAt).toBe(mapping.approvedAt);
        expect(submission.occurredAt <= approval.occurredAt).toBe(true);
      } else {
        expect(
          events.some(
            (event) => event.action === "PROGRAMME_MAPPING_APPROVED",
          ),
        ).toBe(false);
      }
    });

    snapshot.schemes
      .filter((scheme) => scheme.workflowStatus === "APPROVED")
      .forEach((scheme) => {
        const events = snapshot.auditEvents.filter(
          (event) =>
            event.entityType === "SchemeVersion" &&
            event.entityId === scheme.id,
        );
        expect(events.map((event) => event.action)).toEqual([
          "SCHEME_SUBMITTED",
          "SCHEME_APPROVED",
        ]);
        const [submission, approval] = events;
        expect(submission?.actor.userId).toBe(scheme.makerUserId);
        expect(approval?.actor.userId).toBe(scheme.checkerUserId);
        expect(submission?.occurredAt >= scheme.createdAt).toBe(true);
        expect(submission?.occurredAt < approval!.occurredAt).toBe(true);
        expect(approval?.occurredAt).toBe(scheme.approvedAt);
      });
  });
});
