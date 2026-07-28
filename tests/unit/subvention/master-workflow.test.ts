import { describe, expect, it } from "vitest";
import {
  type SchemeVersion,
  transitionMaster,
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

describe("master workflow", () => {
  it("prevents maker from approving own submitted version", () => {
    const submitted = schemeFixture({
      workflowStatus: "SUBMITTED",
      makerUserId: "maker-1",
    });
    expect(() =>
      transitionMaster(
        submitted,
        "APPROVE",
        { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
        "Approved",
        "2026-07-28T10:00:00.000Z",
      ),
    ).toThrow("Maker cannot approve own work");
  });

  it("makes an approved version immutable", () => {
    const approved = schemeFixture({ workflowStatus: "APPROVED" });
    expect(() =>
      transitionMaster(
        approved,
        "SUBMIT",
        { userId: "maker-2", role: "MASTER_DATA_ADMIN" },
        "Resubmit",
        "2026-07-28T10:00:00.000Z",
      ),
    ).toThrow("Approved master version is immutable");
  });

  it("submits a draft without mutating the prior version", () => {
    const draft = schemeFixture();

    const submitted = transitionMaster(
      draft,
      "SUBMIT",
      { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
      "Ready for review",
      "2026-07-28T10:00:00.000Z",
    );

    expect(submitted.workflowStatus).toBe("SUBMITTED");
    expect(draft.workflowStatus).toBe("DRAFT");
  });

  it("records a separate checker and approval time on approval", () => {
    const approved = transitionMaster(
      schemeFixture({ workflowStatus: "SUBMITTED" }),
      "APPROVE",
      { userId: "checker-1", role: "MASTER_DATA_ADMIN" },
      "Approved after review",
      "2026-07-28T10:00:00.000Z",
    );

    expect(approved).toMatchObject({
      workflowStatus: "APPROVED",
      checkerUserId: "checker-1",
      approvedAt: "2026-07-28T10:00:00.000Z",
    });
  });

  it("requires meaningful remarks for every transition", () => {
    expect(() =>
      transitionMaster(
        schemeFixture(),
        "SUBMIT",
        { userId: "maker-1", role: "MASTER_DATA_ADMIN" },
        "   ",
        "2026-07-28T10:00:00.000Z",
      ),
    ).toThrow("Remarks are required");
  });

  it("rejects actions outside the deterministic transition table", () => {
    expect(() =>
      transitionMaster(
        schemeFixture({ workflowStatus: "DRAFT" }),
        "APPROVE",
        { userId: "checker-1", role: "MASTER_DATA_ADMIN" },
        "Approved",
        "2026-07-28T10:00:00.000Z",
      ),
    ).toThrow("APPROVE is not allowed from DRAFT");
  });
});
