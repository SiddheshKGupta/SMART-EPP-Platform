import {
  addDaysIso,
  evaluateEligibility,
  type Actor,
  type EligibilityDecision,
  type PurchaseTransaction,
  type QuarantinedPurchaseImportRow,
  type SubventionSnapshot,
} from "@smart-epp/domain";

export type DeadlineState =
  | "OVERDUE"
  | "DUE_WITHIN_7_DAYS"
  | "CURRENT"
  | "UNAVAILABLE";

export interface ControlDeskTransactionReadModel {
  transaction: PurchaseTransaction;
  decision: EligibilityDecision;
  deadlineState: DeadlineState;
}

export interface ControlDeskReadModel {
  transactions: ControlDeskTransactionReadModel[];
  deadlineExceptions: ControlDeskTransactionReadModel[];
  blockedTransactions: ControlDeskTransactionReadModel[];
  approvalQueue: Array<{
    id: string;
    entityType: "SCHEME" | "PROGRAMME_MAPPING";
  }>;
  quarantinedImports: QuarantinedPurchaseImportRow[];
}

export interface ControlDeskReadModelOptions {
  actor: Actor;
  evaluatedAt: string;
}

function duplicateValues(
  values: string[],
  configuredDuplicates: string[],
): ReadonlySet<string> {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  const duplicates = new Set(configuredDuplicates);
  counts.forEach((count, value) => {
    if (count > 1) duplicates.add(value);
  });
  return duplicates;
}

function latestDecision(
  decisions: EligibilityDecision[],
  transactionId: string,
): EligibilityDecision | undefined {
  return decisions.reduce<EligibilityDecision | undefined>(
    (latest, decision) =>
      decision.transactionId === transactionId &&
      (latest === undefined || decision.version > latest.version)
        ? decision
        : latest,
    undefined,
  );
}

function deadlineStateFor(
  filingDeadline: string,
  evaluationDate: string,
): DeadlineState {
  if (!filingDeadline) return "UNAVAILABLE";
  if (filingDeadline < evaluationDate) return "OVERDUE";
  return filingDeadline <= addDaysIso(evaluationDate, 7)
    ? "DUE_WITHIN_7_DAYS"
    : "CURRENT";
}

export function selectControlDeskReadModel(
  snapshot: SubventionSnapshot,
  options: ControlDeskReadModelOptions,
): ControlDeskReadModel {
  const evaluationDate = options.evaluatedAt.slice(0, 10);
  const duplicateDeviceIdentifiers = duplicateValues(
    snapshot.transactions.map(
      (transaction) => transaction.deviceIdentifier,
    ),
    snapshot.duplicateDeviceIdentifiers,
  );
  const duplicateLeaseIds = duplicateValues(
    snapshot.transactions.map((transaction) => transaction.leaseId),
    snapshot.duplicateLeaseIds,
  );
  const existingClaimedDeviceIdentifiers = new Set(
    snapshot.existingClaimedDeviceIdentifiers,
  );
  const existingClaimedLeaseIds = new Set(snapshot.existingClaimedLeaseIds);

  const transactions = snapshot.transactions.map((transaction) => {
      const persisted = latestDecision(
        snapshot.eligibilityDecisions,
        transaction.id,
      );
      const decision =
        persisted ??
        evaluateEligibility({
          transaction,
          schemes: snapshot.schemes,
          mappings: snapshot.programmeMappings,
          oemDefaults: snapshot.oems.find(
            (oem) => oem.id === transaction.oemId,
          )?.defaults,
          duplicateDeviceIdentifiers,
          duplicateLeaseIds,
          existingClaimedDeviceIdentifiers,
          existingClaimedLeaseIds,
          evaluationDate,
          evaluatedAt: options.evaluatedAt,
          actor: options.actor,
          decisionId: `control-desk-read-${transaction.id}`,
          version: 1,
        });

      return {
        transaction,
        decision,
        deadlineState: deadlineStateFor(
          decision.filingDeadline,
          evaluationDate,
        ),
      };
    });

  return {
    transactions,
    deadlineExceptions: transactions.filter(
      (row) =>
        row.deadlineState === "OVERDUE" ||
        row.deadlineState === "DUE_WITHIN_7_DAYS",
    ),
    blockedTransactions: transactions.filter(
      (row) => row.decision.status !== "ELIGIBLE",
    ),
    approvalQueue: [
      ...snapshot.schemes
        .filter((scheme) => scheme.workflowStatus === "SUBMITTED")
        .map((scheme) => ({
          id: scheme.id,
          entityType: "SCHEME" as const,
        })),
      ...snapshot.programmeMappings
        .filter((mapping) => mapping.workflowStatus === "SUBMITTED")
        .map((mapping) => ({
          id: mapping.id,
          entityType: "PROGRAMME_MAPPING" as const,
        })),
    ],
    quarantinedImports: structuredClone(snapshot.quarantinedImports),
  };
}
