import { describe, expect, it } from "vitest";
import {
  buildPurchaseSourceRowKey,
  type PurchaseTransactionInput,
  validatePurchaseImport,
} from "../../../packages/domain/src";

function purchaseInputFixture(
  overrides: Partial<PurchaseTransactionInput> = {},
): PurchaseTransactionInput {
  return {
    leaseId: "LES-1001",
    lotId: "LOT-1001",
    employeeId: "EMP-1001",
    employerId: "ER-1001",
    programmeId: "PRG-1001",
    oemId: "OEM-1001",
    productId: "PROD-1001",
    productCode: "PHONE-1001",
    connectLegalEntityId: "connect-equipment-leasing",
    deviceIdentifier: "351234567890123",
    purchaseOrderNumber: "PO-1001",
    invoiceNumber: "INV-1001",
    invoiceDate: "2026-07-28",
    invoiceValuePaise: 100_000,
    baseValuePaise: 80_000,
    gstAmountPaise: 20_000,
    resellerId: "RES-1001",
    leaseStatus: "ACTIVE",
    sourceSystem: "LMS",
    sourceEvidence: {
      sourceFileName: "synthetic-purchases.xlsx",
      sourceSheetName: "Transactions",
      sourceRowNumber: 1,
      sourceChecksum: "sha256:synthetic-default",
      rowKind: "TRANSACTION",
      sourceLabels: {},
      counterpartyAliases: {},
      calculationBasis: "INVOICE_VALUE",
      rateBps: 300,
      expectedSubventionPaise: 3_000,
    },
    ...overrides,
  };
}

const importContext = {
  importId: "import-1",
  importedAt: "2026-07-28T10:00:00.000Z",
  importedBy: "maker-1",
  idForRow: (rowNumber: number) => `txn-${rowNumber}`,
  idForQuarantineRow: (rowNumber: number) => `quarantine-${rowNumber}`,
  masterData: {
    employerIds: new Set(["ER-1001"]),
    programmeIds: new Set(["PRG-1001"]),
    oemIds: new Set(["OEM-1001"]),
    productIds: new Set(["PROD-1001"]),
    productCodesByProductId: new Map([
      ["PROD-1001", new Set(["PHONE-1001"])],
    ]),
    connectLegalEntityIds: new Set(["connect-equipment-leasing"]),
    resellerAliases: new Map<string, string>(),
    distributorAliases: new Map<string, string>(),
  },
  programmeMappings: [
    {
      id: "mapping-1",
      mappingId: "mapping-1",
      version: 1,
      employerId: "ER-1001",
      programmeId: "PRG-1001",
      oemId: "OEM-1001",
      schemeVersionId: "scheme-1",
      launchDate: "2026-01-01",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      workflowStatus: "APPROVED" as const,
      makerUserId: "maker-1",
      checkerUserId: "checker-1",
      approvedAt: "2025-12-20T10:00:00.000Z",
      createdAt: "2025-12-10T10:00:00.000Z",
    },
  ],
  existingClaimedDeviceIdentifiers: new Set<string>(),
  existingClaimedLeaseIds: new Set<string>(),
  alternativePartnerDeviceIdentifiers: new Set<string>(),
  alternativePartnerLeaseIds: new Set<string>(),
};

