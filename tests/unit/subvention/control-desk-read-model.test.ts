import { describe, expect, it } from "vitest";
import type { EligibilityDecision } from "../../../packages/domain/src";
import { createDemoSubventionSeed, DEMO_NOW } from "../../../apps/web/features/subvention/data/seed";
import { selectControlDeskReadModel } from "../../../apps/web/features/subvention/control-desk/controlDeskReadModel";

function modelForSeed() {
  const snapshot = createDemoSubventionSeed();
  return {
    snapshot,
    model: selectControlDeskReadModel(snapshot, {
      actor: snapshot.actors[0]!,
      evaluatedAt: DEMO_NOW,
    }),
  };
}

describe("control desk read model", () => {
  it("uses authoritative product, prior-claim, and duplicate controls for seeded rows", () => {
    const { model } = modelForSeed();
    const rows = new Map(model.transactions.map((row) => [row.transaction.id, row]));

    expect(
      rows
        .get("transaction-product-ineligible-01")
        ?.decision.ruleResults.some(
          (rule) => rule.code === "PROGRAMME_MAPPING_MISSING",
        ),
    ).toBe(true);
    expect(
      rows
        .get("transaction-claimed-device")
        ?.decision.ruleResults.some(
          (rule) => rule.code === "ALREADY_CLAIMED_DEVICE_IDENTIFIER",
        ),
    ).toBe(true);
    expect(
      rows
        .get("transaction-claimed-lease")
        ?.decision.ruleResults.some((rule) => rule.code === "ALREADY_CLAIMED_LEASE"),
    ).toBe(true);
    expect(
      rows
        .get("transaction-duplicate-import-01")
        ?.decision.ruleResults.some(
          (rule) => rule.code === "DUPLICATE_DEVICE_IDENTIFIER",
        ),
    ).toBe(true);
  });

  it("uses an approved programme timeline override for deadline status", () => {
    const snapshot = createDemoSubventionSeed();
    snapshot.eligibilityDecisions = snapshot.eligibilityDecisions.filter(
      (decision) => decision.transactionId !== "transaction-eligible-01",
    );
    const transaction = snapshot.transactions.find(
      (candidate) => candidate.id === "transaction-eligible-01",
    )!;
    const mapping = snapshot.programmeMappings.find(
      (candidate) =>
        candidate.workflowStatus === "APPROVED" &&
        candidate.employerId === transaction.employerId &&
        candidate.programmeId === transaction.programmeId &&
        candidate.oemId === transaction.oemId &&
        candidate.resellerId === transaction.resellerId &&
        candidate.distributorId === transaction.distributorId,
    )!;
    mapping.overrides = {
      claimTimelineDays: 5,
      approvalReference: "OVERRIDE-2026-01",
    };

    const model = selectControlDeskReadModel(snapshot, {
      actor: snapshot.actors[0]!,
      evaluatedAt: DEMO_NOW,
    });
    const row = model.transactions.find(
      (candidate) => candidate.transaction.id === "transaction-eligible-01",
    )!;

    expect(row.decision.ruleSnapshot?.claimTimelineDays).toBe(5);
    expect(row.decision.filingDeadline).toBe("2026-07-20");
    expect(row.deadlineState).toBe("OVERDUE");
    expect(
      row.decision.ruleResults.some(
        (rule) => rule.code === "FILING_TIMELINE_EXPIRED",
      ),
    ).toBe(true);
  });

  it("prefers the latest persisted decision without mutating the snapshot", () => {
    const snapshot = createDemoSubventionSeed();
    const persisted: EligibilityDecision = {
      id: "persisted-decision-2",
      transactionId: "transaction-eligible-01",
      version: 2,
      status: "INELIGIBLE",
      expectedAmountPaise: 123_456,
      filingDeadline: "2026-08-01",
      evaluatedAt: "2026-07-27T10:00:00.000Z",
      evaluatedBy: "sales-ops-maker",
      ruleResults: [
        {
          code: "PERSISTED_CONTROL",
          label: "Persisted control",
          outcome: "FAIL",
          reason: "A persisted reviewer decision applies.",
        },
      ],
    };
    snapshot.eligibilityDecisions.push(persisted);
    const before = structuredClone(snapshot);

    const model = selectControlDeskReadModel(snapshot, {
      actor: snapshot.actors[0]!,
      evaluatedAt: DEMO_NOW,
    });
    const row = model.transactions.find(
      (candidate) => candidate.transaction.id === "transaction-eligible-01",
    )!;

    expect(row.decision).toEqual(persisted);
    expect(row.decisionKind).toBe("PERSISTED");
    expect(
      model.awaitingEvaluation.some(
        (candidate) =>
          candidate.transaction.id === "transaction-eligible-01",
      ),
    ).toBe(false);
    expect(snapshot).toEqual(before);
  });

  it("retains unevaluated rows as a true awaiting-evaluation population", () => {
    const snapshot = createDemoSubventionSeed();
    snapshot.eligibilityDecisions = [];
    const model = selectControlDeskReadModel(snapshot, {
      actor: snapshot.actors[0]!,
      evaluatedAt: DEMO_NOW,
    });
    const awaiting = model.awaitingEvaluation.find(
      (row) => row.transaction.id === "transaction-eligible-01",
    );

    expect(awaiting?.decisionKind).toBe("PREVIEW");
    expect(model.awaitingEvaluation).toHaveLength(model.transactions.length);
  });
});
