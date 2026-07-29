import { describe, expect, it } from "vitest";
import {
  buildPurchaseSourceRowKey,
  purchaseTransactionInputSchema,
  validatePurchaseImport,
  type PurchaseImportMasterData,
  type PurchaseTransactionInput,
} from "../../../packages/domain/src";

const masterData: PurchaseImportMasterData = {
  employerIds: new Set(["employer-alpha"]),
  programmeIds: new Set(["programme-apple"]),
  oemIds: new Set(["oem-apple"]),
  productIds: new Set(["product-phone"]),
  connectLegalEntityIds: new Set([
    "connect-equipment-leasing",
    "connect-residuary",
  ]),
  resellerAliases: new Map([
    ["Radius Systems Private Limited", "reseller-radius"],
  ]),
  distributorAliases: new Map([["Ingram", "distributor-ingram"]]),
};

function evidenceInput(
  overrides: Partial<PurchaseTransactionInput> = {},
): PurchaseTransactionInput {
  return {
    leaseId: "LES-1001",
    lotId: "LOT-1001",
    employeeId: "employee-1001",
    employerId: "employer-alpha",
    programmeId: "programme-apple",
    oemId: "oem-apple",
    productId: "product-phone",
    productCode: "APL-PHONE-16",
    connectLegalEntityId: "connect-equipment-leasing",
    deviceIdentifier: "351234567890123",
    purchaseOrderNumber: "PO-1001",
    invoiceNumber: "INV-1001",
    invoiceDate: "2026-04-15",
    invoiceValuePaise: 8_260_000,
    baseValuePaise: 7_000_000,
    gstAmountPaise: 1_260_000,
    resellerId: "reseller-radius",
    distributorId: "distributor-ingram",
    leaseStatus: "ACTIVE",
    sourceSystem: "CONTROLLED_UPLOAD",
    sourceEvidence: {
      sourceFileName: "source-purchases-april.xlsx",
      sourceSheetName: "Transactions",
      sourceRowNumber: 12,
      sourceChecksum: "sha256:synthetic-april-evidence",
      rowKind: "TRANSACTION",
      sourceLabels: {
        employer: "Employer Alpha",
        connectLegalEntity: "Connect Equipment Leasing",
        product: "Phone 16",
      },
      counterpartyAliases: {
        reseller: "Radius Systems Private Limited",
        distributor: "Ingram",
      },
      calculationBasis: "BASE_VALUE",
      rateBps: 300,
      expectedSubventionPaise: 210_000,
    },
    ...overrides,
  };
}

const importContext = {
  importedAt: "2026-07-28T10:00:00.000Z",
  idForRow: (rowNumber: number) => `transaction-${rowNumber}`,
  masterData,
};

describe("purchase evidence contract", () => {
  it.each(["351234567890123", "SN-ALPHA-01"])(
    "accepts canonical device identifier %s without an IMEI field",
    (deviceIdentifier) => {
      const input = evidenceInput({ deviceIdentifier });
      expect("imei" in input).toBe(false);
      expect(purchaseTransactionInputSchema.safeParse(input).success).toBe(
        true,
      );
    },
  );

  it("uses immutable source provenance as the upload row key", () => {
    expect(buildPurchaseSourceRowKey(evidenceInput())).toBe(
      '["sha256:synthetic-april-evidence","Transactions",12]',
    );
  });

  it("preserves calculation and counterparty source evidence on acceptance", () => {
    const result = validatePurchaseImport(
      [],
      [evidenceInput({ deviceIdentifier: "SN-ALPHA-01" })],
      importContext,
    );

    expect(result.quarantined).toEqual([]);
    expect(result.accepted[0]).toMatchObject({
      deviceIdentifier: "SN-ALPHA-01",
      productCode: "APL-PHONE-16",
      connectLegalEntityId: "connect-equipment-leasing",
      sourceEvidence: {
        calculationBasis: "BASE_VALUE",
        rateBps: 300,
        expectedSubventionPaise: 210_000,
        counterpartyAliases: {
          reseller: "Radius Systems Private Limited",
          distributor: "Ingram",
        },
      },
    });
  });

  it.each([
    [
      "formula row",
      evidenceInput({
        sourceEvidence: {
          ...evidenceInput().sourceEvidence,
          rowKind: "FORMULA",
        },
      }),
      "FORMULA_ROW",
    ],
    [
      "control row",
      evidenceInput({
        sourceEvidence: {
          ...evidenceInput().sourceEvidence,
          rowKind: "CONTROL",
        },
      }),
      "CONTROL_ROW",
    ],
    [
      "unresolved employer",
      evidenceInput({ employerId: "employer-unresolved" }),
      "UNRESOLVED_EMPLOYER",
    ],
    [
      "unresolved programme",
      evidenceInput({ programmeId: "programme-unresolved" }),
      "UNRESOLVED_PROGRAMME",
    ],
    [
      "unresolved product",
      evidenceInput({ productId: "product-unresolved" }),
      "UNRESOLVED_PRODUCT",
    ],
    [
      "unresolved legal entity",
      evidenceInput({ connectLegalEntityId: "connect-unresolved" }),
      "UNRESOLVED_CONNECT_LEGAL_ENTITY",
    ],
    [
      "unresolved alias",
      evidenceInput({
        sourceEvidence: {
          ...evidenceInput().sourceEvidence,
          counterpartyAliases: {
            ...evidenceInput().sourceEvidence.counterpartyAliases,
            reseller: "Ambiguous reseller alias",
          },
        },
      }),
      "UNRESOLVED_COUNTERPARTY_ALIAS",
    ],
  ] as const)(
    "quarantines %s atomically",
    (_label, input, expectedIssueCode) => {
      const result = validatePurchaseImport([], [input], importContext);

      expect(result.accepted).toEqual([]);
      expect(result.quarantined).toHaveLength(1);
      expect(
        result.quarantined[0]?.issues.map((found) => found.code),
      ).toContain(expectedIssueCode);
    },
  );
});
