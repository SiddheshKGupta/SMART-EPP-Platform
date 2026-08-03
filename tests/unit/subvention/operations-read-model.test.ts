import { describe, expect, it } from "vitest";
import type {
  EligibilityDecision,
  SubventionSnapshot,
} from "@smart-epp/domain";
import { createDemoSubventionSeed } from "../../../apps/web/features/subvention/data/seed";
import {
  buildOperationsReadModel,
  filterOperationsRows,
  type TransactionLifecycleStage,
} from "../../../apps/web/features/subvention/operations/operationsReadModel";

const evaluatedAt = "2026-07-28T10:00:00.000Z";

function withDecision(
  snapshot: SubventionSnapshot,
  decision: EligibilityDecision,
): SubventionSnapshot {
  return {
    ...snapshot,
    eligibilityDecisions: [
      ...snapshot.eligibilityDecisions.filter(
        (candidate) => candidate.transactionId !== decision.transactionId,
      ),
      decision,
    ],
  };
}

describe("operations read model", () => {
  it("maps automatic eligibility results to the canonical visible outcomes", () => {
    const snapshot = createDemoSubventionSeed();
    const model = buildOperationsReadModel(snapshot, {
      actor: snapshot.actors[0]!,
      evaluatedAt,
    });

    expect(model.rows.some((row) => row.systemResult === "Ready for Claim")).toBe(true);
    expect(model.rows.some((row) => row.systemResult === "Blocked")).toBe(true);
    expect(model.rows.some((row) => row.systemResult === "Needs Review")).toBe(true);
    expect(model.rows.every((row) => [
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
    ].includes(row.systemResult))).toBe(true);
  });

  it("keeps claim lifecycle precedence over eligibility status", () => {
    const snapshot = createDemoSubventionSeed();
    const transactionId = snapshot.transactions[0]!.id;
    const lifecycleByTransaction: Record<string, TransactionLifecycleStage> = {
      [transactionId]: "APPROVED_AND_LOCKED",
    };

    const model = buildOperationsReadModel(snapshot, {
      actor: snapshot.actors[0]!,
      evaluatedAt,
      lifecycleByTransaction,
    });

    expect(model.rows.find((row) => row.transactionId === transactionId)?.systemResult)
      .toBe("Approved");
  });

  it("exposes an evidence-first record with progressive technical detail", () => {
    const snapshot = createDemoSubventionSeed();
    const model = buildOperationsReadModel(snapshot, {
      actor: snapshot.actors[0]!,
      evaluatedAt,
    });
    const row = model.rows.find((candidate) => candidate.systemResult === "Ready for Claim")!;

    expect(row.evidence.purchaseOrder.reference).toMatch(/^PO-/);
    expect(row.evidence.vendorInvoice.reference).toMatch(/^INV-/);
    expect(row.evidence.deviceIdentifier).toBeTruthy();
    expect(row.evidence.programme.reference).toBeTruthy();
    expect(row.evidence.scheme.reference).toBeTruthy();
    expect(row.evidence.settlementRoute.reference).toBeTruthy();
    expect(row.evidence.expectedAmountPaise).toBeGreaterThan(0);
    expect(row.evidence.filingDeadline).toMatch(/^2026-/);
    expect(row.technicalDetails.ruleResults.length).toBeGreaterThan(0);
  });

  it("preserves the first actionable recovery instruction for exception work", () => {
    const snapshot = createDemoSubventionSeed();
    const transaction = snapshot.transactions[0]!;
    const decision: EligibilityDecision = {
      id: "decision-review",
      transactionId: transaction.id,
      version: 1,
      status: "EXCEPTION_REVIEW",
      expectedAmountPaise: 0,
      filingDeadline: "2026-09-01",
      evaluatedAt,
      evaluatedBy: snapshot.actors[0]!.userId,
      ruleResults: [
        {
          code: "EWAY_BILL_REVIEW",
          label: "Movement evidence",
          reason: "Part B is not available.",
          outcome: "REVIEW",
          recoveryAction: "Upload Part B or record an authorised exception decision.",
        },
      ],
    };

    const model = buildOperationsReadModel(withDecision(snapshot, decision), {
      actor: snapshot.actors[0]!,
      evaluatedAt,
    });
    const row = model.rows.find((candidate) => candidate.transactionId === transaction.id)!;

    expect(row.systemResult).toBe("Needs Review");
    expect(row.recoveryAction).toBe(
      "Upload Part B or record an authorised exception decision.",
    );
    expect(row.actionLabel).toBe("Review exception");
  });

  it("searches the compact queue across invoice, PO, IMEI, employer and vendor", () => {
    const snapshot = createDemoSubventionSeed();
    const model = buildOperationsReadModel(snapshot, {
      actor: snapshot.actors[0]!,
      evaluatedAt,
    });
    const target = model.rows[0]!;

    expect(filterOperationsRows(model.rows, target.invoiceNumber)).toEqual([target]);
    expect(
      filterOperationsRows(model.rows, target.deviceIdentifier, target.systemResult),
    ).toEqual([target]);
    expect(filterOperationsRows(model.rows, "not-a-real-reference")).toEqual([]);
  });
});
