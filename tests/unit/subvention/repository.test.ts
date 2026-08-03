import { describe, expect, it } from "vitest";
import type {
  AuditEvent,
  EligibilityDecision,
  EmployerProgrammeMappingVersion,
  PurchaseTransaction,
  PurchaseTransactionInput,
  RepositoryDependencies,
  MasterCatalogue,
  ProductMasterRecord,
  SchemeVersion,
  SubventionSeed,
} from "../../../packages/domain/src";
import { resolveProgrammeMapping } from "../../../packages/domain/src";
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
    productCode: "PRODUCT-1",
    connectLegalEntityId: "connect-equipment-leasing",
    deviceIdentifier: "123456789012345",
    purchaseOrderNumber: "PO-1",
    invoiceNumber: "INV-1",
    invoiceDate: "2026-07-15",
    invoiceValuePaise: 8_250_000,
    baseValuePaise: 7_000_000,
    gstAmountPaise: 1_250_000,
    resellerId: "reseller-1",
    leaseStatus: "ACTIVE",
    sourceSystem: "LMS",
    sourceEvidence: {
      sourceFileName: "synthetic-repository.xlsx",
      sourceSheetName: "Transactions",
      sourceRowNumber: 2,
      sourceChecksum: "sha256:synthetic-repository",
      rowKind: "TRANSACTION",
      sourceLabels: {},
      counterpartyAliases: {},
      calculationBasis: "INVOICE_VALUE",
      rateBps: 350,
      expectedSubventionPaise: 288_750,
    },
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
    productCode: transaction.productCode,
    connectLegalEntityId: transaction.connectLegalEntityId,
    deviceIdentifier: transaction.deviceIdentifier,
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
    sourceEvidence:
      overrides.sourceEvidence ??
      {
        ...transaction.sourceEvidence,
        sourceChecksum: `sha256:${transaction.leaseId}:${transaction.invoiceNumber}`,
      },
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
  const masters: MasterCatalogue = {
    oems: [
      {
        id: "oem-1",
        kind: "OEM",
        code: "OEM-1",
        name: "Configured OEM",
        status: "ACTIVE",
        defaultClaimTimelineDays: 90,
        defaultCalculationBasis: "INVOICE_VALUE",
        defaultSettlementCounterpartyType: "DISTRIBUTOR",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
    distributors: [],
    resellers: [],
    products: [
      {
        id: "product-1",
        kind: "PRODUCT",
        code: "PRODUCT-1",
        name: "Configured Product",
        status: "ACTIVE",
        oemId: "oem-1",
        model: "Configured Product 1",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
    employers: [
      {
        id: "employer-1",
        kind: "EMPLOYER",
        code: "EMPLOYER-1",
        name: "Configured Employer",
        status: "ACTIVE",
        programmeCode: "PROGRAMME-1",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
  };
  return {
    masters,
    oems: [
      {
        id: "oem-1",
        name: "Configured OEM",
        productIds: ["product-1"],
      },
    ],
    schemes: [
      schemeFixture({ priority: 20 }),
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
    claimBatches: [],
    purchaseOrders: [],
    vendorInvoices: [],
    eWayBills: [],
    evidenceLinks: [],
    quarantinedImports: [],
    auditEvents: [],
    actors: [
      { userId: "maker-1", role: "SALES_OPS_MAKER" },
      { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
      { userId: "master-admin-1", role: "MASTER_DATA_ADMIN" },
      { userId: "management-1", role: "MANAGEMENT_VIEWER" },
      { userId: "auditor-1", role: "AUDITOR" },
    ],
    purchaseImportMasterData: {
      employerIds: new Set(["employer-1"]),
      programmeIds: new Set(["programme-1"]),
      oemIds: new Set(["oem-1"]),
      productIds: new Set(["product-1"]),
      productCodesByProductId: new Map([
        ["product-1", new Set(["PRODUCT-1"])],
      ]),
      connectLegalEntityIds: new Set([
        "connect-equipment-leasing",
      ]),
      resellerAliases: new Map(),
      distributorAliases: new Map(),
    },
    existingClaimedDeviceIdentifiers: [],
    existingClaimedLeaseIds: [],
    alternativePartnerDeviceIdentifiers: [],
    alternativePartnerLeaseIds: [],
    duplicateDeviceIdentifiers: [],
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
  it("persists evidence changes, audits them, and gates eligibility", async () => {
    const repository = createDemoSubventionRepository();
    const transactionId = "transaction-eligible-01";
    const [link] = await repository.listEvidenceLinks(transactionId);
    expect(link).toBeDefined();

    const saved = await repository.saveEvidenceLink(
      {
        ...link!,
        eWayBill: { ...link!.eWayBill!, partBPresent: false, movementValid: false },
      },
      { userId: "sales-ops-maker", role: "SALES_OPS_MAKER" },
      "Record Part-A-only movement evidence",
    );
    const decision = await repository.evaluateTransaction(
      transactionId,
      { userId: "sales-ops-maker", role: "SALES_OPS_MAKER" },
    );

    expect(saved.eWayBill?.partBPresent).toBe(false);
    expect(decision.status).toBe("EXCEPTION_REVIEW");
    expect(decision.ruleResults).toContainEqual(expect.objectContaining({
      code: "EWAY_PART_B_REVIEW",
      outcome: "REVIEW",
    }));
    expect(await repository.listForEntity(
      "TransactionEvidenceLink",
      `${transactionId}|${saved.invoice.id}|${saved.invoiceLineId}`,
    )).toContainEqual(expect.objectContaining({
      action: "TRANSACTION_EVIDENCE_LINKED",
      remarks: "Record Part-A-only movement evidence",
    }));
  });

  it("submits and approves with different users and appends audit events", async () => {
    const repository = createRepositoryFixture();
    await repository.submitScheme(
      "scheme-version-draft",
      { userId: "maker-1", role: "SALES_OPS_MAKER" },
      "Ready for approval",
    );
    const submitted = await repository.getScheme("scheme-version-draft");
    if (!submitted) throw new Error("Fixture scheme missing");
    submitted.workflowStatus = "DRAFT";
    await expect(
      repository.saveSchemeDraft(
        submitted,
        { userId: "maker-1", role: "SALES_OPS_MAKER" },
        "Attempt workflow rollback",
      ),
    ).rejects.toThrow("SUBMIT is not allowed from SUBMITTED");
    await expect(
      repository.approveScheme(
        "scheme-version-draft",
        { userId: "maker-1", role: "BUSINESS_HEAD_CHECKER" },
        "Self approve",
      ),
    ).rejects.toThrow("Actor maker-1 is not configured");
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

  it("returns and rejects submitted masters with an audit trail", async () => {
    const submittedScheme = schemeFixture({
      workflowStatus: "SUBMITTED",
    });
    const submittedMapping = mappingFixture({
      workflowStatus: "SUBMITTED",
      checkerUserId: undefined,
      approvedAt: undefined,
    });
    const repository = createRepositoryFixture(
      seedFixture({
        schemes: [submittedScheme],
        programmeMappings: [submittedMapping],
      }),
    );
    const checker = {
      userId: "checker-1",
      role: "BUSINESS_HEAD_CHECKER",
    };

    await expect(
      repository.returnScheme(
        submittedScheme.id,
        checker,
        "Correct the validity window",
      ),
    ).resolves.toMatchObject({ workflowStatus: "RETURNED" });
    await expect(
      repository.rejectProgrammeMapping(
        submittedMapping.id,
        checker,
        "Programme authority is missing",
      ),
    ).resolves.toMatchObject({ workflowStatus: "REJECTED" });

    expect(
      (await repository.listAuditEvents()).map((event) => event.action),
    ).toEqual(["SCHEME_RETURNED", "PROGRAMME_MAPPING_REJECTED"]);
  });

  it("derives clean draft versions from approved scheme and mapping data", async () => {
    const repository = createRepositoryFixture();
    const maker = { userId: "maker-1", role: "SALES_OPS_MAKER" };

    const scheme = await repository.createNextSchemeVersion(
      "scheme-version-approved",
      maker,
      "Start the next controlled version",
      {
        effectiveFrom: "2027-01-01",
        effectiveTo: "2027-06-30",
      },
    );
    const mapping = await repository.createNextProgrammeMappingVersion(
      "mapping-version-1",
      maker,
      "Start the next controlled mapping",
      {
        effectiveFrom: "2026-10-01",
        effectiveTo: "2027-03-31",
      },
    );

    expect(scheme).toMatchObject({
      id: "scheme-version-1",
      schemeId: "scheme-1",
      version: 3,
      workflowStatus: "DRAFT",
      makerUserId: "maker-1",
      checkerUserId: undefined,
      approvedAt: undefined,
    });
    expect(mapping).toMatchObject({
      id: "programme-mapping-version-3",
      mappingId: "mapping-1",
      version: 2,
      workflowStatus: "DRAFT",
      makerUserId: "maker-1",
      checkerUserId: undefined,
      approvedAt: undefined,
      effectiveFrom: "2026-10-01",
      effectiveTo: "2027-03-31",
    });
    expect(
      (await repository.listAuditEvents()).map((event) => event.action),
    ).toEqual(["SCHEME_DRAFT_SAVED", "PROGRAMME_MAPPING_DRAFT_SAVED"]);
  });

  it.each([
    "MANAGEMENT_VIEWER",
    "AUDITOR",
    "BUSINESS_HEAD_CHECKER",
  ])("rejects draft creation by unauthorized role %s", async (role) => {
    const repository = createRepositoryFixture();
    const actor = { userId: "unauthorized-1", role };

    await expect(
      repository.createNextSchemeVersion(
        "scheme-version-approved",
        actor,
        "Unauthorized derived version",
      ),
    ).rejects.toThrow(`${role} is not authorized to CREATE master data`);
  });

  it.each([
    "MANAGEMENT_VIEWER",
    "AUDITOR",
    "BUSINESS_HEAD_CHECKER",
  ])("rejects draft save by unauthorized role %s", async (role) => {
    const repository = createRepositoryFixture();
    const actor = { userId: "unauthorized-1", role };
    const draft = await repository.getScheme("scheme-version-draft");
    if (!draft) throw new Error("Fixture scheme missing");

    await expect(
      repository.saveSchemeDraft(
        draft,
        actor,
        "Unauthorized draft save",
      ),
    ).rejects.toThrow(`${role} is not authorized to SAVE master data`);
  });

  it("allows the master data administrator to create and save draft versions", async () => {
    const repository = createRepositoryFixture();
    const actor = { userId: "master-admin-1", role: "MASTER_DATA_ADMIN" };

    const next = await repository.createNextSchemeVersion(
      "scheme-version-approved",
      actor,
      "Prepare the controlled successor",
      {
        effectiveFrom: "2027-01-01",
        effectiveTo: "2027-06-30",
      },
    );
    expect(next.makerUserId).toBe(actor.userId);

    await expect(
      repository.saveSchemeDraft(
        next,
        actor,
        "Update controlled master configuration",
      ),
    ).resolves.toMatchObject({
      id: next.id,
      makerUserId: actor.userId,
      workflowStatus: "DRAFT",
    });
  });

  it("preserves the approved predecessor when approving an explicit successor", async () => {
    const prior = mappingFixture();
    const successor = mappingFixture({
      id: "mapping-version-2",
      version: 2,
      workflowStatus: "SUBMITTED",
      checkerUserId: undefined,
      approvedAt: undefined,
      effectiveFrom: "2026-10-01",
      effectiveTo: "2027-03-31",
      createdAt: "2026-09-01T00:00:00.000Z",
    });
    const repository = createRepositoryFixture(
      seedFixture({ programmeMappings: [prior, successor] }),
    );

    await repository.approveProgrammeMapping(
      successor.id,
      { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
      "Transition effective from October",
    );

    expect(
      await repository.getProgrammeMapping(prior.id),
    ).toMatchObject({
      workflowStatus: "APPROVED",
      effectiveTo: "2026-12-31",
    });
    expect(
      await repository.getProgrammeMapping(successor.id),
    ).toMatchObject({
      workflowStatus: "APPROVED",
      effectiveFrom: "2026-10-01",
      supersedesVersionId: prior.id,
    });
    expect(
      (await repository.listAuditEvents()).map(
        ({ entityId, action }) => ({ entityId, action }),
      ),
    ).toEqual([
      {
        entityId: successor.id,
        action: "PROGRAMME_MAPPING_APPROVED",
      },
    ]);

    const snapshot = await repository.getSnapshot();
    expect(
      resolveProgrammeMapping(
        purchaseFixture({ invoiceDate: "2026-09-30" }),
        snapshot.programmeMappings,
      ).status,
    ).toBe("RESOLVED");
    expect(
      resolveProgrammeMapping(
        purchaseFixture({ invoiceDate: "2026-10-01" }),
        snapshot.programmeMappings,
      ).status,
    ).toBe("RESOLVED");
  });

  it.each([
    ["does not exist", "mapping-version-forged"],
    ["belongs to a different mapping", "mapping-version-unrelated"],
  ])(
    "rejects an explicit predecessor that %s",
    async (_reason, supersedesVersionId) => {
      const prior = mappingFixture({
        effectiveTo: "2026-12-31",
      });
      const successor = mappingFixture({
        id: "mapping-version-successor",
        version: 2,
        workflowStatus: "SUBMITTED",
        checkerUserId: undefined,
        approvedAt: undefined,
        effectiveFrom: "2027-01-01",
        effectiveTo: "2027-06-30",
        supersedesVersionId,
      });
      const unrelated = mappingFixture({
        id: "mapping-version-unrelated",
        mappingId: "mapping-unrelated",
        effectiveFrom: "2027-01-01",
        effectiveTo: "2027-06-30",
      });
      const repository = createRepositoryFixture(
        seedFixture({
          programmeMappings:
            supersedesVersionId === unrelated.id
              ? [prior, unrelated, successor]
              : [prior, successor],
        }),
      );

      await expect(
        repository.approveProgrammeMapping(
          successor.id,
          { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
          "Attempt forged predecessor approval",
        ),
      ).rejects.toThrow(
        "Superseded programme mapping version must be the approved immediate predecessor",
      );
    },
  );

  it("rejects an explicit predecessor that is not approved", async () => {
    const unapprovedPrior = mappingFixture({
      workflowStatus: "DRAFT",
      checkerUserId: undefined,
      approvedAt: undefined,
    });
    const successor = mappingFixture({
      id: "mapping-version-successor",
      version: 2,
      workflowStatus: "SUBMITTED",
      checkerUserId: undefined,
      approvedAt: undefined,
      effectiveFrom: "2027-01-01",
      effectiveTo: "2027-06-30",
      supersedesVersionId: unapprovedPrior.id,
    });
    const repository = createRepositoryFixture(
      seedFixture({ programmeMappings: [unapprovedPrior, successor] }),
    );

    await expect(
      repository.approveProgrammeMapping(
        successor.id,
        { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
        "Attempt unapproved predecessor approval",
      ),
    ).rejects.toThrow(
      "Superseded programme mapping version must be the approved immediate predecessor",
    );
  });

  it("rejects an explicit predecessor that is not the immediately prior version", async () => {
    const earliestPrior = mappingFixture({
      id: "mapping-version-1",
      effectiveTo: "2026-08-31",
    });
    const immediatePrior = mappingFixture({
      id: "mapping-version-2",
      version: 2,
      effectiveFrom: "2026-09-01",
      effectiveTo: "2026-12-31",
    });
    const successor = mappingFixture({
      id: "mapping-version-3",
      version: 3,
      workflowStatus: "SUBMITTED",
      checkerUserId: undefined,
      approvedAt: undefined,
      effectiveFrom: "2027-01-01",
      effectiveTo: "2027-06-30",
      supersedesVersionId: earliestPrior.id,
    });
    const repository = createRepositoryFixture(
      seedFixture({
        programmeMappings: [earliestPrior, immediatePrior, successor],
      }),
    );

    await expect(
      repository.approveProgrammeMapping(
        successor.id,
        { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
        "Attempt stale predecessor approval",
      ),
    ).rejects.toThrow(
      "Superseded programme mapping version must be the approved immediate predecessor",
    );
  });

  it("approves a successor that explicitly references the immediate predecessor", async () => {
    const prior = mappingFixture({ effectiveTo: "2026-12-31" });
    const successor = mappingFixture({
      id: "mapping-version-successor",
      version: 2,
      workflowStatus: "SUBMITTED",
      checkerUserId: undefined,
      approvedAt: undefined,
      effectiveFrom: "2027-01-01",
      effectiveTo: "2027-06-30",
      supersedesVersionId: prior.id,
    });
    const repository = createRepositoryFixture(
      seedFixture({ programmeMappings: [prior, successor] }),
    );

    await expect(
      repository.approveProgrammeMapping(
        successor.id,
        { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
        "Approve valid explicit successor",
      ),
    ).resolves.toMatchObject({
      workflowStatus: "APPROVED",
      supersedesVersionId: prior.id,
    });
  });

  it("preserves a historical gap when the successor starts after the prior window", async () => {
    const prior = mappingFixture();
    const successor = mappingFixture({
      id: "mapping-version-2",
      version: 2,
      workflowStatus: "SUBMITTED",
      checkerUserId: undefined,
      approvedAt: undefined,
      effectiveFrom: "2027-02-01",
      effectiveTo: "2027-06-30",
    });
    const repository = createRepositoryFixture(
      seedFixture({ programmeMappings: [prior, successor] }),
    );

    await repository.approveProgrammeMapping(
      successor.id,
      { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
      "Approve after the configured gap",
    );

    expect(
      (await repository.getProgrammeMapping(prior.id))?.effectiveTo,
    ).toBe("2026-12-31");
    expect(
      resolveProgrammeMapping(
        purchaseFixture({ invoiceDate: "2027-01-15" }),
        (await repository.getSnapshot()).programmeMappings,
      ).status,
    ).toBe("MISSING");
  });

  it("rejects approval when another approved business-key mapping would still overlap", async () => {
    const prior = mappingFixture();
    const conflicting = mappingFixture({
      id: "mapping-other-approved",
      mappingId: "mapping-other",
      effectiveFrom: "2026-09-01",
      effectiveTo: "2027-01-31",
    });
    const successor = mappingFixture({
      id: "mapping-version-2",
      version: 2,
      workflowStatus: "SUBMITTED",
      checkerUserId: undefined,
      approvedAt: undefined,
      effectiveFrom: "2026-10-01",
      effectiveTo: "2027-03-31",
    });
    const repository = createRepositoryFixture(
      seedFixture({
        programmeMappings: [prior, conflicting, successor],
      }),
    );
    const before = await repository.getSnapshot();

    await expect(
      repository.approveProgrammeMapping(
        successor.id,
        { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
        "Attempt conflicting approval",
      ),
    ).rejects.toThrow(
      "Programme mapping effective period overlaps approved mapping mapping-other-approved",
    );
    expect(await repository.getSnapshot()).toEqual(before);
  });

  it("allows overlapping dates for disjoint configured distributor paths", async () => {
    const ingram = mappingFixture({
      id: "mapping-ingram",
      mappingId: "mapping-ingram",
      distributorId: "distributor-ingram",
    });
    const redington = mappingFixture({
      id: "mapping-redington",
      mappingId: "mapping-redington",
      distributorId: "distributor-redington",
      workflowStatus: "SUBMITTED",
      checkerUserId: undefined,
      approvedAt: undefined,
    });
    const repository = createRepositoryFixture(
      seedFixture({ programmeMappings: [ingram, redington] }),
    );

    await repository.approveProgrammeMapping(
      redington.id,
      { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
      "Approve separate settlement path",
    );

    expect(await repository.getProgrammeMapping(redington.id)).toMatchObject({
      workflowStatus: "APPROVED",
      distributorId: "distributor-redington",
    });
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
        { userId: "maker-1", role: "SALES_OPS_MAKER" },
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
        { userId: "maker-1", role: "SALES_OPS_MAKER" },
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
        { userId: "maker-1", role: "SALES_OPS_MAKER" },
        "Sanitized approved scheme copy",
      ),
    ).rejects.toThrow("Scheme version must be exactly 3");
    await expect(
      repository.saveProgrammeMappingDraft(
        mappingCopy,
        { userId: "maker-1", role: "SALES_OPS_MAKER" },
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
        { userId: "maker-1", role: "SALES_OPS_MAKER" },
        "Create next scheme version",
      ),
    ).resolves.toMatchObject({ version: 3, workflowStatus: "DRAFT" });
    await expect(
      repository.saveProgrammeMappingDraft(
        mappingCopy,
        { userId: "maker-1", role: "SALES_OPS_MAKER" },
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
        { userId: "maker-1", role: "SALES_OPS_MAKER" },
        "Change draft identity",
      ),
    ).rejects.toThrow("Scheme draft identity cannot be changed");
    await expect(
      repository.saveProgrammeMappingDraft(
        mapping,
        { userId: "maker-1", role: "SALES_OPS_MAKER" },
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

  it("returns the decisions actually persisted by a bulk evaluation", async () => {
    const secondPurchase = purchaseFixture({
      id: "purchase-2",
      leaseId: "lease-2",
      deviceIdentifier: "223456789012345",
      invoiceNumber: "INV-2",
      sourceEvidence: {
        ...purchaseFixture().sourceEvidence,
        sourceChecksum: "sha256:bulk-purchase-2",
      },
    });
    const repository = createRepositoryFixture(
      seedFixture({
        transactions: [purchaseFixture(), secondPurchase],
      }),
    ) as InMemorySubventionRepository & {
      evaluateTransactions?: (
        ids: string[],
        actor: { userId: string; role: string },
      ) => Promise<EligibilityDecision[]>;
    };

    expect(repository.evaluateTransactions).toBeTypeOf("function");
    if (!repository.evaluateTransactions) return;
    const decisions = await repository.evaluateTransactions(
      ["purchase-1", "purchase-2"],
      { userId: "maker-1", role: "SALES_OPS_MAKER" },
    );

    expect(decisions).toHaveLength(2);
    expect(
      (await repository.listEligibilityDecisions()).map(
        ({ id, transactionId, status, expectedAmountPaise }) => ({
          id,
          transactionId,
          status,
          expectedAmountPaise,
        }),
      ),
    ).toEqual(
      decisions.map(
        ({ id, transactionId, status, expectedAmountPaise }) => ({
          id,
          transactionId,
          status,
          expectedAmountPaise,
        }),
      ),
    );
  });

  it("rolls back every bulk decision when any transaction cannot be evaluated", async () => {
    const repository = createRepositoryFixture() as InMemorySubventionRepository & {
      evaluateTransactions?: (
        ids: string[],
        actor: { userId: string; role: string },
      ) => Promise<EligibilityDecision[]>;
    };
    const before = await repository.getSnapshot();

    expect(repository.evaluateTransactions).toBeTypeOf("function");
    if (!repository.evaluateTransactions) return;
    await expect(
      repository.evaluateTransactions(
        ["purchase-1", "purchase-missing"],
        { userId: "maker-1", role: "SALES_OPS_MAKER" },
      ),
    ).rejects.toThrow(
      "Purchase transaction purchase-missing was not found",
    );
    expect(await repository.getSnapshot()).toEqual(before);
  });

  it("appends an audit event for every quarantined import row", async () => {
    const repository = createRepositoryFixture();
    const duplicate: PurchaseTransactionInput = {
      ...purchaseFixture({
        id: undefined,
        importedAt: undefined,
        leaseId: "lease-2",
        invoiceNumber: "INV-2",
        sourceEvidence: {
          ...purchaseFixture().sourceEvidence,
          sourceChecksum: "sha256:repository-duplicate-device",
        },
      }),
    };

    const result = await repository.importTransactions(
      [duplicate],
      { userId: "maker-1", role: "SALES_OPS_MAKER" },
    );

    expect(result.accepted).toEqual([]);
    expect(result.quarantined[0]?.issues[0]?.code).toBe(
      "DUPLICATE_DEVICE_IDENTIFIER",
    );
    expect(result.quarantined[0]).toMatchObject({
      id: expect.stringMatching(/^purchase-import-row-/),
      importId: expect.stringMatching(/^purchase-import-/),
      importedAt: "2026-07-28T10:00:00.000Z",
      importedBy: "maker-1",
      sourceChecksum: "sha256:repository-duplicate-device",
      sourceSheetName: "Transactions",
      sourceRowNumber: 2,
      issueCodes: ["DUPLICATE_DEVICE_IDENTIFIER"],
    });
    const events = await repository.listAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      entityType: "PurchaseImportRow",
      entityId: result.quarantined[0]?.id,
      action: "PURCHASE_IMPORT_QUARANTINED",
      actor: { userId: "maker-1", role: "SALES_OPS_MAKER" },
      occurredAt: "2026-07-28T10:00:00.000Z",
      metadata: {
        importId: result.quarantined[0]?.importId,
        rowNumber: 1,
        sourceChecksum: "sha256:repository-duplicate-device",
        sourceSheetName: "Transactions",
        sourceRowNumber: 2,
        issueCodes: ["DUPLICATE_DEVICE_IDENTIFIER"],
      },
    });
  });

  it.each([
    [
      "another row in the same import",
      seedFixture(),
      [
        purchaseInputFixture({
          employeeId: "",
          leaseId: "lease-quarantine-1",
          deviceIdentifier: "323456789012345",
          invoiceNumber: "INV-Q1",
        }),
        purchaseInputFixture({
          employeeId: "",
          leaseId: "lease-quarantine-2",
          deviceIdentifier: "423456789012345",
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
          deviceIdentifier: "323456789012345",
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
        { userId: "maker-1", role: "SALES_OPS_MAKER" },
        "Attempt workflow rollback",
      ),
    ).rejects.toThrow("SUBMIT is not allowed from SUBMITTED");
    await expect(
      repository.approveProgrammeMapping(
        submitted.id,
        { userId: "maker-1", role: "BUSINESS_HEAD_CHECKER" },
        "Self approve",
      ),
    ).rejects.toThrow("Actor maker-1 is not configured");
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
        { userId: "maker-1", role: "SALES_OPS_MAKER" },
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
            deviceIdentifier: "223456789012345",
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
            deviceIdentifier: "223456789012345",
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
        { userId: "maker-1", role: "SALES_OPS_MAKER" },
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
    expect(first.programmeMappings).toHaveLength(15);
    expect(
      first.programmeMappings.filter(
        (mapping) => mapping.workflowStatus === "SUBMITTED",
      ),
    ).toHaveLength(1);
    expect(first.transactions.length).toBeGreaterThanOrEqual(30);
    expect(
      [...new Set(first.schemes.flatMap((scheme) => scheme.rateBps ?? []))].sort(
        (left, right) => left - right,
      ),
    ).toEqual([245, 250, 275, 300, 350]);
    expect(
      new Set(
        first.transactions.map(
          (transaction) => transaction.connectLegalEntityId,
        ),
      ),
    ).toEqual(
      new Set(["connect-equipment-leasing", "connect-residuary"]),
    );
    expect(
      new Set(
        first.transactions.map(
          (transaction) =>
            transaction.sourceEvidence.counterpartyAliases.distributor,
        ),
      ),
    ).toEqual(new Set(["Ingram", "Redington"]));
    expect(
      new Set(
        first.transactions.map(
          (transaction) => transaction.sourceEvidence.calculationBasis,
        ),
      ),
    ).toEqual(new Set(["BASE_VALUE", "INVOICE_VALUE"]));
    expect(
      first.transactions.some((transaction) =>
        /[A-Z]/.test(transaction.deviceIdentifier),
      ),
    ).toBe(true);
    expect(
      first.transactions.some((transaction) =>
        /^\d{15}$/.test(transaction.deviceIdentifier),
      ),
    ).toBe(true);
    expect(
      new Set(
        first.transactions.map(
          (transaction) =>
            transaction.sourceEvidence.sourceLabels.externalOutcome,
        ),
      ),
    ).toEqual(new Set(["Approved", "Rejected", "Deferred"]));
    expect(
      first.quarantinedImports[0]?.issues.map((foundIssue) => foundIssue.code),
    ).toEqual(["DUPLICATE_DEVICE_IDENTIFIER", "DUPLICATE_LEASE"]);
    expect(first.existingClaimedDeviceIdentifiers.length).toBeGreaterThan(0);
    expect(first.existingClaimedLeaseIds.length).toBeGreaterThan(0);
    expect(first.auditEvents.length).toBeGreaterThanOrEqual(8);
    expect(first.actors.map((actor) => actor.role)).toEqual([
      "SALES_OPS_MAKER",
      "BUSINESS_HEAD_CHECKER",
      "MASTER_DATA_ADMIN",
      "MANAGEMENT_VIEWER",
      "AUDITOR",
    ]);
    first.transactions
      .filter((transaction) => transaction.employerId !== "employer-unmapped")
      .forEach((transaction) => {
        const resolution = resolveProgrammeMapping(
          transaction,
          first.programmeMappings,
        );
        expect(
          resolution,
          `${transaction.id} must resolve through its configured counterparties`,
        ).toMatchObject({ status: "RESOLVED" });
      });
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

  it("requires an explicit non-overlapping window for a scheme successor", async () => {
    const repository = createRepositoryFixture();
    const successor = await repository.createNextSchemeVersion(
      "scheme-version-approved",
      { userId: "maker-1", role: "SALES_OPS_MAKER" },
      "Create the next controlled window",
      {
        effectiveFrom: "2027-01-01",
        effectiveTo: "2027-06-30",
      },
    );

    expect(successor).toMatchObject({
      effectiveFrom: "2027-01-01",
      effectiveTo: "2027-06-30",
      supersedesVersionId: "scheme-version-approved",
    });
  });

  it("rejects scheme approval when an equal-priority product window overlaps", async () => {
    const overlapping = schemeFixture({
      id: "scheme-overlap",
      version: 3,
      workflowStatus: "SUBMITTED",
      checkerUserId: undefined,
      approvedAt: undefined,
    });
    const repository = createRepositoryFixture(
      seedFixture({
        schemes: [
          schemeFixture({
            id: "scheme-version-approved",
            version: 2,
            workflowStatus: "APPROVED",
          }),
          overlapping,
        ],
      }),
    );

    await expect(
      repository.approveScheme(
        overlapping.id,
        { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
        "Attempt overlapping approval",
      ),
    ).rejects.toEqual([
      expect.objectContaining({ code: "SCHEME_OVERLAP" }),
    ]);
  });

  it("validates mapped scheme integrity before mapping approval", async () => {
    const submitted = mappingFixture({
      id: "mapping-submitted-invalid-scheme",
      workflowStatus: "SUBMITTED",
      checkerUserId: undefined,
      approvedAt: undefined,
      schemeVersionId: "scheme-version-missing",
    });
    const repository = createRepositoryFixture(
      seedFixture({ programmeMappings: [submitted] }),
    );

    await expect(
      repository.approveProgrammeMapping(
        submitted.id,
        { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
        "Attempt invalid mapping approval",
      ),
    ).rejects.toThrow("Mapped scheme version was not found");
  });

  it("rejects whitespace override authority before mapping approval", async () => {
    const submitted = mappingFixture({
      id: "mapping-submitted-blank-authority",
      workflowStatus: "SUBMITTED",
      checkerUserId: undefined,
      approvedAt: undefined,
      overrides: {
        rateBps: 300,
        approvalReference: "   ",
      },
    });
    const repository = createRepositoryFixture(
      seedFixture({ programmeMappings: [submitted] }),
    );

    await expect(
      repository.approveProgrammeMapping(
        submitted.id,
        { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" },
        "Attempt blank authority approval",
      ),
    ).rejects.toThrow("Programme override requires an approval reference");
  });

  it("allows a returned master to be edited as a draft and resubmitted", async () => {
    const returnedScheme = schemeFixture({ workflowStatus: "RETURNED" });
    const returnedMapping = mappingFixture({ workflowStatus: "RETURNED" });
    const repository = createRepositoryFixture(
      seedFixture({
        schemes: [returnedScheme],
        programmeMappings: [returnedMapping],
      }),
    );
    const maker = { userId: "maker-1", role: "SALES_OPS_MAKER" };

    const savedScheme = await repository.saveSchemeDraft(
      { ...returnedScheme, name: "Corrected scheme", workflowStatus: "DRAFT" },
      maker,
      "Apply checker corrections",
    );
    const savedMapping = await repository.saveProgrammeMappingDraft(
      {
        ...returnedMapping,
        effectiveTo: "2027-01-31",
        workflowStatus: "DRAFT",
      },
      maker,
      "Apply mapping corrections",
    );

    expect(savedScheme.workflowStatus).toBe("DRAFT");
    expect(savedMapping.workflowStatus).toBe("DRAFT");
    await expect(
      repository.submitScheme(savedScheme.id, maker, "Resubmit correction"),
    ).resolves.toMatchObject({ workflowStatus: "SUBMITTED" });
    await expect(
      repository.submitProgrammeMapping(
        savedMapping.id,
        maker,
        "Resubmit correction",
      ),
    ).resolves.toMatchObject({ workflowStatus: "SUBMITTED" });
  });

  it.each([
    ["MANAGEMENT_VIEWER", "management-1"],
    ["AUDITOR", "auditor-1"],
  ])("keeps %s read-only for import and evaluation", async (role, userId) => {
    const repository = createRepositoryFixture();
    const actor = { userId, role };

    await expect(
      repository.importTransactions([purchaseInputFixture()], actor),
    ).rejects.toThrow(`${role} is not authorized to IMPORT_PURCHASE`);
    await expect(
      repository.evaluateTransaction("purchase-1", actor),
    ).rejects.toThrow(`${role} is not authorized to EVALUATE_ELIGIBILITY`);
  });

  it("rejects a command actor outside the configured identity set", async () => {
    const repository = createRepositoryFixture();

    await expect(
      repository.evaluateTransaction("purchase-1", {
        userId: "forged-maker",
        role: "SALES_OPS_MAKER",
      }),
    ).rejects.toThrow("Actor forged-maker is not configured");
  });

  it("records immutable before, after, and provenance on material events", async () => {
    const repository = createRepositoryFixture();
    await repository.submitScheme(
      "scheme-version-draft",
      { userId: "maker-1", role: "SALES_OPS_MAKER" },
      "Ready for review",
    );

    const [event] = await repository.listForEntity(
      "SchemeVersion",
      "scheme-version-draft",
    );
    expect(event).toMatchObject({
      beforeState: { workflowStatus: "DRAFT" },
      afterState: { workflowStatus: "SUBMITTED" },
      provenance: {
        source: "SUBVENTION_REPOSITORY_COMMAND",
        sourceEntityId: "scheme-version-draft",
      },
    });
  });

  it("creates and updates master drafts without changing versioned masters", async () => {
    const repository = createRepositoryFixture();
    const actor = { userId: "master-admin-1", role: "MASTER_DATA_ADMIN" };
    const before = await repository.getSnapshot();
    const product: ProductMasterRecord = {
      id: "product-2",
      kind: "PRODUCT",
      code: "PRODUCT-2",
      name: "Configured Product 2",
      status: "ACTIVE",
      oemId: "oem-1",
      model: "Model 2",
      createdAt: "caller-supplied",
      updatedAt: "caller-supplied",
    };

    const created = await repository.saveMasterDraft(product, {
      actor,
      reason: "Add the approved catalogue item",
      source: "MASTER_DATA_WORKBENCH",
    });
    product.name = "Caller mutation";
    const updated = await repository.saveMasterDraft(
      { ...created, name: "Configured Product 2 updated" },
      {
        actor,
        reason: "Correct the controlled product label",
        source: "MASTER_DATA_WORKBENCH",
      },
    );
    const after = await repository.getSnapshot();

    expect(created).toMatchObject({
      createdAt: "2026-07-28T10:00:00.000Z",
      updatedAt: "2026-07-28T10:00:00.000Z",
    });
    expect(updated.name).toBe("Configured Product 2 updated");
    expect(await repository.listMasters("PRODUCT")).toHaveLength(2);
    expect(after.schemes).toEqual(before.schemes);
    expect(after.programmeMappings).toEqual(before.programmeMappings);
    expect(
      (await repository.listForEntity("MasterRecord", "product-2")).map(
        (event) => event.action,
      ),
    ).toEqual(["MASTER_DRAFT_SAVED", "MASTER_DRAFT_SAVED"]);
  });

  it("blocks deactivation when an approved scheme references the product", async () => {
    const repository = createRepositoryFixture();

    await expect(
      repository.deactivateMaster("product-1", {
        actor: {
          userId: "master-admin-1",
          role: "MASTER_DATA_ADMIN",
        },
        reason: "Retire the product",
        source: "MASTER_DATA_WORKBENCH",
      }),
    ).rejects.toEqual([
      expect.objectContaining({
        code: "MASTER_HAS_ACTIVE_DEPENDENCIES",
        entityId: "product-1",
      }),
    ]);
  });

  it("deactivates an unreferenced master and records reason and provenance", async () => {
    const repository = createRepositoryFixture();
    const actor = { userId: "master-admin-1", role: "MASTER_DATA_ADMIN" };
    const product = await repository.saveMasterDraft(
      {
        id: "product-unreferenced",
        kind: "PRODUCT",
        code: "PRODUCT-UNREFERENCED",
        name: "Unreferenced Product",
        status: "ACTIVE",
        oemId: "oem-1",
        model: "Unreferenced Model",
        createdAt: "caller-supplied",
        updatedAt: "caller-supplied",
      },
      {
        actor,
        reason: "Add a controlled product",
        source: "CONTROLLED_IMPORT",
      },
    );

    await expect(
      repository.deactivateMaster(product.id, {
        actor,
        reason: "Product withdrawn by OEM",
        source: "MASTER_DATA_WORKBENCH",
      }),
    ).resolves.toMatchObject({ status: "INACTIVE" });
    expect(await repository.listMasters("PRODUCT")).toContainEqual(
      expect.objectContaining({
        id: product.id,
        status: "INACTIVE",
        updatedAt: "2026-07-28T10:00:00.000Z",
      }),
    );
    expect(
      (await repository.listForEntity("MasterRecord", product.id))[1],
    ).toMatchObject({
      action: "MASTER_DEACTIVATED",
      remarks: "Product withdrawn by OEM",
      actor,
      beforeState: { status: "ACTIVE" },
      afterState: { status: "INACTIVE" },
      provenance: {
        source: "MASTER_DATA_WORKBENCH",
        sourceEntityId: product.id,
      },
    });
  });

  it.each([
    ["MANAGEMENT_VIEWER", "management-1"],
    ["AUDITOR", "auditor-1"],
  ])("keeps %s read-only for master CRUD", async (role, userId) => {
    const repository = createRepositoryFixture();
    const current = (await repository.listMasters("PRODUCT"))[0]!;

    await expect(
      repository.saveMasterDraft(
        { ...current, name: "Unauthorized update" },
        {
          actor: { userId, role },
          reason: "Attempt unauthorized update",
          source: "MASTER_DATA_WORKBENCH",
        },
      ),
    ).rejects.toThrow(`${role} is not authorized to SAVE master data`);
  });
});
