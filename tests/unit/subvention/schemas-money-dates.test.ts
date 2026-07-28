import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  calculateExpectedAmountPaise,
  dateIsWithinInclusive,
  intervalsOverlapInclusive,
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
});
