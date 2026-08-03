import { describe, expect, it } from "vitest";
import {
  approveClaimBatch,
  createClaimBatch,
  recordClaimResponse,
  recordClaimSubmission,
  submitClaimBatch,
  transitionClaimFinancials,
  closeClaimBatch,
  type EligibilityDecision,
  type PurchaseTransaction,
} from "../../../packages/domain/src";

const maker = { userId: "maker-1", role: "SALES_OPS_MAKER" };
const checker = { userId: "checker-1", role: "BUSINESS_HEAD_CHECKER" };
const occurredAt = "2026-07-28T10:00:00.000Z";

function transaction(id: string, distributorId = "distributor-ingram"): PurchaseTransaction {
  return {
    id, leaseId: `lease-${id}`, lotId: "lot-1", employeeId: "employee-masked", employerId: "employer-1",
    programmeId: "programme-1", oemId: "oem-apple", productId: "product-1", productCode: "PHONE-1",
    connectLegalEntityId: "connect-1", deviceIdentifier: `IMEI-${id}-12345678`, purchaseOrderNumber: `PO-${id}`,
    invoiceNumber: `INV-${id}`, invoiceDate: "2026-07-01", invoiceValuePaise: 100_000, baseValuePaise: 90_000,
    gstAmountPaise: 18_000, resellerId: "reseller-1", distributorId, leaseStatus: "ACTIVE", sourceSystem: "LMS",
    sourceEvidence: { sourceFileName: "source.xlsx", sourceSheetName: "Sheet1", sourceRowNumber: 2, sourceChecksum: `hash-${id}`, rowKind: "TRANSACTION", sourceLabels: {}, counterpartyAliases: {}, calculationBasis: "INVOICE_VALUE", rateBps: 350, expectedSubventionPaise: 3_500 },
    importedAt: occurredAt,
  };
}

function decision(id: string, status: EligibilityDecision["status"] = "ELIGIBLE"): EligibilityDecision {
  return {
    id: `decision-${id}`, transactionId: id, version: 1, status, expectedAmountPaise: 3_500,
    filingDeadline: "2026-09-29", evaluatedAt: occurredAt, evaluatedBy: maker.userId, ruleResults: [],
    ruleSnapshot: { employerProgrammeMappingVersionId: "mapping-1", schemeVersionId: "scheme-1", calculationBasis: "INVOICE_VALUE", rateBps: 350, claimTimelineDays: 90, eligibleProductIds: ["product-1"], settlementCounterpartyType: "DISTRIBUTOR", precedenceSources: ["scheme-1"] },
  };
}

function draft(ids = ["tx-1", "tx-2"]) {
  return createClaimBatch({ id: "batch-1", reference: "CLM-202607-001", transactionIds: ids, settlementCounterpartyId: "distributor-ingram", transactions: ids.map((id) => transaction(id)), eligibilityDecisions: ids.map((id) => decision(id)), existingBatches: [], actor: maker, occurredAt });
}

describe("controlled claim lifecycle", () => {
  it("groups persisted eligible decisions for exactly one settlement route and snapshots rules", () => {
    const batch = draft();
    expect(batch.lines).toHaveLength(2);
    expect(new Set(batch.lines.map((line) => line.settlementCounterpartyId))).toEqual(new Set(["distributor-ingram"]));
    expect(batch.expectedAmountPaise).toBe(7_000);
    expect(batch.lines[0]?.ruleSnapshot.eligibilityDecisionId).toBe("decision-tx-1");
  });

  it("rejects missing eligibility, mixed routes and duplicate inclusion", () => {
    expect(() => createClaimBatch({ id: "batch", reference: "CLM", transactionIds: ["tx-1"], settlementCounterpartyId: "distributor-ingram", transactions: [transaction("tx-1")], eligibilityDecisions: [], existingBatches: [], actor: maker, occurredAt })).toThrow("CLAIM_PERSISTED_ELIGIBILITY_REQUIRED");
    expect(() => createClaimBatch({ id: "batch", reference: "CLM", transactionIds: ["tx-1"], settlementCounterpartyId: "distributor-redington", transactions: [transaction("tx-1")], eligibilityDecisions: [decision("tx-1")], existingBatches: [], actor: maker, occurredAt })).toThrow("CLAIM_BATCH_MIXED_SETTLEMENT_COUNTERPARTY");
    expect(() => createClaimBatch({ id: "batch-2", reference: "CLM-2", transactionIds: ["tx-1"], settlementCounterpartyId: "distributor-ingram", transactions: [transaction("tx-1")], eligibilityDecisions: [decision("tx-1")], existingBatches: [draft(["tx-1"])], actor: maker, occurredAt })).toThrow("DUPLICATE_CLAIM_TRANSACTION");
  });

  it("enforces maker-checker, locking and reconciled closure", () => {
    const submitted = submitClaimBatch(draft(["tx-1"]), maker, occurredAt);
    expect(() => approveClaimBatch(submitted, maker, occurredAt)).toThrow("Maker cannot approve own claim batch");
    const approved = approveClaimBatch(submitted, checker, occurredAt);
    expect(approved.status).toBe("APPROVED_LOCKED");
    expect(approved.lines[0]?.expectedAmountPaise).toBe(3_500);
    const sent = recordClaimSubmission(approved, "OEM-REF-1", occurredAt);
    const responded = recordClaimResponse(sent, [{ lineId: sent.lines[0]!.id, status: "APPROVED", approvedAmountPaise: 3_500 }], occurredAt);
    const invoiced = transitionClaimFinancials(responded, { invoicedAmountPaise: 3_500, occurredAt });
    const collected = transitionClaimFinancials(invoiced, { collectedAmountPaise: 3_500, occurredAt });
    const accounted = transitionClaimFinancials(collected, { accountedAmountPaise: 3_500, occurredAt });
    expect(closeClaimBatch(accounted, occurredAt).status).toBe("CLOSED");
  });
});
