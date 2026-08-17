import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  calculateExpectedAmountPaise,
  dateIsWithinInclusive,
  intervalsOverlapInclusive,
  programmeMappingDraftSchema,
  schemeDraftSchema,
} from "../../../packages/domain/src";

describe("subvention primitives", () => {
  it("treats both effective-date boundaries as inclusive", () => {
    expect(
      dateIsWithinInclusive("2026-07-01", "2026-07-01", "2026-09-30"),
    ).toBe(true);
    expect(
      dateIsWithinInclusive("2026-09-30", "2026-07-01", "2026-09-30"),
    ).toBe(true);
    expect(
      intervalsOverlapInclusive(
        "2026-07-01",
        "2026-07-31",
        "2026-07-31",
        "2026-08-31",
      ),
    ).toBe(true);
  });

  it("adds filing days using date-only UTC arithmetic", () => {
    expect(addDaysIso("2026-01-01", 90)).toBe("2026-04-01");
  });

  it("calculates basis-point percentage using integer paise", () => {
    expect(
      calculateExpectedAmountPaise({
        calculationBasis: "INVOICE_VALUE",
        invoiceValuePaise: 8_250_050,
        baseValuePaise: 7_000_000,
        rateBps: 350,
      }),
    ).toBe(288_752);
  });

  it("requires a positive flat amount for flat schemes", () => {
    const result = schemeDraftSchema.safeParse({
      schemeId: "scheme-1",
      code: "APL-Q3-26",
      name: "Corporate Q3",
      oemId: "oem-apple",
      settlementCounterpartyType: "DISTRIBUTOR",
      calculationBasis: "FLAT_AMOUNT",
      claimTimelineDays: 90,
      priority: 10,
      eligibleProductIds: ["iphone-16"],
      effectiveFrom: "2026-07-01",
      effectiveTo: "2026-09-30",
      requiredDocumentCodes: ["PURCHASE_INVOICE"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts an approved timeline-only programme override", () => {
    const result = programmeMappingDraftSchema.safeParse({
      mappingId: "mapping-1",
      employerId: "employer-1",
      programmeId: "programme-1",
      oemId: "oem-apple",
      schemeVersionId: "scheme-version-1",
      launchDate: "2026-07-01",
      effectiveFrom: "2026-07-01",
      effectiveTo: "2026-09-30",
      overrides: {
        approvalReference: "APP-1",
        claimTimelineDays: 60,
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects nonexistent calendar dates in schemas and date utilities", () => {
    const result = programmeMappingDraftSchema.safeParse({
      mappingId: "mapping-1",
      employerId: "employer-1",
      programmeId: "programme-1",
      oemId: "oem-apple",
      schemeVersionId: "scheme-version-1",
      launchDate: "2026-02-30",
      effectiveFrom: "2026-07-01",
      effectiveTo: "2026-09-30",
    });

    expect(result.success).toBe(false);
    expect(() =>
      dateIsWithinInclusive("2026-02-30", "2026-02-01", "2026-03-31"),
    ).toThrow("Invalid ISO date: 2026-02-30");
  });

  it("rejects direct monetary inputs that are not safe integer paise", () => {
    expect(() =>
      calculateExpectedAmountPaise({
        calculationBasis: "FLAT_AMOUNT",
        invoiceValuePaise: 1_000,
        baseValuePaise: 900,
        flatAmountPaise: 12.5,
      }),
    ).toThrow("Positive flat amount required");
    expect(() =>
      calculateExpectedAmountPaise({
        calculationBasis: "INVOICE_VALUE",
        invoiceValuePaise: -1,
        baseValuePaise: 900,
        rateBps: 350,
      }),
    ).toThrow("Paise amounts must be non-negative safe integers");
    expect(() =>
      calculateExpectedAmountPaise({
        calculationBasis: "BASE_VALUE",
        invoiceValuePaise: 1_000,
        baseValuePaise: Number.POSITIVE_INFINITY,
        rateBps: 350,
      }),
    ).toThrow("Paise amounts must be non-negative safe integers");
    expect(() =>
      calculateExpectedAmountPaise({
        calculationBasis: "INVOICE_VALUE",
        invoiceValuePaise: Number.MAX_SAFE_INTEGER + 1,
        baseValuePaise: 900,
        rateBps: 350,
      }),
    ).toThrow("Paise amounts must be non-negative safe integers");
  });
});
