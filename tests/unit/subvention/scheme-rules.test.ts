import { describe, expect, it } from "vitest";
import {
  type SchemeVersion,
  validateSchemeOverlap,
} from "../../../packages/domain/src";

function schemeFixture(
  overrides: Partial<SchemeVersion> = {},
): SchemeVersion {
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
    workflowStatus: "DRAFT",
    makerUserId: "maker-1",
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("scheme overlap rules", () => {
  it("flags equal-priority approved overlap at a shared boundary", () => {
    const existing = schemeFixture({
      id: "scheme-v1",
      priority: 10,
      effectiveFrom: "2026-07-01",
      effectiveTo: "2026-09-30",
      workflowStatus: "APPROVED",
    });
    const candidate = schemeFixture({
      id: "scheme-v2",
      priority: 10,
      effectiveFrom: "2026-09-30",
      effectiveTo: "2026-12-31",
      workflowStatus: "SUBMITTED",
    });
    expect(validateSchemeOverlap(candidate, [existing])[0]?.code).toBe(
      "SCHEME_OVERLAP",
    );
  });

  it("ignores overlapping versions from a different OEM", () => {
    const issues = validateSchemeOverlap(
      schemeFixture({ id: "scheme-v2", oemId: "oem-samsung" }),
      [schemeFixture({ workflowStatus: "APPROVED" })],
    );

    expect(issues).toEqual([]);
  });

  it("ignores matching-OEM periods without common products", () => {
    const issues = validateSchemeOverlap(
      schemeFixture({ id: "scheme-v2", eligibleProductIds: ["iphone-17"] }),
      [schemeFixture({ workflowStatus: "APPROVED" })],
    );

    expect(issues).toEqual([]);
  });

  it("allows an approved overlap when priority differs", () => {
    const issues = validateSchemeOverlap(
      schemeFixture({ id: "scheme-v2", priority: 20 }),
      [schemeFixture({ workflowStatus: "APPROVED", priority: 10 })],
    );

    expect(issues).toEqual([]);
  });

  it("does not block against a non-approved version", () => {
    const issues = validateSchemeOverlap(
      schemeFixture({ id: "scheme-v2" }),
      [schemeFixture({ workflowStatus: "SUBMITTED" })],
    );

    expect(issues).toEqual([]);
  });
});
