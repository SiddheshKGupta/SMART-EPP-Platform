import { describe, expect, it } from "vitest";
import {
  masterDependencies,
  validateMasterRecord,
  type MasterCatalogue,
  type MasterDependencySnapshot,
  type ResellerMasterRecord,
} from "../../../packages/domain/src";

const catalogue: MasterCatalogue = {
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
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
  ],
  distributors: [
    {
      id: "distributor-1",
      kind: "DISTRIBUTOR",
      code: "DIST-1",
      name: "National Distributor",
      status: "ACTIVE",
      oemId: "oem-1",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
  ],
  resellers: [],
  products: [
    {
      id: "product-1",
      kind: "PRODUCT",
      code: "PRODUCT-1",
      name: "Enterprise Phone",
      status: "ACTIVE",
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
  kind: "RESELLER",
  code: "RESELLER-1",
  name: "Configured Reseller",
  status: "ACTIVE",
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
      { ...reseller, id: "reseller-2" },
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
});
