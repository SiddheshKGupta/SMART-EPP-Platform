import { describe, expect, it } from "vitest";
import {
  buildPurchaseSourceRowKey,
  purchaseTransactionInputSchema,
  validatePurchaseImport,
  type EmployerProgrammeMappingVersion,
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
  distributorAliases: new Map([
    ["Ingram", "distributor-ingram"],
    ["Redington", "distributor-redington"],
  ]),
};

const configuredMapping: EmployerProgrammeMappingVersion = {
  id: "mapping-alpha-ingram",
  mappingId: "mapping-alpha-ingram",
  version: 1,
  employerId: "employer-alpha",
  programmeId: "programme-apple",
  oemId: "oem-apple",
  schemeVersionId: "scheme-apple",
  resellerId: "reseller-radius",
  distributorId: "distributor-ingram",
  launchDate: "2026-01-01",
  effectiveFrom: "2026-01-01",
  effectiveTo: "2026-12-31",
  workflowStatus: "APPROVED",
  makerUserId: "maker-1",
  checkerUserId: "checker-1",
  approvedAt: "2025-12-20T10:00:00.000Z",
  createdAt: "2025-12-10T10:00:00.000Z",
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
  importId: "import-evidence-1",
  importedAt: "2026-07-28T10:00:00.000Z",
  importedBy: "maker-1",
  idForRow: (rowNumber: number) => `transaction-${rowNumber}`,
  idForQuarantineRow: (rowNumber: number) =>
    `quarantine-evidence-${rowNumber}`,
  masterData: {
    ...masterData,
    productCodesByProductId: new Map([
      ["product-phone", new Set(["APL-PHONE-16"])],
    ]),
  },
  programmeMappings: [configuredMapping],
  existingClaimedDeviceIdentifiers: new Set<string>(),
  existingClaimedLeaseIds: new Set<string>(),
  alternativePartnerDeviceIdentifiers: new Set<string>(),
  alternativePartnerLeaseIds: new Set<string>(),
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

  it.each([
    [
      "device identifier already used by an approved claim",
      evidenceInput(),
      {
        existingClaimedDeviceIdentifiers: new Set(["351234567890123"]),
      },
      "ALREADY_CLAIMED_DEVICE_IDENTIFIER",
    ],
    [
      "lease identifier already used by an approved claim",
      evidenceInput(),
      { existingClaimedLeaseIds: new Set(["LES-1001"]) },
      "ALREADY_CLAIMED_LEASE",
    ],
    [
      "device identifier submitted through another partner",
      evidenceInput(),
      {
        alternativePartnerDeviceIdentifiers: new Set([
          "351234567890123",
        ]),
      },
      "ALTERNATIVE_PARTNER_DEVICE_IDENTIFIER",
    ],
    [
      "lease identifier submitted through another partner",
      evidenceInput(),
      {
        alternativePartnerLeaseIds: new Set(["LES-1001"]),
      },
      "ALTERNATIVE_PARTNER_LEASE",
    ],
    [
      "product code incompatible with the resolved product",
      evidenceInput({ productCode: "APL-PHONE-17" }),
      {},
      "PRODUCT_CODE_MISMATCH",
    ],
    [
      "counterparties incompatible with the configured mapping",
      evidenceInput({
        distributorId: "distributor-redington",
        sourceEvidence: {
          ...evidenceInput().sourceEvidence,
          counterpartyAliases: {
            ...evidenceInput().sourceEvidence.counterpartyAliases,
            distributor: "Redington",
          },
        },
      }),
      {},
      "PROGRAMME_MAPPING_MISSING",
    ],
  ] as const)(
    "quarantines %s as one row",
    (_label, input, contextOverrides, expectedIssueCode) => {
      const result = validatePurchaseImport([], [input], {
        ...importContext,
        ...contextOverrides,
      });

      expect(result.accepted).toEqual([]);
      expect(result.quarantined).toHaveLength(1);
      expect(
        result.quarantined[0]?.issues.map((found) => found.code),
      ).toContain(expectedIssueCode);
    },
  );
});
