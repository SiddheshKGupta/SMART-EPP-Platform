import { describe, expect, it } from "vitest";
import {
  masterDependencies,
  validateMasterVersionApproval,
  validateMasterRecord,
  type MasterCatalogue,
  type MasterDependencySnapshot,
  type ResellerMasterRecord,
} from "../../../packages/domain/src";
import { createDemoSubventionRepository } from "../../../apps/web/features/subvention/data/seed";

const approvedFields = (id: string) => ({
  logicalId: id,
  version: 1,
  workflowStatus: "APPROVED" as const,
  effectiveFrom: "2026-01-01",
  effectiveTo: "2026-12-31",
  makerUserId: "master-data-admin",
  checkerUserId: "business-head-checker",
  approvedAt: "2025-12-20T00:00:00.000Z",
});

const catalogue: MasterCatalogue = {
  oems: [
    {
      id: "oem-1",
      ...approvedFields("oem-1"),
      kind: "OEM",
      code: "OEM-1",
      name: "Configured OEM",
      defaultClaimTimelineDays: 90,
      defaultCalculationBasis: "INVOICE_VALUE",
      defaultSettlementCounterpartyType: "DISTRIBUTOR",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
  ],
  distributors: [
    {
      id: "distributor-1",
      ...approvedFields("distributor-1"),
      kind: "DISTRIBUTOR",
      code: "DIST-1",
      name: "National Distributor",
      oemId: "oem-1",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
  ],
  resellers: [],
  products: [
    {
      id: "product-1",
      ...approvedFields("product-1"),
      kind: "PRODUCT",
      code: "PRODUCT-1",
      name: "Enterprise Phone",
      oemId: "oem-1",
      model: "Enterprise Phone 1",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
  ],
  employers: [],
};

const reseller: ResellerMasterRecord = {
  id: "reseller-1",
  ...approvedFields("reseller-1"),
  kind: "RESELLER",
  code: "RESELLER-1",
  name: "Configured Reseller",
  oemId: "oem-1",
  distributorId: "distributor-1",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

describe("master data contracts", () => {
  it("rejects a reseller whose OEM does not exist", () => {
    const issues = validateMasterRecord(reseller, {
      ...catalogue,
      oems: [],
    });

    expect(issues.map((item) => item.code)).toContain(
      "MASTER_OEM_NOT_FOUND",
    );
  });

  it("rejects a duplicate code within the same master catalogue", () => {
    const issues = validateMasterRecord(
      { ...reseller, id: "reseller-2", logicalId: "reseller-2" },
      {
        ...catalogue,
        resellers: [reseller],
      },
    );

    expect(issues).toContainEqual(
      expect.objectContaining({ code: "MASTER_CODE_DUPLICATE" }),
    );
  });

  it("reports an approved scheme that depends on a product", () => {
    const snapshot: MasterDependencySnapshot = {
      masters: catalogue,
      schemes: [
        {
          id: "scheme-version-1",
          schemeId: "scheme-1",
          version: 1,
          code: "SCHEME-1",
          name: "Approved scheme",
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
          workflowStatus: "APPROVED",
          makerUserId: "master-admin-1",
          checkerUserId: "checker-1",
          approvedAt: "2026-06-30T00:00:00.000Z",
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      programmeMappings: [],
    };

    expect(masterDependencies("product-1", snapshot)).toContainEqual(
      expect.objectContaining({
        entityType: "SchemeVersion",
        entityId: "scheme-version-1",
      }),
    );
  });

  it("rejects an approved successor whose effective window overlaps its predecessor", () => {
    const predecessor = {
      ...catalogue.products[0]!,
    };
    const successor = {
      ...predecessor,
      id: "product-1-v2",
      version: 2,
      workflowStatus: "SUBMITTED" as const,
      effectiveFrom: "2026-12-31",
      effectiveTo: "2027-12-31",
      checkerUserId: undefined,
      approvedAt: undefined,
      supersedesVersionId: predecessor.id,
    };

    expect(
      validateMasterVersionApproval(successor, {
        ...catalogue,
        products: [predecessor],
      }),
    ).toContainEqual(expect.objectContaining({ code: "MASTER_VERSION_OVERLAP" }));
  });

  it("keeps approved records immutable and creates a controlled successor draft", async () => {
    const repository = createDemoSubventionRepository();
    const admin = { userId: "master-data-admin", role: "MASTER_DATA_ADMIN" };
    const approved = (await repository.listMasters("PRODUCT")).find(
      (record) => record.id === "apple-phone-16",
    )!;

    await expect(
      repository.saveMasterDraft(
        { ...approved, name: "Mutated approved product" },
        {
          actor: admin,
          reason: "Attempt in-place change",
          source: "MASTER_DATA_WORKBENCH",
        },
      ),
    ).rejects.toThrow("Approved master version is immutable");

    const successor = await repository.createNextMasterVersion(
      approved.id,
      {
        actor: admin,
        reason: "Prepare the next effective product version",
        source: "MASTER_DATA_WORKBENCH",
      },
      { effectiveFrom: "2027-01-01", effectiveTo: "2027-12-31" },
    );

    expect(successor).toMatchObject({
      logicalId: approved.logicalId,
      version: 2,
      workflowStatus: "DRAFT",
      makerUserId: admin.userId,
      supersedesVersionId: approved.id,
    });
    expect(await repository.listMasters("PRODUCT")).toHaveLength(7);
  });

  it("requires an independent checker and supersedes the approved predecessor", async () => {
    const repository = createDemoSubventionRepository();
    const admin = { userId: "master-data-admin", role: "MASTER_DATA_ADMIN" };
    const checker = {
      userId: "business-head-checker",
      role: "BUSINESS_HEAD_CHECKER",
    };
    const approved = (await repository.listMasters("PRODUCT")).find(
      (record) => record.id === "apple-phone-16",
    )!;
    const successor = await repository.createNextMasterVersion(
      approved.id,
      {
        actor: admin,
        reason: "Prepare successor",
        source: "MASTER_DATA_WORKBENCH",
      },
      { effectiveFrom: "2027-01-01", effectiveTo: "2027-12-31" },
    );
    await repository.submitMaster(successor.id, {
      actor: admin,
      reason: "Submit verified successor",
      source: "MASTER_DATA_WORKBENCH",
    });

    await expect(
      repository.approveMaster(successor.id, {
        actor: { ...admin, role: "BUSINESS_HEAD_CHECKER" },
        reason: "Self approval",
        source: "MASTER_DATA_WORKBENCH",
      }),
    ).rejects.toThrow("Actor master-data-admin is not configured");

    await repository.approveMaster(successor.id, {
      actor: checker,
      reason: "Effective window and hierarchy verified",
      source: "MASTER_DATA_WORKBENCH",
    });

    const versions = await repository.listMasters("PRODUCT");
    expect(versions.find((record) => record.id === approved.id)?.workflowStatus).toBe(
      "SUPERSEDED",
    );
    expect(versions.find((record) => record.id === successor.id)).toMatchObject({
      workflowStatus: "APPROVED",
      checkerUserId: checker.userId,
    });
  });

  it("returns a submitted version for correction without losing history", async () => {
    const repository = createDemoSubventionRepository();
    const admin = { userId: "master-data-admin", role: "MASTER_DATA_ADMIN" };
    const checker = {
      userId: "business-head-checker",
      role: "BUSINESS_HEAD_CHECKER",
    };
    const approved = (await repository.listMasters("OEM")).find(
      (record) => record.id === "oem-apple",
    )!;
    const successor = await repository.createNextMasterVersion(
      approved.id,
      {
        actor: admin,
        reason: "Prepare successor",
        source: "MASTER_DATA_WORKBENCH",
      },
      { effectiveFrom: "2027-01-01", effectiveTo: "2027-12-31" },
    );
    await repository.submitMaster(successor.id, {
      actor: admin,
      reason: "Submit configuration",
      source: "MASTER_DATA_WORKBENCH",
    });
    const returned = await repository.returnMaster(successor.id, {
      actor: checker,
      reason: "Correct the default filing timeline",
      source: "MASTER_DATA_WORKBENCH",
    });

    expect(returned.workflowStatus).toBe("RETURNED");
    await expect(
      repository.saveMasterDraft(
        { ...returned, defaultClaimTimelineDays: 75 },
        {
          actor: admin,
          reason: "Apply checker correction",
          source: "MASTER_DATA_WORKBENCH",
        },
      ),
    ).resolves.toMatchObject({ workflowStatus: "DRAFT" });
    expect(
      (await repository.listForEntity("MasterRecord", successor.id)).map(
        (event) => event.action,
      ),
    ).toEqual([
      "MASTER_SUCCESSOR_CREATED",
      "MASTER_SUBMITTED",
      "MASTER_RETURNED",
      "MASTER_DRAFT_SAVED",
    ]);
  });
});
