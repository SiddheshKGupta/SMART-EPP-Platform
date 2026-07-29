import { describe, expect, it } from "vitest";
import {
  type EmployerProgrammeMappingVersion,
  type PurchaseTransaction,
  type SchemeVersion,
  resolveEffectiveRules,
  resolveProgrammeMapping,
} from "../../../packages/domain/src";

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
    oemId: "oem-apple",
    productId: "iphone-16",
    productCode: "APL-IPHONE-16",
    connectLegalEntityId: "connect-equipment-leasing",
    deviceIdentifier: "123456789012345",
    purchaseOrderNumber: "PO-1",
    invoiceNumber: "INV-1",
    invoiceDate: "2026-07-01",
    invoiceValuePaise: 8_250_050,
    baseValuePaise: 7_000_000,
    gstAmountPaise: 1_250_050,
    resellerId: "reseller-1",
    leaseStatus: "ACTIVE",
    sourceSystem: "LMS",
    sourceEvidence: {
      sourceFileName: "synthetic-programme.xlsx",
      sourceSheetName: "Transactions",
      sourceRowNumber: 2,
      sourceChecksum: "sha256:synthetic-programme",
      rowKind: "TRANSACTION",
      sourceLabels: {},
      counterpartyAliases: {},
      calculationBasis: "INVOICE_VALUE",
      rateBps: 350,
      expectedSubventionPaise: 288_752,
    },
    importedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function mappingFixture(
  overrides: Partial<EmployerProgrammeMappingVersion> = {},
): EmployerProgrammeMappingVersion {
  return {
    id: "map-v1",
    mappingId: "mapping-1",
    version: 1,
    employerId: "employer-1",
    programmeId: "programme-1",
    oemId: "oem-apple",
    schemeVersionId: "scheme-v1",
    launchDate: "2026-07-01",
    effectiveFrom: "2026-07-01",
    effectiveTo: "2026-09-30",
    workflowStatus: "APPROVED",
    makerUserId: "maker-1",
    checkerUserId: "checker-1",
    approvedAt: "2026-06-30T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function schemeFixture(overrides: Partial<SchemeVersion> = {}): SchemeVersion {
  return {
    id: "scheme-v1",
    schemeId: "scheme-1",
    version: 1,
    code: "APL-Q3-26",
    name: "Corporate Q3",
    oemId: "oem-apple",
    settlementCounterpartyType: "DISTRIBUTOR",
    calculationBasis: "INVOICE_VALUE",
    rateBps: 350,
    claimTimelineDays: 90,
    priority: 10,
    eligibleProductIds: ["iphone-16"],
    effectiveFrom: "2026-07-01",
    effectiveTo: "2026-09-30",
    requiredDocumentCodes: ["PURCHASE_INVOICE"],
    workflowStatus: "APPROVED",
    makerUserId: "maker-1",
    checkerUserId: "checker-1",
    approvedAt: "2026-06-30T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("employer programme mapping resolution", () => {
  it("returns the sole approved mapping matching the invoice date", () => {
    const result = resolveProgrammeMapping(purchaseFixture(), [
      mappingFixture({ workflowStatus: "DRAFT" }),
      mappingFixture({ id: "map-v1", effectiveFrom: "2026-07-01" }),
    ]);

    expect(result).toMatchObject({
      status: "RESOLVED",
      mapping: { id: "map-v1" },
    });
  });

  it("returns missing when no approved mapping matches", () => {
    const result = resolveProgrammeMapping(purchaseFixture(), [
      mappingFixture({ employerId: "employer-2" }),
    ]);

    expect(result.status).toBe("MISSING");
    if (result.status === "MISSING") {
      expect(result.issues[0]?.code).toBe("PROGRAMME_MAPPING_MISSING");
    }
  });

  it("returns ambiguous when two approved mappings match", () => {
    const transaction = purchaseFixture();
    const mappings = [
      mappingFixture({ id: "map-v1" }),
      mappingFixture({ id: "map-v2" }),
    ];
    const result = resolveProgrammeMapping(transaction, mappings);

    expect(result.status).toBe("AMBIGUOUS");
    if (result.status === "AMBIGUOUS") {
      expect(result.issues[0]?.code).toBe("PROGRAMME_MAPPING_AMBIGUOUS");
    }
  });

  it("treats mapping effective-date boundaries as inclusive", () => {
    const result = resolveProgrammeMapping(
      purchaseFixture({ invoiceDate: "2026-09-30" }),
      [mappingFixture()],
    );

    expect(result).toMatchObject({
      status: "RESOLVED",
      mapping: { id: "map-v1" },
    });
  });

  it("resolves the mapping independently of programme launch-date eligibility", () => {
    const result = resolveProgrammeMapping(
      purchaseFixture({ invoiceDate: "2026-07-10" }),
      [mappingFixture({ launchDate: "2026-08-01" })],
    );

    expect(result).toMatchObject({
      status: "RESOLVED",
      mapping: { id: "map-v1" },
    });
  });

  it("does not resolve a mapping constrained to another reseller", () => {
    const result = resolveProgrammeMapping(purchaseFixture(), [
      mappingFixture({ resellerId: "reseller-2" }),
    ]);

    expect(result.status).toBe("MISSING");
  });

  it("selects the configured distributor path when mappings share employer scope", () => {
    const result = resolveProgrammeMapping(
      purchaseFixture({ distributorId: "distributor-redington" }),
      [
        mappingFixture({
          id: "map-ingram",
          distributorId: "distributor-ingram",
        }),
        mappingFixture({
          id: "map-redington",
          distributorId: "distributor-redington",
        }),
      ],
    );

    expect(result).toMatchObject({
      status: "RESOLVED",
      mapping: { id: "map-redington" },
    });
  });
});

describe("effective programme rules", () => {
  it("applies approved programme override before scheme values", () => {
    const snapshot = resolveEffectiveRules(
      mappingFixture({
        overrides: {
          calculationBasis: "BASE_VALUE",
          rateBps: 300,
          approvalReference: "BH-APR-2026-014",
        },
      }),
      schemeFixture({
        calculationBasis: "INVOICE_VALUE",
        rateBps: 350,
      }),
    );

    expect(snapshot.calculationBasis).toBe("BASE_VALUE");
    expect(snapshot.rateBps).toBe(300);
    expect(snapshot.precedenceSources[0]).toContain("EmployerProgramme");
  });

  it("uses configured OEM defaults only for a missing scheme value", () => {
    const snapshot = resolveEffectiveRules(
      mappingFixture(),
      schemeFixture({ rateBps: undefined }),
      { oemId: "oem-apple", rateBps: 275 },
    );

    expect(snapshot.rateBps).toBe(275);
    expect(snapshot.precedenceSources).toContain("OemDefault:oem-apple");
  });

  it("copies programme override product eligibility into the snapshot", () => {
    const mapping = mappingFixture({
      overrides: {
        eligibleProductIds: ["iphone-16"],
        approvalReference: "BH-APR-2026-014",
      },
    });
    const snapshot = resolveEffectiveRules(mapping, schemeFixture());

    mapping.overrides?.eligibleProductIds?.push("iphone-17");
    snapshot.eligibleProductIds.push("iphone-18");

    expect(snapshot.eligibleProductIds).toEqual(["iphone-16", "iphone-18"]);
    expect(mapping.overrides?.eligibleProductIds).toEqual([
      "iphone-16",
      "iphone-17",
    ]);
  });

  it("copies scheme product eligibility into the snapshot", () => {
    const scheme = schemeFixture({ eligibleProductIds: ["iphone-16"] });
    const snapshot = resolveEffectiveRules(mappingFixture(), scheme);

    scheme.eligibleProductIds.push("iphone-17");
    snapshot.eligibleProductIds.push("iphone-18");

    expect(snapshot.eligibleProductIds).toEqual(["iphone-16", "iphone-18"]);
    expect(scheme.eligibleProductIds).toEqual(["iphone-16", "iphone-17"]);
  });

  it("rejects a percentage basis with no effective rate", () => {
    expect(() =>
      resolveEffectiveRules(
        mappingFixture(),
        schemeFixture({ rateBps: undefined }),
      ),
    ).toThrow("No effective rate basis points is configured");
  });

  it("rejects a flat basis with no effective flat amount", () => {
    expect(() =>
      resolveEffectiveRules(
        mappingFixture(),
        schemeFixture({
          calculationBasis: "FLAT_AMOUNT",
          rateBps: undefined,
          flatAmountPaise: undefined,
        }),
      ),
    ).toThrow("No effective flat amount is configured");
  });

  it("records only the sources that supply resolved values", () => {
    const snapshot = resolveEffectiveRules(
      mappingFixture({
        overrides: { rateBps: 300, approvalReference: "BH-APR-2026-014" },
      }),
      schemeFixture({ rateBps: undefined }),
      { oemId: "oem-apple", rateBps: 275 },
    );

    expect(snapshot.rateBps).toBe(300);
    expect(snapshot.precedenceSources).toContain(
      "EmployerProgrammeOverride:map-v1:BH-APR-2026-014",
    );
    expect(snapshot.precedenceSources).not.toContain("OemDefault:oem-apple");
  });

  it("requires an approval reference for programme overrides", () => {
    expect(() =>
      resolveEffectiveRules(
        mappingFixture({
          overrides: { rateBps: 300, approvalReference: "" },
        }),
        schemeFixture(),
      ),
    ).toThrow("Programme override requires an approval reference");
  });

  it("requires the mapped scheme version to be approved", () => {
    expect(() =>
      resolveEffectiveRules(
        mappingFixture({ schemeVersionId: "scheme-v2" }),
        schemeFixture({ id: "scheme-v2", workflowStatus: "DRAFT" }),
      ),
    ).toThrow("Mapped scheme version must be approved");
  });
});
