import {
  evaluateEligibility,
  validateEvidenceLink,
  type Actor,
  type ClaimBatchStatus,
  type EligibilityDecision,
  type PurchaseTransaction,
  type RuleResult,
  type EvidenceValidationResult,
  type TransactionEvidenceLink,
  type SubventionSnapshot,
} from "@smart-epp/domain";

export const OPERATIONS_OUTCOMES = [
  "Processing",
  "Needs Review",
  "Blocked",
  "Ready for Claim",
  "In Claim Batch",
  "Submitted",
  "Approved",
  "Rejected",
  "Invoiced",
  "Collected",
] as const;

export type OperationsOutcome = (typeof OPERATIONS_OUTCOMES)[number];

export type TransactionLifecycleStage = ClaimBatchStatus;

export interface EvidenceReference {
  label: string;
  reference: string;
  state: "MATCHED" | "MISSING" | "REVIEW";
}

export interface TransactionEvidenceView {
  purchaseOrder: EvidenceReference;
  vendorInvoice: EvidenceReference;
  movementEvidence: EvidenceReference;
  deviceIdentifier: string;
  programme: EvidenceReference;
  scheme: EvidenceReference;
  settlementRoute: EvidenceReference;
  expectedAmountPaise: number;
  filingDeadline: string;
}

export interface OperationsQueueRow {
  transactionId: string;
  transactionReference: string;
  employer: string;
  purchaseOrderNumber: string;
  invoiceNumber: string;
  vendor: string;
  product: string;
  deviceIdentifier: string;
  systemResult: OperationsOutcome;
  actionLabel: string;
  recoveryAction?: string;
  evidence: TransactionEvidenceView;
  technicalDetails: {
    decisionId: string;
    decisionVersion: number;
    evaluatedAt: string;
    ruleResults: RuleResult[];
  };
}

export interface OperationsReadModel {
  rows: OperationsQueueRow[];
  counts: Record<OperationsOutcome, number>;
}

export interface OperationsReadModelOptions {
  actor: Actor;
  evaluatedAt: string;
  lifecycleByTransaction?: Record<string, TransactionLifecycleStage>;
  processingTransactionIds?: ReadonlySet<string>;
}

function latestDecision(
  snapshot: SubventionSnapshot,
  transactionId: string,
): EligibilityDecision | undefined {
  return snapshot.eligibilityDecisions
    .filter((decision) => decision.transactionId === transactionId)
    .sort((left, right) => right.version - left.version)[0];
}

function previewDecision(
  snapshot: SubventionSnapshot,
  transaction: PurchaseTransaction,
  options: OperationsReadModelOptions,
): EligibilityDecision {
  return evaluateEligibility({
    transaction,
    schemes: snapshot.schemes,
    mappings: snapshot.programmeMappings,
    oemDefaults: snapshot.oems.find((oem) => oem.id === transaction.oemId)
      ?.defaults,
    duplicateDeviceIdentifiers: new Set(snapshot.duplicateDeviceIdentifiers),
    duplicateLeaseIds: new Set(snapshot.duplicateLeaseIds),
    existingClaimedDeviceIdentifiers: new Set(
      snapshot.existingClaimedDeviceIdentifiers,
    ),
    existingClaimedLeaseIds: new Set(snapshot.existingClaimedLeaseIds),
    evaluationDate: options.evaluatedAt.slice(0, 10),
    evaluatedAt: options.evaluatedAt,
    actor: options.actor,
    decisionId: `operations-preview-${transaction.id}`,
    version: 1,
  });
}

function lifecycleOutcome(
  stage: TransactionLifecycleStage | undefined,
): OperationsOutcome | undefined {
  if (!stage) return undefined;
  switch (stage) {
    case "DRAFT":
      return "In Claim Batch";
    case "SUBMITTED_FOR_APPROVAL":
    case "COUNTERPARTY_SUBMITTED":
    case "PARTIALLY_RESPONDED":
    case "RESPONDED":
      return "Submitted";
    case "APPROVED_LOCKED":
      return "Approved";
    case "INVOICED":
      return "Invoiced";
    case "PARTIALLY_COLLECTED":
    case "COLLECTED":
    case "ACCOUNTED":
    case "CLOSED":
      return "Collected";
  }
}

