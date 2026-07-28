import { describe, expect, it } from "vitest";
import type {
  EligibilityDecision,
  EmployerProgrammeMappingVersion,
  PurchaseTransaction,
  PurchaseTransactionInput,
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

function seedFixture(overrides: Partial<SubventionSeed> = {}): SubventionSeed {
  return {
    oems: [{ id: "oem-1", name: "Configured OEM" }],
    schemes: [
      schemeFixture(),
      schemeFixture({
        id: "scheme-version-approved",
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

function createRepositoryFixture(seed = seedFixture()) {
  let sequence = 0;
  return new InMemorySubventionRepository(seed, {
    now: () => "2026-07-28T10:00:00.000Z",
    nextId: (prefix) => `${prefix}-${++sequence}`,
  });
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
});
