import type {
  Actor,
  EligibilityDecision,
  EligibilityRuleSnapshot,
  PurchaseTransaction,
  SettlementCounterpartyType,
} from "./types";

export const CLAIM_BATCH_STATUSES = [
  "DRAFT",
  "SUBMITTED_FOR_APPROVAL",
  "APPROVED_LOCKED",
  "COUNTERPARTY_SUBMITTED",
  "PARTIALLY_RESPONDED",
  "RESPONDED",
  "INVOICED",
  "PARTIALLY_COLLECTED",
  "COLLECTED",
  "ACCOUNTED",
  "CLOSED",
] as const;

export type ClaimBatchStatus = (typeof CLAIM_BATCH_STATUSES)[number];

export interface ClaimRuleSnapshot extends EligibilityRuleSnapshot {
  eligibilityDecisionId: string;
  eligibilityDecisionVersion: number;
  capturedAt: string;
}

export interface ClaimBatchLine {
  id: string;
  transactionId: string;
  leaseId: string;
  employerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  deviceIdentifier: string;
  settlementCounterpartyId: string;
  settlementCounterpartyType: SettlementCounterpartyType;
  expectedAmountPaise: number;
  filingDeadline: string;
  ruleSnapshot: ClaimRuleSnapshot;
  approvedAmountPaise?: number;
  responseStatus?: "APPROVED" | "PARTIALLY_APPROVED" | "REJECTED" | "PENDING";
  responseVariancePaise?: number;
  responseReason?: string;
  responseReference?: string;
  representationHistory?: ClaimRepresentation[];
}

export interface ClaimRepresentation {
  id: string;
  submittedAt: string;
  reference: string;
  reason: string;
  outcome: "PENDING" | "APPROVED" | "PARTIALLY_APPROVED" | "REJECTED";
  approvedAmountPaise?: number;
}

export interface ClaimReconciliationAdjustment {
  id: string;
  type: "WRITE_OFF" | "APPROVED_ADJUSTMENT";
  direction: "REDUCE_INVOICE_REQUIREMENT" | "INCREASE_INVOICE_REQUIREMENT";
  amountPaise: number;
  reason: string;
  approvedBy: string;
  approvedAt: string;
}

export interface ClaimBatch {
  id: string;
  reference: string;
  status: ClaimBatchStatus;
  settlementCounterpartyId: string;
  settlementCounterpartyType: SettlementCounterpartyType;
  lines: ClaimBatchLine[];
  expectedAmountPaise: number;
  makerUserId: string;
  checkerUserId?: string;
  createdAt: string;
  submittedForApprovalAt?: string;
  approvedAt?: string;
  counterpartySubmittedAt?: string;
  stageEnteredAt: string;
  submissionReference?: string;
  lastResponseAt?: string;
  invoicedAmountPaise?: number;
  collectedAmountPaise?: number;
  accountedAmountPaise?: number;
  invoiceReference?: string;
  collectionReference?: string;
  accountingJournalReference?: string;
  reconciliationAdjustments?: ClaimReconciliationAdjustment[];
  closedAt?: string;
}

export interface CreateClaimBatchInput {
  id: string;
  reference: string;
  transactionIds: string[];
  settlementCounterpartyId: string;
  transactions: PurchaseTransaction[];
  eligibilityDecisions: EligibilityDecision[];
  existingBatches: ClaimBatch[];
  actor: Actor;
  occurredAt: string;
}

function latestDecision(
  decisions: EligibilityDecision[],
  transactionId: string,
): EligibilityDecision | undefined {
  return decisions
    .filter((decision) => decision.transactionId === transactionId)
    .sort((left, right) => right.version - left.version)[0];
}