function decisionOutcome(decision: EligibilityDecision): OperationsOutcome {
  if (decision.status === "ELIGIBLE") return "Ready for Claim";
  if (decision.status === "EXCEPTION_REVIEW") return "Needs Review";

  const issueCodes = decision.ruleResults
    .filter((rule) => rule.outcome !== "PASS")
    .map((rule) => rule.code);
  if (
    issueCodes.some(
      (code) =>
        code.includes("TIMELINE") ||
        code.includes("AMBIGUOUS") ||
        code.includes("REVIEW"),
    )
  ) {
    return "Needs Review";
  }
  return "Blocked";
}

function physicalEvidenceLink(
  snapshot: SubventionSnapshot,
  transactionId: string,
): TransactionEvidenceLink | undefined {
  return snapshot.evidenceLinks.find((link) => {
    if (link.transactionId !== transactionId) return false;
    const line = link.invoice.lines.find((candidate) => candidate.id === link.invoiceLineId);
    return line?.classification === "ELIGIBLE_DEVICE";
  });
}

function evidenceOutcome(
  validation: EvidenceValidationResult | undefined,
): OperationsOutcome | undefined {
  if (!validation) return "Blocked";
  if (validation.decision === "REVIEW") return "Needs Review";
  if (validation.decision !== "PASS") return "Blocked";
  return undefined;
}

function evidenceState(
  validation: EvidenceValidationResult | undefined,
  codes: string[],
): EvidenceReference["state"] {
  if (!validation) return "MISSING";
  const rules = validation.rules.filter((rule) => codes.includes(rule.code));
  if (rules.some((rule) => rule.outcome === "FAIL")) return "MISSING";
  if (rules.some((rule) => rule.outcome === "REVIEW")) return "REVIEW";
  return rules.length > 0 ? "MATCHED" : "MISSING";
}

function actionFor(outcome: OperationsOutcome): string {
  switch (outcome) {
    case "Processing":
      return "View progress";
    case "Needs Review":
      return "Review exception";
    case "Blocked":
      return "Resolve blocker";
    case "Ready for Claim":
      return "Open transaction";
    case "In Claim Batch":
    case "Submitted":
    case "Approved":
    case "Rejected":
    case "Invoiced":
    case "Collected":
      return "Track claim";
  }
}

function matchedReference(
  label: string,
  reference: string | undefined,
): EvidenceReference {
  return {
    label,
    reference: reference || "Not linked",
    state: reference ? "MATCHED" : "MISSING",
  };
}

