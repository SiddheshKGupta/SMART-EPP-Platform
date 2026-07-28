import { describe, expect, it } from "vitest";
import {
  type EligibilityDecision,
  type EmployerProgrammeMappingVersion,
  type EvaluateEligibilityInput,
  type PurchaseTransaction,
  type SchemeVersion,
  evaluateEligibility,
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

function mappingFixture(
  overrides: Partial<EmployerProgrammeMappingVersion> = {},
): EmployerProgrammeMappingVersion {
  return {
    id: "mapping-version-1",
    mappingId: "mapping-1",
    version: 1,
    employerId: "employer-1",
    programmeId: "programme-1",
    oemId: "oem-apple",
    schemeVersionId: "scheme-version-1",
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

function schemeFixture(overrides: Partial<SchemeVersion> = {}): SchemeVersion {
  return {
    id: "scheme-version-1",
    schemeId: "scheme-1",
    version: 1,
    code: "APL-H2-26",
    name: "Corporate H2",
    oemId: "oem-apple",
    settlementCounterpartyType: "DISTRIBUTOR",
    calculationBasis: "INVOICE_VALUE",
    rateBps: 350,
    claimTimelineDays: 90,
    priority: 10,
    eligibleProductIds: ["iphone-16"],
    effectiveFrom: "2026-07-01",
    effectiveTo: "2026-12-31",
    requiredDocumentCodes: ["PURCHASE_INVOICE"],
    workflowStatus: "APPROVED",
    makerUserId: "maker-1",
    checkerUserId: "checker-1",
    approvedAt: "2026-06-30T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function eligibilityInputFixture(
  overrides: Partial<EvaluateEligibilityInput> = {},
): EvaluateEligibilityInput {
  return {
    transaction: purchaseFixture(),
    schemes: [schemeFixture()],
    mappings: [mappingFixture()],
    duplicateImeis: new Set(),
    duplicateLeaseIds: new Set(),
    existingClaimedImeis: new Set(),
    existingClaimedLeaseIds: new Set(),
    evaluationDate: "2026-08-01",
    evaluatedAt: "2026-08-01T10:00:00.000Z",
    actor: { userId: "ops-1", role: "SALES_OPS_MAKER" },
    decisionId: "decision-1",
    version: 1,
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
    evaluatedAt: "2026-08-01T10:00:00.000Z",
    evaluatedBy: "ops-1",
    ruleSnapshot: {
      employerProgrammeMappingVersionId: "mapping-version-1",
      schemeVersionId: "scheme-version-1",
      calculationBasis: "INVOICE_VALUE",
      rateBps: 350,
      claimTimelineDays: 90,
      eligibleProductIds: ["iphone-16"],
      settlementCounterpartyType: "DISTRIBUTOR",
      precedenceSources: ["SchemeVersion:scheme-version-1"],
    },
    ruleResults: [],
    ...overrides,
  };
}

describe("subvention eligibility", () => {
  it("returns eligible with expected amount, deadline, and snapshot", () => {
    const decision = evaluateEligibility({
      transaction: purchaseFixture({
        invoiceDate: "2026-07-15",
        invoiceValuePaise: 8_250_000,
      }),
      schemes: [schemeFixture({ rateBps: 350 })],
      mappings: [mappingFixture()],
      duplicateImeis: new Set(),
      duplicateLeaseIds: new Set(),
      existingClaimedImeis: new Set(),
      existingClaimedLeaseIds: new Set(),
      evaluationDate: "2026-08-01",
      evaluatedAt: "2026-08-01T10:00:00.000Z",
      actor: { userId: "ops-1", role: "SALES_OPS_MAKER" },
      decisionId: "decision-1",
      version: 1,
    });

    expect(decision.status).toBe("ELIGIBLE");
    expect(decision.expectedAmountPaise).toBe(288_750);
    expect(decision.filingDeadline).toBe("2026-10-13");
    expect(decision.ruleSnapshot?.schemeVersionId).toBe("scheme-version-1");
    expect(decision.ruleResults.every((rule) => rule.outcome === "PASS")).toBe(
      true,
    );
    expect(decision.ruleResults.map((rule) => rule.code)).toEqual([
      "TRANSACTION_FIELDS_VALID",
      "LEASE_STATUS_ACTIVE",
      "IMEI_UNIQUE",
      "LEASE_UNIQUE",
      "IMEI_NOT_CLAIMED",
      "LEASE_NOT_CLAIMED",
      "PROGRAMME_MAPPING_RESOLVED",
      "PROGRAMME_LAUNCHED",
      "SCHEME_APPROVED",
      "SCHEME_WITHIN_VALIDITY",
      "PRODUCT_ELIGIBLE",
      "RULE_VALUES_RESOLVED",
      "EXPECTED_AMOUNT_CALCULATED",
      "FILING_DEADLINE_CALCULATED",
      "FILING_TIMELINE_CURRENT",
    ]);
  });

  it("returns ineligible for a cancelled lease", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        transaction: purchaseFixture({ leaseStatus: "CANCELLED" }),
      }),
    );

    expect(decision.status).toBe("INELIGIBLE");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("CANCELLED");
  });

  it("returns ineligible for a returned lease", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        transaction: purchaseFixture({ leaseStatus: "RETURNED" }),
      }),
    );

    expect(decision.status).toBe("INELIGIBLE");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("RETURNED");
  });

  it("returns ineligible for a reversed lease", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        transaction: purchaseFixture({ leaseStatus: "REVERSED" }),
      }),
    );

    expect(decision.status).toBe("INELIGIBLE");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("REVERSED");
  });

  it("returns ineligible for a duplicate IMEI", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        duplicateImeis: new Set(["123456789012345"]),
      }),
    );

    expect(decision.status).toBe("INELIGIBLE");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("DUPLICATE_IMEI");
  });

  it("returns ineligible for a duplicate lease", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        duplicateLeaseIds: new Set(["lease-1"]),
      }),
    );

    expect(decision.status).toBe("INELIGIBLE");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("DUPLICATE_LEASE");
  });

  it("returns ineligible when the IMEI was already claimed", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        existingClaimedImeis: new Set(["123456789012345"]),
      }),
    );

    expect(decision.status).toBe("INELIGIBLE");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("ALREADY_CLAIMED_IMEI");
  });

  it("returns ineligible when the lease was already claimed", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        existingClaimedLeaseIds: new Set(["lease-1"]),
      }),
    );

    expect(decision.status).toBe("INELIGIBLE");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("ALREADY_CLAIMED_LEASE");
  });

  it("returns exception review when no programme mapping resolves", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({ mappings: [] }),
    );

    expect(decision.status).toBe("EXCEPTION_REVIEW");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("PROGRAMME_MAPPING_MISSING");
  });

  it("returns exception review when programme mapping is ambiguous", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        mappings: [
          mappingFixture({ id: "mapping-version-1" }),
          mappingFixture({ id: "mapping-version-2" }),
        ],
      }),
    );

    expect(decision.status).toBe("EXCEPTION_REVIEW");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("PROGRAMME_MAPPING_AMBIGUOUS");
  });

  it("returns ineligible before programme launch", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        mappings: [mappingFixture({ launchDate: "2026-08-01" })],
      }),
    );

    expect(decision.status).toBe("INELIGIBLE");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("BEFORE_PROGRAMME_LAUNCH");
  });

  it("returns exception review when the mapped scheme is not approved", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        schemes: [schemeFixture({ workflowStatus: "DRAFT" })],
      }),
    );

    expect(decision.status).toBe("EXCEPTION_REVIEW");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("SCHEME_NOT_APPROVED");
  });

  it("returns exception review when required rule configuration is missing", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        schemes: [schemeFixture({ rateBps: undefined })],
      }),
    );

    expect(decision.status).toBe("EXCEPTION_REVIEW");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("RULE_CONFIGURATION_MISSING");
  });

  it("returns exception review when the scheme is outside validity", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        schemes: [schemeFixture({ effectiveFrom: "2026-08-01" })],
      }),
    );

    expect(decision.status).toBe("EXCEPTION_REVIEW");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("SCHEME_OUTSIDE_VALIDITY");
  });

  it("returns ineligible when the product is not covered", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        transaction: purchaseFixture({ productId: "iphone-17" }),
      }),
    );

    expect(decision.status).toBe("INELIGIBLE");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("PRODUCT_NOT_ELIGIBLE");
  });

  it("returns exception review when the filing timeline expired", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({ evaluationDate: "2026-10-14" }),
    );

    expect(decision.status).toBe("EXCEPTION_REVIEW");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("FILING_TIMELINE_EXPIRED");
  });

  it("links re-evaluation without mutating the previous snapshot", () => {
    const previous = eligibilityDecisionFixture({
      id: "decision-1",
      version: 1,
    });
    const before = structuredClone(previous);
    const current = evaluateEligibility({
      ...eligibilityInputFixture(),
      decisionId: "decision-2",
      version: 2,
      previousDecision: previous,
    });

    expect(current.previousDecisionId).toBe("decision-1");
    expect(current.version).toBe(2);
    expect(previous).toEqual(before);
  });
});
