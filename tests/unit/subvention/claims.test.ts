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
  return createClaimBatch({ id: "batch-1", reference: "CLM-202607-001", transactionIds: ids, settlementCounterpartyId: "distributor-ingram", transactions: ids.map((id) => transaction(id)), eligibilityDecisions: ids.map((id) => decision(id)), evidenceSnapshots: Object.fromEntries(ids.map((id) => [id, { evidenceLinkIdentity: `${id}|invoice-${id}|line-1`, evidenceLinkedAt: occurredAt, invoiceId: `invoice-${id}`, invoiceSourceChecksum: `sha256:${id}`, invoiceTemplateVersionId: "template-1", purchaseOrderId: `po-${id}`, eWayBillId: `eway-${id}`, eWayBillStatus: "VALID_MOVEMENT", validation: { decision: "PASS", capturedAt: occurredAt, rules: [{ code: "PO_APPROVED", outcome: "PASS" }] } }])), existingBatches: [], actor: maker, occurredAt });
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
    const evidenceSnapshots = { "tx-1": draft(["tx-1"]).lines[0]!.ruleSnapshot.evidence };
    expect(() => createClaimBatch({ id: "batch", reference: "CLM", transactionIds: ["tx-1"], settlementCounterpartyId: "distributor-ingram", transactions: [transaction("tx-1")], eligibilityDecisions: [], evidenceSnapshots, existingBatches: [], actor: maker, occurredAt })).toThrow("CLAIM_PERSISTED_ELIGIBILITY_REQUIRED");
    expect(() => createClaimBatch({ id: "batch", reference: "CLM", transactionIds: ["tx-1"], settlementCounterpartyId: "distributor-redington", transactions: [transaction("tx-1")], eligibilityDecisions: [decision("tx-1")], evidenceSnapshots, existingBatches: [], actor: maker, occurredAt })).toThrow("CLAIM_BATCH_MIXED_SETTLEMENT_COUNTERPARTY");
    expect(() => createClaimBatch({ id: "batch-2", reference: "CLM-2", transactionIds: ["tx-1"], settlementCounterpartyId: "distributor-ingram", transactions: [transaction("tx-1")], eligibilityDecisions: [decision("tx-1")], evidenceSnapshots, existingBatches: [draft(["tx-1"])], actor: maker, occurredAt })).toThrow("DUPLICATE_CLAIM_TRANSACTION");
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

  it("rejects non-positive financial events and incomplete approved-value reconciliation", () => {
    const sent = recordClaimSubmission(approveClaimBatch(submitClaimBatch(draft(["tx-1"]), maker, occurredAt), checker, occurredAt), "OEM-REF-1", occurredAt);
    const responded = recordClaimResponse(sent, [{ lineId: sent.lines[0]!.id, status: "APPROVED", approvedAmountPaise: 3_500 }], occurredAt);
    expect(() => transitionClaimFinancials(responded, { invoicedAmountPaise: 0, occurredAt })).toThrow("CLAIM_FINANCIAL_AMOUNT_MUST_BE_POSITIVE");
    const invoiced = transitionClaimFinancials(responded, { invoicedAmountPaise: 3_000, occurredAt });
    const collected = transitionClaimFinancials(invoiced, { collectedAmountPaise: 3_000, occurredAt });
    const accounted = transitionClaimFinancials(collected, { accountedAmountPaise: 3_000, occurredAt });
    expect(() => closeClaimBatch(accounted, occurredAt)).toThrow("CLAIM_CLOSE_RECONCILIATION_REQUIRED");
  });

  it("permits closure when a typed approved write-off explains the invoice variance", () => {
    const sent = recordClaimSubmission(approveClaimBatch(submitClaimBatch(draft(["tx-1"]), maker, occurredAt), checker, occurredAt), "OEM-REF-1", occurredAt);
    const responded = recordClaimResponse(sent, [{ lineId: sent.lines[0]!.id, status: "APPROVED", approvedAmountPaise: 3_500 }], occurredAt);
    const adjusted = { ...responded, reconciliationAdjustments: [{ id: "adj-1", type: "WRITE_OFF" as const, direction: "REDUCE_INVOICE_REQUIREMENT" as const, amountPaise: 500, reason: "Approved short settlement", requestedBy: maker.userId, approvedBy: checker.userId, approvedAt: occurredAt }] };
    const invoiced = transitionClaimFinancials(adjusted, { invoicedAmountPaise: 3_000, occurredAt });
    const collected = transitionClaimFinancials(invoiced, { collectedAmountPaise: 3_000, occurredAt });
    const accounted = transitionClaimFinancials(collected, { accountedAmountPaise: 3_000, occurredAt });
    expect(closeClaimBatch(accounted, occurredAt).status).toBe("CLOSED");
  });

  it("captures response variance, reason and representation history", () => {
    const sent = recordClaimSubmission(approveClaimBatch(submitClaimBatch(draft(["tx-1"]), maker, occurredAt), checker, occurredAt), "OEM-REF-1", occurredAt);
    const responded = recordClaimResponse(sent, [{
      lineId: sent.lines[0]!.id,
      status: "PARTIALLY_APPROVED",
      approvedAmountPaise: 2_500,
      reason: "Price cap applied",
      responseReference: "OEM-RESP-42",
      representation: { id: "repr-1", submittedAt: occurredAt, reference: "REP-42", reason: "Invoice supports full value", outcome: "PENDING" },
    }], occurredAt);
    expect(responded.lines[0]).toMatchObject({ responseVariancePaise: 1_000, responseReason: "Price cap applied", responseReference: "OEM-RESP-42" });
    expect(responded.lines[0]?.representationHistory).toHaveLength(1);
  });
});
