"use client";

import { AlertTriangle, ArrowRight, CalendarClock } from "lucide-react";
import { useMemo, useState } from "react";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { DEMO_NOW } from "@/features/subvention/data/seed";
import { useSubvention } from "@/features/subvention/store/SubventionProvider";

interface RouteGroup {
  id: string;
  name: string;
  transactionIds: string[];
  expectedAmountPaise: number;
  oldestInvoice: string;
  filingDeadline: string;
  warnings: string[];
}

function daysUntil(date: string): number {
  return Math.ceil((Date.parse(`${date}T00:00:00Z`) - Date.parse(DEMO_NOW)) / 86_400_000);
}

export function ClaimPreparation() {
  const { snapshot, activeActor, createClaimBatch, isRefreshing } = useSubvention();
  const [message, setMessage] = useState<string>();
  const groups = useMemo(() => {
    const claimed = new Set(snapshot.claimBatches.flatMap((batch) => batch.lines.map((line) => line.transactionId)));
    const latest = new Map<string, (typeof snapshot.eligibilityDecisions)[number]>();
    snapshot.eligibilityDecisions.forEach((decision) => {
      const current = latest.get(decision.transactionId);
      if (!current || decision.version > current.version) latest.set(decision.transactionId, decision);
    });
    const byRoute = new Map<string, RouteGroup>();
    snapshot.transactions.forEach((transaction) => {
      const decision = latest.get(transaction.id);
      if (!decision?.ruleSnapshot || decision.status !== "ELIGIBLE" || claimed.has(transaction.id)) return;
      const type = decision.ruleSnapshot.settlementCounterpartyType;
      const id = type === "OEM" ? transaction.oemId : type === "RESELLER" ? transaction.resellerId : transaction.distributorId;
      if (!id) return;
      const name = type === "OEM"
        ? snapshot.masters.oems.find((row) => row.id === id)?.name
        : type === "RESELLER"
          ? snapshot.masters.resellers.find((row) => row.id === id)?.name
          : snapshot.masters.distributors.find((row) => row.id === id)?.name;
      const current = byRoute.get(id) ?? { id, name: name ?? id, transactionIds: [], expectedAmountPaise: 0, oldestInvoice: transaction.invoiceDate, filingDeadline: decision.filingDeadline, warnings: [] };
      current.transactionIds.push(transaction.id);
      current.expectedAmountPaise += decision.expectedAmountPaise;
      if (transaction.invoiceDate < current.oldestInvoice) current.oldestInvoice = transaction.invoiceDate;
      if (decision.filingDeadline < current.filingDeadline) current.filingDeadline = decision.filingDeadline;
      byRoute.set(id, current);
    });
    return [...byRoute.values()].map((group) => ({
      ...group,
      warnings: daysUntil(group.filingDeadline) <= 15 ? [`Claim window: ${Math.max(0, daysUntil(group.filingDeadline))} days remaining`] : [],
    })).sort((a, b) => a.filingDeadline.localeCompare(b.filingDeadline));
  }, [snapshot]);

  async function create(group: RouteGroup) {
    const result = await createClaimBatch(group.transactionIds, group.id, "Prepared from persisted eligible decisions");
    setMessage(result.ok ? `${result.value.reference} created as a controlled draft.` : result.error.message);
  }

  return (
    <section className="space-y-4" aria-labelledby="claim-preparation-title">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div>
          <span className="eyebrow">Prepare claims</span>
          <h2 id="claim-preparation-title" className="text-xl font-semibold">Ready by settlement route</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Only persisted eligible decisions appear. Each batch contains one counterparty.</p>
        </div>
        <span className="text-xs font-medium text-[var(--muted)]">{groups.reduce((sum, group) => sum + group.transactionIds.length, 0)} transactions ready</span>
      </header>
      {message ? <div className="rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-sm" role="status">{message}</div> : null}
      {groups.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {groups.map((group) => (
            <article key={group.id} className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-[var(--workspace-shadow)]">
              <div className="flex items-start justify-between gap-4">
                <div><span className="eyebrow">Settlement counterparty</span><h3 className="mt-1 text-base font-semibold">{group.name}</h3></div>
                <Money paise={group.expectedAmountPaise} className="text-lg font-semibold" />
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-[var(--border)] py-4 text-sm">
                <div><dt className="text-xs text-[var(--muted)]">Transactions</dt><dd className="mt-1 font-semibold">{group.transactionIds.length}</dd></div>
                <div><dt className="text-xs text-[var(--muted)]">Oldest invoice</dt><dd className="mt-1 font-semibold">{group.oldestInvoice}</dd></div>
                <div><dt className="text-xs text-[var(--muted)]">Claim window</dt><dd className="mt-1 font-semibold">{daysUntil(group.filingDeadline)} days</dd></div>
              </dl>
              {group.warnings.map((warning) => <p key={warning} className="mt-3 flex items-center gap-2 text-xs font-medium text-[var(--warning)]"><AlertTriangle className="size-4" />{warning}</p>)}
              <div className="mt-5 flex justify-end"><Button disabled={isRefreshing || activeActor.role !== "SALES_OPS_MAKER"} onClick={() => create(group)}>Create claim batch <ArrowRight className="size-4" /></Button></div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-white px-6 py-12 text-center">
          <CalendarClock className="mx-auto size-7 text-[var(--success)]" />
          <h3 className="mt-3 font-semibold">No transactions are ready for batching</h3>
          <p className="mx-auto mt-1 max-w-lg text-sm text-[var(--muted)]">Persist eligibility decisions in Review Transactions. Already batched transactions remain in the tracker below.</p>
          <a className="mt-4 inline-flex text-sm font-semibold text-[var(--primary)]" href="/subvention/operations">Review transactions <ArrowRight className="ml-1 size-4" /></a>
        </div>
      )}
    </section>
  );
}