describe("purchase imports", () => {
  it("accepts valid rows and quarantines a duplicate device independently", () => {
    const valid = purchaseInputFixture({
      deviceIdentifier: "351234567890111",
      sourceEvidence: {
        ...purchaseInputFixture().sourceEvidence,
        sourceChecksum: "sha256:row-1",
      },
    });
    const duplicate = purchaseInputFixture({
      leaseId: "LES-2002",
      deviceIdentifier: "351234567890111",
      invoiceNumber: "INV-2002",
      sourceEvidence: {
        ...purchaseInputFixture().sourceEvidence,
        sourceChecksum: "sha256:row-2",
      },
    });

    const result = validatePurchaseImport([], [valid, duplicate], importContext);

    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]).toMatchObject({
      id: "txn-1",
      importedAt: "2026-07-28T10:00:00.000Z",
    });
    expect(result.quarantined).toHaveLength(1);
    expect(result.quarantined[0]).toMatchObject({ rowNumber: 2 });
    expect(result.quarantined[0]?.issues[0]?.code).toBe(
      "DUPLICATE_DEVICE_IDENTIFIER",
    );
  });

  it("uses immutable source provenance as the upload key", () => {
    expect(buildPurchaseSourceRowKey(purchaseInputFixture())).toBe(
      '["sha256:synthetic-default","Transactions",1]',
    );
  });

  it("accepts distinct rows whose source-key values contain delimiters", () => {
    const first = purchaseInputFixture({
      leaseId: "A|B",
      deviceIdentifier: "12345678",
      invoiceNumber: "INV-1001",
      sourceEvidence: {
        ...purchaseInputFixture().sourceEvidence,
        sourceChecksum: "sha256:delimited-1",
      },
    });
    const second = purchaseInputFixture({
      leaseId: "A",
      deviceIdentifier: "B|12345678",
      invoiceNumber: "INV-1001",
      sourceEvidence: {
        ...purchaseInputFixture().sourceEvidence,
        sourceChecksum: "sha256:delimited-2",
      },
    });

    const result = validatePurchaseImport([], [first, second], importContext);

    expect(result.accepted).toHaveLength(2);
    expect(result.quarantined).toHaveLength(0);
  });

  it("quarantines a duplicate lease without suppressing a later valid row", () => {
    const duplicateLease = purchaseInputFixture({
      deviceIdentifier: "351234567890222",
      invoiceNumber: "INV-2002",
      sourceEvidence: {
        ...purchaseInputFixture().sourceEvidence,
        sourceChecksum: "sha256:duplicate-lease",
      },
    });
    const laterValid = purchaseInputFixture({
      leaseId: "LES-3003",
      deviceIdentifier: "351234567890333",
      invoiceNumber: "INV-3003",
      sourceEvidence: {
        ...purchaseInputFixture().sourceEvidence,
        sourceChecksum: "sha256:later-valid",
      },
    });

    const result = validatePurchaseImport(
      [],
      [purchaseInputFixture(), duplicateLease, laterValid],
      importContext,
    );

    expect(result.accepted.map((purchase) => purchase.id)).toEqual([
      "txn-1",
      "txn-3",
    ]);
    expect(result.quarantined[0]?.issues[0]?.code).toBe("DUPLICATE_LEASE");
  });

  it("quarantines a duplicate source-row key", () => {
    const result = validatePurchaseImport(
      [],
      [
        purchaseInputFixture(),
        purchaseInputFixture({
          purchaseOrderNumber: "PO-2002",
        }),
      ],
      importContext,
    );

    expect(result.accepted).toHaveLength(1);
    expect(result.quarantined[0]?.issues[0]?.code).toBe(
      "DUPLICATE_SOURCE_ROW_KEY",
    );
  });

  it("quarantines a missing mandatory field without suppressing a later valid row", () => {
    const result = validatePurchaseImport(
      [],
      [
        purchaseInputFixture({ employeeId: "" }),
        purchaseInputFixture({
          leaseId: "LES-2002",
          deviceIdentifier: "351234567890222",
          invoiceNumber: "INV-2002",
          sourceEvidence: {
            ...purchaseInputFixture().sourceEvidence,
            sourceChecksum: "sha256:valid-after-invalid",
          },
        }),
      ],
      importContext,
    );

    expect(result.accepted.map((purchase) => purchase.id)).toEqual(["txn-2"]);
    expect(result.quarantined[0]?.issues[0]?.code).toBe(
      "MANDATORY_FIELD_MISSING",
    );
    expect(result.quarantined[0]?.issues[0]?.field).toBe("employeeId");
  });

  it("quarantines a zero invoice value", () => {
    const result = validatePurchaseImport(
      [],
      [purchaseInputFixture({ invoiceValuePaise: 0 })],
      importContext,
    );

    expect(result.accepted).toHaveLength(0);
    expect(result.quarantined[0]?.issues[0]).toMatchObject({
      code: "ZERO_VALUE",
      field: "invoiceValuePaise",
    });
  });

  it("quarantines duplicates against existing purchases", () => {
    const existing = {
      ...purchaseInputFixture(),
      id: "txn-existing",
      importedAt: "2026-07-27T10:00:00.000Z",
    };
    const result = validatePurchaseImport(
      [existing],
      [
        purchaseInputFixture({
          leaseId: "LES-2002",
          invoiceNumber: "INV-2002",
          sourceEvidence: {
            ...purchaseInputFixture().sourceEvidence,
            sourceChecksum: "sha256:existing-duplicate-device",
          },
        }),
        purchaseInputFixture({
          leaseId: "LES-3003",
          deviceIdentifier: "351234567890222",
          invoiceNumber: "INV-3003",
          sourceEvidence: {
            ...purchaseInputFixture().sourceEvidence,
            sourceChecksum: "sha256:existing-valid",
          },
        }),
      ],
      importContext,
    );

    expect(result.quarantined[0]?.issues[0]?.code).toBe(
      "DUPLICATE_DEVICE_IDENTIFIER",
    );
    expect(result.accepted.map((purchase) => purchase.id)).toEqual(["txn-2"]);
  });
});