function counterpartyFor(
  transaction: PurchaseTransaction,
  decision: EligibilityDecision,
): { id: string; type: SettlementCounterpartyType } {
  const type = decision.ruleSnapshot!.settlementCounterpartyType;
  if (type === "OEM") return { id: transaction.oemId, type };
  if (type === "RESELLER") return { id: transaction.resellerId, type };
  if (!transaction.distributorId) {
    throw new Error("CLAIM_SETTLEMENT_COUNTERPARTY_MISSING");
  }
  return { id: transaction.distributorId, type };
}

export function createClaimBatch(input: CreateClaimBatchInput): ClaimBatch {
  if (!input.transactionIds.length) throw new Error("CLAIM_BATCH_EMPTY");
  if (new Set(input.transactionIds).size !== input.transactionIds.length) {
    throw new Error("DUPLICATE_CLAIM_TRANSACTION");
  }

  const claimed = new Set(
    input.existingBatches.flatMap((batch) => batch.lines.map((line) => line.transactionId)),
  );
  const lines = input.transactionIds.map((transactionId, index): ClaimBatchLine => {
    if (claimed.has(transactionId)) throw new Error("DUPLICATE_CLAIM_TRANSACTION");
    const transaction = input.transactions.find((row) => row.id === transactionId);
    if (!transaction) throw new Error(`CLAIM_TRANSACTION_NOT_FOUND:${transactionId}`);
    const decision = latestDecision(input.eligibilityDecisions, transactionId);
    if (!decision || decision.status !== "ELIGIBLE" || !decision.ruleSnapshot) {
      throw new Error(`CLAIM_PERSISTED_ELIGIBILITY_REQUIRED:${transactionId}`);
    }
    const counterparty = counterpartyFor(transaction, decision);
    if (counterparty.id !== input.settlementCounterpartyId) {
      throw new Error("CLAIM_BATCH_MIXED_SETTLEMENT_COUNTERPARTY");
    }
    return {
      id: `${input.id}-line-${String(index + 1).padStart(3, "0")}`,
      transactionId,
      leaseId: transaction.leaseId,
      employerId: transaction.employerId,
      invoiceNumber: transaction.invoiceNumber,
      invoiceDate: transaction.invoiceDate,
      deviceIdentifier: transaction.deviceIdentifier,
      settlementCounterpartyId: counterparty.id,
      settlementCounterpartyType: counterparty.type,
      expectedAmountPaise: decision.expectedAmountPaise,
      filingDeadline: decision.filingDeadline,
      ruleSnapshot: {
        ...structuredClone(decision.ruleSnapshot),
        eligibilityDecisionId: decision.id,
        eligibilityDecisionVersion: decision.version,
        capturedAt: input.occurredAt,
      },
    };
  });
  const counterpartyTypes = new Set(lines.map((line) => line.settlementCounterpartyType));
  if (counterpartyTypes.size !== 1) throw new Error("CLAIM_BATCH_MIXED_SETTLEMENT_COUNTERPARTY");

  return {
    id: input.id,
    reference: input.reference,
    status: "DRAFT",
    settlementCounterpartyId: input.settlementCounterpartyId,
    settlementCounterpartyType: lines[0]!.settlementCounterpartyType,
    lines,
    expectedAmountPaise: lines.reduce((sum, line) => sum + line.expectedAmountPaise, 0),
    makerUserId: input.actor.userId,
    createdAt: input.occurredAt,
    stageEnteredAt: input.occurredAt,
  };
}

export function assertClaimBatchLocked(batch: ClaimBatch): void {
  if (batch.status !== "DRAFT") throw new Error("CLAIM_BATCH_LOCKED");
}

export function submitClaimBatch(batch: ClaimBatch, actor: Actor, occurredAt: string): ClaimBatch {
  if (batch.status !== "DRAFT") throw new Error("CLAIM_BATCH_INVALID_TRANSITION");
  if (actor.userId !== batch.makerUserId) throw new Error("CLAIM_BATCH_MAKER_REQUIRED");
  return { ...batch, status: "SUBMITTED_FOR_APPROVAL", submittedForApprovalAt: occurredAt, stageEnteredAt: occurredAt };
}

