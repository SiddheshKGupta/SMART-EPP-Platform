"use client";

import { CheckCircle2, Clock3 } from "lucide-react";
import { useState } from "react";
import type { ClaimBatchStatus } from "@smart-epp/domain";
import { Money } from "@/components/shared/Money";
import { StatusBadge, type SemanticStatus } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { DEMO_NOW } from "@/features/subvention/data/seed";
import { useSubvention } from "@/features/subvention/store/SubventionProvider";
import { ClaimStageCapture } from "./ClaimStageCapture";

const nextStep: Record<ClaimBatchStatus, { owner: string; action: string }> = {
  DRAFT: { owner: "Operations maker", action: "Submit for approval" }, SUBMITTED_FOR_APPROVAL: { owner: "Business checker", action: "Review and lock" }, APPROVED_LOCKED: { owner: "Operations maker", action: "Submit to counterparty" }, COUNTERPARTY_SUBMITTED: { owner: "Counterparty", action: "Record response" }, PARTIALLY_RESPONDED: { owner: "Counterparty", action: "Complete response" }, RESPONDED: { owner: "Finance", action: "Raise invoice" }, INVOICED: { owner: "Finance", action: "Allocate receipt" }, PARTIALLY_COLLECTED: { owner: "Finance", action: "Collect balance" }, COLLECTED: { owner: "Accounts", action: "Post accounting" }, ACCOUNTED: { owner: "Business checker", action: "Close batch" }, CLOSED: { owner: "—", action: "Complete" },
};

function tone(status: ClaimBatchStatus): SemanticStatus {
  if (["CLOSED", "COLLECTED", "ACCOUNTED", "APPROVED_LOCKED"].includes(status)) return "APPROVED";
  if (["PARTIALLY_RESPONDED", "PARTIALLY_COLLECTED"].includes(status)) return "ATTENTION";
  return status === "DRAFT" ? "DRAFT" : "SUBMITTED";
}

export function ClaimLifecycleTracker() {
  const { snapshot } = useSubvention();
  const [selectedId, setSelectedId] = useState<string>();
  const selected = snapshot.claimBatches.find((batch) => batch.id === selectedId);
  return (
    <section className="mt-8 space-y-4" aria-labelledby="claim-tracker-title">
      <header className="border-b border-[var(--border)] pb-3"><span className="eyebrow">Track claims</span><h2 id="claim-tracker-title" className="text-xl font-semibold">Lifecycle position</h2><p className="mt-1 text-sm text-[var(--muted)]">Open a batch to capture its current-stage evidence. The tracker remains a navigation view.</p></header>
      {snapshot.claimBatches.length ? <div className="space-y-3">{snapshot.claimBatches.map((batch) => {
        const step = nextStep[batch.status];
        const days = Math.max(0, Math.floor((Date.parse(DEMO_NOW) - Date.parse(batch.stageEnteredAt)) / 86_400_000));
        return <article key={batch.id} className="grid gap-4 rounded-xl border border-[var(--border)] bg-white p-5 lg:grid-cols-[1.25fr_.8fr_.8fr_auto] lg:items-center">
          <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{batch.reference}</h3><StatusBadge status={tone(batch.status)} label={batch.status.replaceAll("_", " ")} /></div><p className="mt-2 text-sm text-[var(--muted)]">{batch.settlementCounterpartyId} · {batch.lines.length} transactions · <Money paise={batch.expectedAmountPaise} /></p></div>
          <div><span className="text-xs text-[var(--muted)]">Time in phase</span><p className="mt-1 flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4" />{days} days</p></div>
          <div><span className="text-xs text-[var(--muted)]">Next owner</span><p className="mt-1 text-sm font-semibold">{step.owner}</p><p className="text-xs text-[var(--muted)]">{step.action}</p></div>
          {batch.status === "CLOSED" ? <CheckCircle2 className="size-6 text-[var(--success)]" /> : <Button variant="outline" onClick={() => setSelectedId(batch.id)}>Open stage capture</Button>}
        </article>;
      })}</div> : <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-white px-6 py-10 text-center"><h3 className="font-semibold">No claim batches yet</h3><p className="mt-1 text-sm text-[var(--muted)]">Ready transactions will appear by settlement route above.</p></div>}
      {selected ? <ClaimStageCapture batch={selected} /> : null}
    </section>
  );
}
