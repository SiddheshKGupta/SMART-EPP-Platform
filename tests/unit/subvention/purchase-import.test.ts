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
    imei: "351234567890123",
    purchaseOrderNumber: "PO-1001",
    invoiceNumber: "INV-1001",
    invoiceDate: "2026-07-28",
    invoiceValuePaise: 100_000,
    baseValuePaise: 80_000,
    gstAmountPaise: 20_000,
    resellerId: "RES-1001",
    leaseStatus: "ACTIVE",
    sourceSystem: "LMS",
    ...overrides,
  };
}

const importContext = {
  importedAt: "2026-07-28T10:00:00.000Z",
  idForRow: (rowNumber: number) => `txn-${rowNumber}`,
};

describe("purchase imports", () => {
  it("accepts valid rows and quarantines duplicate IMEI independently", () => {
    const valid = purchaseInputFixture({ imei: "351234567890111" });
    const duplicate = purchaseInputFixture({
      leaseId: "LES-2002",
      imei: "351234567890111",
      invoiceNumber: "INV-2002",
    });

    const result = validatePurchaseImport([], [valid, duplicate], importContext);

    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]).toMatchObject({
      id: "txn-1",
      importedAt: "2026-07-28T10:00:00.000Z",
    });
    expect(result.quarantined).toHaveLength(1);
    expect(result.quarantined[0]).toMatchObject({ rowNumber: 2 });
    expect(result.quarantined[0]?.issues[0]?.code).toBe("DUPLICATE_IMEI");
  });

  it("uses source system, lease, IMEI, and invoice as upload key", () => {
    expect(buildPurchaseSourceRowKey(purchaseInputFixture())).toBe(
      "LMS|LES-1001|351234567890123|INV-1001",
    );
  });

  it("quarantines a duplicate lease without suppressing a later valid row", () => {
    const duplicateLease = purchaseInputFixture({
      imei: "351234567890222",
      invoiceNumber: "INV-2002",
    });
    const laterValid = purchaseInputFixture({
      leaseId: "LES-3003",
      imei: "351234567890333",
      invoiceNumber: "INV-3003",
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
          imei: "351234567890222",
          invoiceNumber: "INV-2002",
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
        }),
        purchaseInputFixture({
          leaseId: "LES-3003",
          imei: "351234567890222",
          invoiceNumber: "INV-3003",
        }),
      ],
      importContext,
    );

    expect(result.quarantined[0]?.issues[0]?.code).toBe("DUPLICATE_IMEI");
    expect(result.accepted.map((purchase) => purchase.id)).toEqual(["txn-2"]);
  });
});