export function approveClaimBatch(batch: ClaimBatch, actor: Actor, occurredAt: string): ClaimBatch {
  if (batch.status !== "SUBMITTED_FOR_APPROVAL") throw new Error("CLAIM_BATCH_INVALID_TRANSITION");
  if (actor.userId === batch.makerUserId) throw new Error("Maker cannot approve own claim batch");
  if (actor.role !== "BUSINESS_HEAD_CHECKER") throw new Error("CLAIM_BATCH_CHECKER_REQUIRED");
  return { ...batch, status: "APPROVED_LOCKED", checkerUserId: actor.userId, approvedAt: occurredAt, stageEnteredAt: occurredAt };
}

export function recordClaimSubmission(batch: ClaimBatch, reference: string, occurredAt: string): ClaimBatch {
  if (batch.status !== "APPROVED_LOCKED") throw new Error("CLAIM_BATCH_INVALID_TRANSITION");
  if (!reference.trim()) throw new Error("CLAIM_SUBMISSION_REFERENCE_REQUIRED");
  return { ...batch, status: "COUNTERPARTY_SUBMITTED", submissionReference: reference.trim(), counterpartySubmittedAt: occurredAt, stageEnteredAt: occurredAt };
}

export interface ClaimLineResponse {
  lineId: string;
  status: NonNullable<ClaimBatchLine["responseStatus"]>;
  approvedAmountPaise: number;
  reason?: string;
  responseReference?: string;
  representation?: ClaimRepresentation;
}

export function recordClaimResponse(batch: ClaimBatch, responses: ClaimLineResponse[], occurredAt: string): ClaimBatch {
  if (!["COUNTERPARTY_SUBMITTED", "PARTIALLY_RESPONDED"].includes(batch.status)) throw new Error("CLAIM_BATCH_INVALID_TRANSITION");
  const byLine = new Map(responses.map((response) => [response.lineId, response]));
  const lines = batch.lines.map((line) => {
    const response = byLine.get(line.id);
    if (!response) return line;
    if (response.approvedAmountPaise < 0 || response.approvedAmountPaise > line.expectedAmountPaise) throw new Error("CLAIM_RESPONSE_AMOUNT_INVALID");
    if (response.status === "APPROVED" && response.approvedAmountPaise !== line.expectedAmountPaise) throw new Error("CLAIM_RESPONSE_STATUS_AMOUNT_MISMATCH");
    if (response.status === "PARTIALLY_APPROVED" && (response.approvedAmountPaise <= 0 || response.approvedAmountPaise >= line.expectedAmountPaise)) throw new Error("CLAIM_RESPONSE_STATUS_AMOUNT_MISMATCH");
    if (["REJECTED", "PENDING"].includes(response.status) && response.approvedAmountPaise !== 0) throw new Error("CLAIM_RESPONSE_STATUS_AMOUNT_MISMATCH");
    if (["PARTIALLY_APPROVED", "REJECTED"].includes(response.status) && !response.reason?.trim()) throw new Error("CLAIM_RESPONSE_REASON_REQUIRED");
    const representationHistory = response.representation
      ? [...(line.representationHistory ?? []), response.representation]
      : line.representationHistory;
    return {
      ...line,
      responseStatus: response.status,
      approvedAmountPaise: response.approvedAmountPaise,
      responseVariancePaise: line.expectedAmountPaise - response.approvedAmountPaise,
      responseReason: response.reason?.trim(),
      responseReference: response.responseReference?.trim(),
      representationHistory,
    };
  });
  const responded = lines.filter((line) => line.responseStatus && line.responseStatus !== "PENDING").length;
  return { ...batch, lines, status: responded === lines.length ? "RESPONDED" : "PARTIALLY_RESPONDED", lastResponseAt: occurredAt, stageEnteredAt: occurredAt };
}

