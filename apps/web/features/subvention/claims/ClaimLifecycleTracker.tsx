"use client";

import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { useState } from "react";
import { Money } from "@/components/shared/Money";
import { StatusBadge, type SemanticStatus } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { DEMO_NOW } from "@/features/subvention/data/seed";
import { useSubvention } from "@/features/subvention/store/SubventionProvider";
import type { ClaimBatch, ClaimBatchStatus } from "@smart-epp/domain";

const nextStep: Record<ClaimBatchStatus, { owner: string; action: string }> = {
  DRAFT: { owner: "Operations maker", action: "Submit for approval" },
  SUBMITTED_FOR_APPROVAL: { owner: "Business checker", action: "Review and lock" },
  APPROVED_LOCKED: { owner: "Operations maker", action: "Submit to counterparty" },
  COUNTERPARTY_SUBMITTED: { owner: "Counterparty", action: "Record response" },
  PARTIALLY_RESPONDED: { owner: "Counterparty", action: "Complete response" },
  RESPONDED: { owner: "Finance", action: "Raise invoice" },
  INVOICED: { owner: "Finance", action: "Allocate receipt" },
  PARTIALLY_COLLECTED: { owner: "Finance", action: "Collect balance" },
  COLLECTED: { owner: "Accounts", action: "Post accounting" },
  ACCOUNTED: { owner: "Business checker", action: "Close batch" },
  CLOSED: { owner: "—", action: "Complete" },
};

function tone(status: ClaimBatchStatus): SemanticStatus {
  if (["CLOSED", "COLLECTED", "ACCOUNTED", "APPROVED_LOCKED"].includes(status)) return "APPROVED";
  if (["PARTIALLY_RESPONDED", "PARTIALLY_COLLECTED"].includes(status)) return "ATTENTION";
  return status === "DRAFT" ? "DRAFT" : "SUBMITTED";
}

function daysInStage(batch: ClaimBatch): number {
  return Math.max(0, Math.floor((Date.parse(DEMO_NOW) - Date.parse(batch.stageEnteredAt)) / 86_400_000));
}

export function ClaimLifecycleTracker() {
  const { snapshot, activeActor, submitClaimBatch, approveClaimBatch, recordClaimSubmission, recordClaimResponse, recordClaimInvoice, recordClaimCollection, recordClaimAccounting, closeClaimBatch, isRefreshing } = useSubvention();
  const [message, setMessage] = useState<string>();

  async function advance(batch: ClaimBatch) {
    const remarks = `Advance ${batch.reference} through controlled workflow`;
    const result = batch.status === "DRAFT"
      ? await submitClaimBatch(batch.id, remarks)
      : batch.status === "SUBMITTED_FOR_APPROVAL"
        ? await approveClaimBatch(batch.id, remarks)
        : batch.status === "APPROVED_LOCKED"
          ? await recordClaimSubmission(batch.id, `SUB-${batch.reference}`, remarks)
          : ["COUNTERPARTY_SUBMITTED", "PARTIALLY_RESPONDED"].includes(batch.status)
            ? await recordClaimResponse(batch.id, batch.lines.map((line) => ({ lineId: line.id, status: "APPROVED" as const, approvedAmountPaise: line.expectedAmountPaise })), remarks)
            : batch.status === "RESPONDED"
              ? await recordClaimInvoice(batch.id, batch.lines.reduce((sum, line) => sum + (line.approvedAmountPaise ?? 0), 0), remarks)
              : ["INVOICED", "PARTIALLY_COLLECTED"].includes(batch.status)
                ? await recordClaimCollection(batch.id, batch.invoicedAmountPaise ?? 0, remarks)
                : batch.status === "COLLECTED"
                  ? await recordClaimAccounting(batch.id, batch.collectedAmountPaise ?? 0, remarks)
                  : batch.status === "ACCOUNTED"
                    ? await closeClaimBatch(batch.id, remarks)
                    : undefined;
    if (result) setMessage(result.ok ? `${batch.reference} moved to ${result.value.status.replaceAll("_", " ").toLowerCase()}.` : result.error.message);
  }

  function canAdvance(batch: ClaimBatch): boolean {
    if (batch.status === "DRAFT") return activeActor.userId === batch.makerUserId;
    if (batch.status === "SUBMITTED_FOR_APPROVAL") return activeActor.role === "BUSINESS_HEAD_CHECKER" && activeActor.userId !== batch.makerUserId;
    if (["APPROVED_LOCKED", "COUNTERPARTY_SUBMITTED", "PARTIALLY_RESPONDED", "RESPONDED", "INVOICED", "PARTIALLY_COLLECTED"].includes(batch.status)) return ["SALES_OPS_MAKER", "BUSINESS_HEAD_CHECKER"].includes(activeActor.role);
    if (["COLLECTED", "ACCOUNTED"].includes(batch.status)) return activeActor.role === "BUSINESS_HEAD_CHECKER";
    return false;
  }

  return (
    <section className="mt-8 space-y-4" aria-labelledby="claim-tracker-title">
      <header className="border-b border-[var(--border)] pb-3"><span className="eyebrow">Track claims</span><h2 id="claim-tracker-title" className="text-xl font-semibold">Lifecycle position</h2></header>
      {message ? <div className="rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-sm" role="status">{message}</div> : null}
      {snapshot.claimBatches.length ? <div className="space-y-3">{snapshot.claimBatches.map((batch) => {
        const step = nextStep[batch.status];
        return <article key={batch.id} className="grid gap-4 rounded-xl border border-[var(--border)] bg-white p-5 lg:grid-cols-[1.25fr_.8fr_.8fr_auto] lg:items-center">
          <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{batch.reference}</h3><StatusBadge status={tone(batch.status)} label={batch.status.replaceAll("_", " ")} /></div><p className="mt-2 text-sm text-[var(--muted)]">{batch.settlementCounterpartyId} · {batch.lines.length} transactions · <Money paise={batch.expectedAmountPaise} /></p></div>
          <div><span className="text-xs text-[var(--muted)]">Time in phase</span><p className="mt-1 flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4" />{daysInStage(batch)} days</p></div>
          <div><span className="text-xs text-[var(--muted)]">Next owner</span><p className="mt-1 text-sm font-semibold">{step.owner}</p><p className="text-xs text-[var(--muted)]">{step.action}</p></div>
          {batch.status === "CLOSED" ? <CheckCircle2 className="size-6 text-[var(--success)]" /> : <Button variant="outline" disabled={isRefreshing || !canAdvance(batch)} onClick={() => advance(batch)}>{step.action}<ArrowRight className="size-4" /></Button>}
        </article>;
      })}</div> : <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-white px-6 py-10 text-center"><h3 className="font-semibold">No claim batches yet</h3><p className="mt-1 text-sm text-[var(--muted)]">Ready transactions will appear by settlement route above.</p></div>}
    </section>
  );
}
