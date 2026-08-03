import {
  evaluateEligibility,
  type Actor,
  type EligibilityDecision,
  type PurchaseTransaction,
  type RuleResult,
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

export type TransactionLifecycleStage =
  | "DRAFT"
  | "SUBMITTED_FOR_APPROVAL"
  | "APPROVED_AND_LOCKED"
  | "SUBMITTED_TO_COUNTERPARTY"
  | "RESPONDED"
  | "REJECTED"
  | "INVOICED"
  | "COLLECTED"
  | "ACCOUNTING_RECONCILED"
  | "CLOSED";

export interface EvidenceReference {
  label: string;
  reference: string;
  state: "MATCHED" | "MISSING" | "REVIEW";
}

export interface TransactionEvidenceView {
  purchaseOrder: EvidenceReference;
  vendorInvoice: EvidenceReference;
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
    case "SUBMITTED_TO_COUNTERPARTY":
    case "RESPONDED":
      return "Submitted";
    case "APPROVED_AND_LOCKED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "INVOICED":
      return "Invoiced";
    case "COLLECTED":
    case "ACCOUNTING_RECONCILED":
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
  if (
    issueCodes.some(
      (code) =>
        code.includes("PRODUCT") ||
        code.includes("PROGRAMME") ||
        code.includes("SCHEME"),
    )
  ) {
    return "Rejected";
  }
  return "Blocked";
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
  const processing = options.processingTransactionIds?.has(transaction.id) ?? false;
  const systemResult = processing
    ? "Processing"
    : lifecycleOutcome(options.lifecycleByTransaction?.[transaction.id]) ??
      decisionOutcome(decision);

  return {
    transactionId: transaction.id,
    transactionReference: transaction.leaseId,
    employer: employer?.name ?? transaction.employerId,
    purchaseOrderNumber: transaction.purchaseOrderNumber,
    invoiceNumber: transaction.invoiceNumber,
    vendor: reseller?.name ?? transaction.resellerId,
    product: product?.name ?? transaction.productCode,
    deviceIdentifier: transaction.deviceIdentifier,
    systemResult,
    actionLabel: actionFor(systemResult),
    recoveryAction: firstIssue?.recoveryAction,
    evidence: {
      purchaseOrder: matchedReference(
        "Purchase order",
        transaction.purchaseOrderNumber,
      ),
      vendorInvoice: matchedReference(
        "Vendor invoice",
        transaction.invoiceNumber,
      ),
      deviceIdentifier: transaction.deviceIdentifier,
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
      ruleResults: decision.ruleResults,
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