export function transitionClaimFinancials(
  batch: ClaimBatch,
  input: {
    invoicedAmountPaise?: number;
    collectedAmountPaise?: number;
    accountedAmountPaise?: number;
    reference?: string;
    occurredAt: string;
  },
): ClaimBatch {
  const approved = batch.lines.reduce((sum, line) => sum + (line.approvedAmountPaise ?? 0), 0);
  if (input.invoicedAmountPaise !== undefined) {
    if (input.invoicedAmountPaise <= 0) throw new Error("CLAIM_FINANCIAL_AMOUNT_MUST_BE_POSITIVE");
    if (batch.status !== "RESPONDED" || input.invoicedAmountPaise > approved) throw new Error("CLAIM_INVOICE_RECONCILIATION_FAILED");
    return { ...batch, status: "INVOICED", invoicedAmountPaise: input.invoicedAmountPaise, invoiceReference: input.reference?.trim() || batch.invoiceReference, stageEnteredAt: input.occurredAt };
  }
  if (input.collectedAmountPaise !== undefined) {
    if (input.collectedAmountPaise <= 0) throw new Error("CLAIM_FINANCIAL_AMOUNT_MUST_BE_POSITIVE");
    if (!batch.invoicedAmountPaise || !["INVOICED", "PARTIALLY_COLLECTED"].includes(batch.status) || input.collectedAmountPaise > batch.invoicedAmountPaise) throw new Error("CLAIM_COLLECTION_RECONCILIATION_FAILED");
    return { ...batch, status: input.collectedAmountPaise === batch.invoicedAmountPaise ? "COLLECTED" : "PARTIALLY_COLLECTED", collectedAmountPaise: input.collectedAmountPaise, collectionReference: input.reference?.trim() || batch.collectionReference, stageEnteredAt: input.occurredAt };
  }
  if (input.accountedAmountPaise !== undefined) {
    if (input.accountedAmountPaise <= 0) throw new Error("CLAIM_FINANCIAL_AMOUNT_MUST_BE_POSITIVE");
    if (batch.status !== "COLLECTED" || input.accountedAmountPaise !== batch.collectedAmountPaise) throw new Error("CLAIM_ACCOUNTING_RECONCILIATION_FAILED");
    return { ...batch, status: "ACCOUNTED", accountedAmountPaise: input.accountedAmountPaise, accountingJournalReference: input.reference?.trim() || batch.accountingJournalReference, stageEnteredAt: input.occurredAt };
  }
  throw new Error("CLAIM_FINANCIAL_TRANSITION_REQUIRED");
}

export function adjustedApprovedAmountPaise(batch: ClaimBatch): number {
  const approved = batch.lines.reduce((sum, line) => sum + (line.approvedAmountPaise ?? 0), 0);
  return (batch.reconciliationAdjustments ?? []).reduce((total, adjustment) => {
    if (adjustment.amountPaise <= 0 || !adjustment.reason.trim() || !adjustment.approvedBy.trim() || !adjustment.approvedAt.trim()) {
      throw new Error("CLAIM_ADJUSTMENT_APPROVAL_REQUIRED");
    }
    return adjustment.direction === "REDUCE_INVOICE_REQUIREMENT"
      ? total - adjustment.amountPaise
      : total + adjustment.amountPaise;
  }, approved);
}

export function closeClaimBatch(batch: ClaimBatch, occurredAt: string): ClaimBatch {
  const adjustedApproved = adjustedApprovedAmountPaise(batch);
  if (
    adjustedApproved <= 0 ||
    batch.status !== "ACCOUNTED" ||
    batch.invoicedAmountPaise !== adjustedApproved ||
    batch.accountedAmountPaise !== batch.collectedAmountPaise ||
    batch.collectedAmountPaise !== batch.invoicedAmountPaise
  ) throw new Error("CLAIM_CLOSE_RECONCILIATION_REQUIRED");
  return { ...batch, status: "CLOSED", closedAt: occurredAt, stageEnteredAt: occurredAt };
}
