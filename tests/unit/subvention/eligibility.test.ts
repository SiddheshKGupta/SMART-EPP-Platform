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
    productCode: "APL-IPHONE-16",
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
      sourceFileName: "synthetic-eligibility.xlsx",
      sourceSheetName: "Transactions",
      sourceRowNumber: 2,
      sourceChecksum: "sha256:synthetic-eligibility",
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
    duplicateDeviceIdentifiers: new Set(),
    duplicateLeaseIds: new Set(),
    existingClaimedDeviceIdentifiers: new Set(),
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
      duplicateDeviceIdentifiers: new Set(),
      duplicateLeaseIds: new Set(),
      existingClaimedDeviceIdentifiers: new Set(),
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
      "DEVICE_IDENTIFIER_UNIQUE",
      "LEASE_UNIQUE",
      "DEVICE_IDENTIFIER_NOT_CLAIMED",
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

  it("returns ineligible for a duplicate device identifier", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        duplicateDeviceIdentifiers: new Set(["123456789012345"]),
      }),
    );

    expect(decision.status).toBe("INELIGIBLE");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("DUPLICATE_DEVICE_IDENTIFIER");
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

  it("returns ineligible when the device identifier was already claimed", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        existingClaimedDeviceIdentifiers: new Set(["123456789012345"]),
      }),
    );

    expect(decision.status).toBe("INELIGIBLE");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("ALREADY_CLAIMED_DEVICE_IDENTIFIER");
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

  it("returns review with zero eligible value when product scope has no mapping", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({
        transaction: purchaseFixture({ productId: "iphone-17" }),
      }),
    );

    expect(decision.status).toBe("EXCEPTION_REVIEW");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("PROGRAMME_MAPPING_MISSING");
    expect(decision.expectedAmountPaise).toBe(0);
  });

  it("returns exception review when the filing timeline expired", () => {
    const decision = evaluateEligibility(
      eligibilityInputFixture({ evaluationDate: "2026-10-14" }),
    );

    expect(decision.status).toBe("EXCEPTION_REVIEW");
    expect(
      decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
    ).toBe("FILING_TIMELINE_EXPIRED");
    expect(decision.expectedAmountPaise).toBe(0);
  });

  it.each([
    [
      "failed lease control",
      eligibilityInputFixture({
        transaction: purchaseFixture({ leaseStatus: "CANCELLED" }),
      }),
    ],
    [
      "missing mapping review",
      eligibilityInputFixture({ mappings: [] }),
    ],
    [
      "expired filing review",
      eligibilityInputFixture({ evaluationDate: "2026-10-14" }),
    ],
  ])("provides actionable recovery guidance for %s", (_label, input) => {
    const decision = evaluateEligibility(input);
    const exceptions = decision.ruleResults.filter(
      (rule) => rule.outcome !== "PASS",
    );

    expect(exceptions.length).toBeGreaterThan(0);
    exceptions.forEach((rule) => {
      expect("recoveryAction" in rule).toBe(true);
      expect(
        "recoveryAction" in rule
          ? String(rule.recoveryAction).trim().length
          : 0,
      ).toBeGreaterThan(0);
    });
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

  it.each([
    ["lease ID", { leaseId: "" }],
    ["lot ID", { lotId: "" }],
    ["employee ID", { employeeId: "" }],
    ["employer ID", { employerId: "" }],
    ["programme ID", { programmeId: "" }],
    ["OEM ID", { oemId: "" }],
    ["product ID", { productId: "" }],
    ["device identifier", { deviceIdentifier: "" }],
    ["purchase order number", { purchaseOrderNumber: "" }],
    ["invoice number", { invoiceNumber: "" }],
    ["invoice date", { invoiceDate: "" }],
    ["reseller ID", { resellerId: "" }],
  ] satisfies ReadonlyArray<readonly [string, Partial<PurchaseTransaction>]>)(
    "returns ineligible when mandatory %s is empty",
    (_label, overrides) => {
      const decision = evaluateEligibility(
        eligibilityInputFixture({
          transaction: purchaseFixture(overrides),
        }),
      );

      expect(decision.status).toBe("INELIGIBLE");
      expect(decision.ruleResults[0]?.code).toBe(
        "TRANSACTION_FIELDS_INVALID",
      );
      expect(decision.ruleResults[0]?.outcome).toBe("FAIL");
      expect(decision.expectedAmountPaise).toBe(0);
      expect(decision.filingDeadline).toBe("");
      expect(decision.ruleResults).toHaveLength(1);
    },
  );

  it.each([
    ["zero invoice value", { invoiceValuePaise: 0 }],
    ["zero base value", { baseValuePaise: 0 }],
    ["zero GST value", { gstAmountPaise: 0 }],
    ["negative GST value", { gstAmountPaise: -1 }],
    ["fractional invoice value", { invoiceValuePaise: 12.5 }],
    [
      "unsafe base value",
      { baseValuePaise: Number.MAX_SAFE_INTEGER + 1 },
    ],
  ] satisfies ReadonlyArray<readonly [string, Partial<PurchaseTransaction>]>)(
    "returns ineligible for %s without attempting calculation",
    (_label, overrides) => {
      const decision = evaluateEligibility(
        eligibilityInputFixture({
          transaction: purchaseFixture(overrides),
        }),
      );

      expect(decision.status).toBe("INELIGIBLE");
      expect(decision.ruleResults).toEqual([
        expect.objectContaining({
          code: "TRANSACTION_FINANCIALS_INVALID",
          outcome: "FAIL",
        }),
      ]);
      expect(decision.expectedAmountPaise).toBe(0);
      expect(decision.filingDeadline).toBe("");
      expect(decision.ruleSnapshot).toBeUndefined();
    },
  );

  it.each([
    ["empty input", ""],
    ["nonexistent calendar date", "2026-02-30"],
    ["timestamp input", "2026-10-14T00:00:00.000Z"],
  ])(
    "returns controlled review for malformed evaluation date: %s",
    (_label, evaluationDate) => {
      const decision = evaluateEligibility(
        eligibilityInputFixture({ evaluationDate }),
      );

      expect(decision.status).toBe("EXCEPTION_REVIEW");
      expect(
        decision.ruleResults.find((rule) => rule.outcome !== "PASS")?.code,
      ).toBe("EVALUATION_DATE_INVALID");
      expect(decision.expectedAmountPaise).toBe(0);
      expect(decision.filingDeadline).toBe("2026-10-13");
      expect(decision.ruleSnapshot?.schemeVersionId).toBe("scheme-version-1");
    },
  );

  it.each([0, 2])(
    "rejects initial decision version %s",
    (version) => {
      expect(() =>
        evaluateEligibility(
          eligibilityInputFixture({
            decisionId: `decision-${version}`,
            version,
          }),
        ),
      ).toThrow("Initial eligibility decision version must be 1");
    },
  );

  it("rejects a previous decision for another transaction", () => {
    expect(() =>
      evaluateEligibility({
        ...eligibilityInputFixture(),
        decisionId: "decision-2",
        version: 2,
        previousDecision: eligibilityDecisionFixture({
          transactionId: "purchase-2",
        }),
      }),
    ).toThrow(
      "Previous eligibility decision must reference the same transaction",
    );
  });

  it.each([0, 1, 3])(
    "rejects nonconsecutive re-evaluation version %s",
    (version) => {
      expect(() =>
        evaluateEligibility({
          ...eligibilityInputFixture(),
          decisionId: `decision-${version}`,
          version,
          previousDecision: eligibilityDecisionFixture({ version: 1 }),
        }),
      ).toThrow(
        "Eligibility decision version must increment previous version by exactly 1",
      );
    },
  );

  it("rejects reuse of the previous decision ID", () => {
    expect(() =>
      evaluateEligibility({
        ...eligibilityInputFixture(),
        decisionId: "decision-1",
        version: 2,
        previousDecision: eligibilityDecisionFixture({
          id: "decision-1",
          version: 1,
        }),
      }),
    ).toThrow(
      "Eligibility decision ID must differ from the previous decision ID",
    );
  });
});