function makeRow(
  snapshot: SubventionSnapshot,
  transaction: PurchaseTransaction,
  options: OperationsReadModelOptions,
): OperationsQueueRow {
  const decision =
    latestDecision(snapshot, transaction.id) ??
    previewDecision(snapshot, transaction, options);
  const mapping = decision.ruleSnapshot
    ? snapshot.programmeMappings.find(
        (candidate) =>
          candidate.id ===
          decision.ruleSnapshot?.employerProgrammeMappingVersionId,
      )
    : undefined;
  const scheme = decision.ruleSnapshot
    ? snapshot.schemes.find(
        (candidate) => candidate.id === decision.ruleSnapshot?.schemeVersionId,
      )
    : undefined;
  const reseller = snapshot.masters.resellers.find(
    (candidate) => candidate.id === transaction.resellerId,
  );
  const employer = snapshot.masters.employers.find(
    (candidate) => candidate.id === transaction.employerId,
  );
  const product = snapshot.masters.products.find(
    (candidate) => candidate.id === transaction.productId,
  );
  const distributor = snapshot.masters.distributors.find(
    (candidate) => candidate.id === (mapping?.distributorId ?? transaction.distributorId),
  );
  const firstIssue = decision.ruleResults.find((rule) => rule.outcome !== "PASS");
  const evidenceLink = physicalEvidenceLink(snapshot, transaction.id);
  const evidenceValidation = evidenceLink
    ? validateEvidenceLink(evidenceLink, transaction)
    : undefined;
  const evidenceRules: RuleResult[] = evidenceValidation?.rules.map((rule) =>
    rule.outcome === "PASS"
      ? { code: rule.code, label: rule.label, reason: rule.reason, outcome: "PASS" }
      : {
          code: rule.code,
          label: rule.label,
          reason: rule.reason,
          outcome: rule.outcome,
          recoveryAction: rule.recoveryAction ?? "Resolve the evidence exception, then re-evaluate.",
        },
  ) ?? [{
    code: "TRANSACTION_EVIDENCE_MISSING",
    label: "Purchase evidence",
    reason: "No physical-device PO and invoice evidence link is available.",
    outcome: "FAIL",
    recoveryAction: "Link the approved PO, recognised invoice and device identifier.",
  }];
  const firstEvidenceIssue = evidenceRules.find((rule) => rule.outcome !== "PASS");
  const processing = options.processingTransactionIds?.has(transaction.id) ?? false;
  const systemResult = processing
    ? "Processing"
    : lifecycleOutcome(options.lifecycleByTransaction?.[transaction.id]) ??
      evidenceOutcome(evidenceValidation) ??
      decisionOutcome(decision);

  return {
    transactionId: transaction.id,
    transactionReference: transaction.leaseId,
    employer: employer?.name ?? transaction.employerId,
    purchaseOrderNumber: evidenceLink?.purchaseOrder.purchaseOrderNumber ?? transaction.purchaseOrderNumber,
    invoiceNumber: evidenceLink?.invoice.invoiceNumber ?? transaction.invoiceNumber,
    vendor: evidenceLink?.invoice.vendorLegalName ?? reseller?.name ?? transaction.resellerId,
    product: product?.name ?? transaction.productCode,
    deviceIdentifier: transaction.deviceIdentifier,
    systemResult,
    actionLabel: actionFor(systemResult),
    recoveryAction: firstEvidenceIssue?.recoveryAction ?? firstIssue?.recoveryAction,
    evidence: {
      purchaseOrder: {
        label: "Purchase order",
        reference: evidenceLink?.purchaseOrder.purchaseOrderNumber ?? "Not linked",
        state: evidenceState(evidenceValidation, ["PO_APPROVED"]),
      },
      vendorInvoice: {
        label: "Vendor invoice",
        reference: evidenceLink?.invoice.invoiceNumber ?? "Not linked",
        state: evidenceState(evidenceValidation, ["VENDOR_MATCH", "PO_REFERENCE_MATCH", "EMPLOYER_MATCH"]),
      },
      movementEvidence: {
        label: "E-Way Bill / movement",
        reference: evidenceLink?.invoice.requiresEWayBill
          ? evidenceLink.eWayBill?.eWayBillNumber ?? "Not linked"
          : "Not required",
        state: evidenceLink?.invoice.requiresEWayBill
          ? evidenceState(evidenceValidation, ["EWAY_DOCUMENT_MATCH", "EWAY_VALUE_MATCH", "EWAY_GSTIN_MATCH", "EWAY_MOVEMENT_VALID", "EWAY_PART_B_REVIEW"])
          : "MATCHED",
      },
      deviceIdentifier: evidenceLink?.deviceIdentifier ?? "",
      programme: matchedReference(
        "Employer programme",
        mapping?.programmeId ?? transaction.programmeId,
      ),
      scheme: matchedReference("Scheme", scheme?.code),
      settlementRoute: matchedReference(
        "Settlement route",
        distributor?.name ?? mapping?.distributorId ?? transaction.distributorId,
      ),
      expectedAmountPaise: decision.expectedAmountPaise,
      filingDeadline: decision.filingDeadline,
    },
    technicalDetails: {
      decisionId: decision.id,
      decisionVersion: decision.version,
      evaluatedAt: decision.evaluatedAt,
      ruleResults: [...evidenceRules, ...decision.ruleResults],
    },
  };
}

export function buildOperationsReadModel(
  snapshot: SubventionSnapshot,
  options: OperationsReadModelOptions,
): OperationsReadModel {
  const rows = snapshot.transactions.map((transaction) =>
    makeRow(snapshot, transaction, options),
  );
  const counts = Object.fromEntries(
    OPERATIONS_OUTCOMES.map((outcome) => [
      outcome,
      rows.filter((row) => row.systemResult === outcome).length,
    ]),
  ) as Record<OperationsOutcome, number>;
  return { rows, counts };
}

export function filterOperationsRows(
  rows: OperationsQueueRow[],
  query: string,
  outcome?: OperationsOutcome,
): OperationsQueueRow[] {
  const normalized = query.trim().toLocaleLowerCase("en-IN");
  return rows.filter((row) => {
    if (outcome && row.systemResult !== outcome) return false;
    if (!normalized) return true;
    return [
      row.transactionReference,
      row.employer,
      row.purchaseOrderNumber,
      row.invoiceNumber,
      row.vendor,
      row.product,
      row.deviceIdentifier,
    ].some((value) => value.toLocaleLowerCase("en-IN").includes(normalized));
  });
}
