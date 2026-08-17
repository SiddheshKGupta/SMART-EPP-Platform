"use client";

import { useMemo, useState } from "react";
import type { ClaimBatch, ClaimLineResponse } from "@smart-epp/domain";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSubvention } from "@/features/subvention/store/SubventionProvider";

type ResponseDraft = Pick<ClaimLineResponse, "status" | "approvedAmountPaise" | "reason" | "responseReference">;

function rupeesToPaise(value: string): number {
  return Math.round(Number(value) * 100);
}

export function ClaimStageCapture({ batch }: { batch: ClaimBatch }) {
  const commands = useSubvention();
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState<string>();
  const [responses, setResponses] = useState<Record<string, ResponseDraft>>({});
  const approved = useMemo(() => batch.lines.reduce((sum, line) => sum + (line.approvedAmountPaise ?? 0), 0), [batch.lines]);

  async function run(command: () => Promise<{ ok: boolean; value?: ClaimBatch; error?: { message: string } }>) {
    const result = await command();
    setMessage(result.ok ? `Recorded. ${batch.reference} is now ${result.value?.status.replaceAll("_", " ").toLowerCase()}.` : result.error?.message);
  }

  function responseFor(lineId: string): ResponseDraft {
    return responses[lineId] ?? { status: "PENDING", approvedAmountPaise: 0, reason: "", responseReference: "" };
  }

  const busy = commands.isRefreshing;
  const reason = remarks.trim() || `Recorded from ${batch.reference} stage capture`;

  return (
    <section className="rounded-xl border border-[var(--border-strong)] bg-white p-5" aria-labelledby="stage-capture-title">
      <div className="border-b border-[var(--border)] pb-4">
        <span className="eyebrow">Stage capture</span>
        <h3 id="stage-capture-title" className="mt-1 text-lg font-semibold">{batch.reference}</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">Record only the evidence for the current stage. The lifecycle tracker does not manufacture downstream events.</p>
      </div>

      {batch.status === "DRAFT" || batch.status === "SUBMITTED_FOR_APPROVAL" ? (
        <div className="mt-4 grid max-w-2xl gap-3">
          <Label htmlFor="approval-remarks">Decision remarks</Label>
          <Textarea id="approval-remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="State the basis for submission or approval" />
          <Button className="w-fit" disabled={busy || !remarks.trim()} onClick={() => run(() => batch.status === "DRAFT" ? commands.submitClaimBatch(batch.id, remarks) : commands.approveClaimBatch(batch.id, remarks))}>
            {batch.status === "DRAFT" ? "Submit for approval" : "Approve and lock"}
          </Button>
        </div>
      ) : null}

      {batch.status === "APPROVED_LOCKED" ? (
        <div className="mt-4 grid max-w-2xl gap-3">
          <Label htmlFor="submission-reference">Counterparty submission reference</Label>
          <Input id="submission-reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Email, portal or claim reference" />
          <Label htmlFor="submission-remarks">Submission remarks</Label>
          <Textarea id="submission-remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          <Button className="w-fit" disabled={busy || !reference.trim() || !remarks.trim()} onClick={() => run(() => commands.recordClaimSubmission(batch.id, reference, remarks))}>Record submission</Button>
        </div>
      ) : null}

      {batch.status === "COUNTERPARTY_SUBMITTED" || batch.status === "PARTIALLY_RESPONDED" ? (
        <div className="mt-4 space-y-4">
          {batch.lines.map((line) => {
            const draft = responseFor(line.id);
            return (
              <div key={line.id} className="grid gap-3 rounded-lg border border-[var(--border)] p-4 lg:grid-cols-[1.2fr_.8fr_.8fr_1.2fr]">
                <div><strong className="text-sm">{line.invoiceNumber}</strong><p className="text-xs text-[var(--muted)]">{line.deviceIdentifier} · Expected <Money paise={line.expectedAmountPaise} /></p></div>
                <Select value={draft.status} onValueChange={(status) => setResponses((current) => ({ ...current, [line.id]: { ...draft, status: status as ResponseDraft["status"], approvedAmountPaise: status === "APPROVED" ? line.expectedAmountPaise : 0 } }))}>
                  <SelectTrigger aria-label={`Response status for ${line.invoiceNumber}`}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="APPROVED">Approved</SelectItem><SelectItem value="PARTIALLY_APPROVED">Partial</SelectItem><SelectItem value="REJECTED">Rejected</SelectItem><SelectItem value="PENDING">Pending</SelectItem></SelectContent>
                </Select>
                <Input aria-label={`Approved amount for ${line.invoiceNumber}`} type="number" min="0" step="0.01" value={(draft.approvedAmountPaise / 100).toString()} onChange={(event) => setResponses((current) => ({ ...current, [line.id]: { ...draft, approvedAmountPaise: rupeesToPaise(event.target.value) } }))} />
                <div className="grid gap-2"><Input aria-label={`Response reference for ${line.invoiceNumber}`} placeholder="Response reference" value={draft.responseReference} onChange={(event) => setResponses((current) => ({ ...current, [line.id]: { ...draft, responseReference: event.target.value } }))} /><Input aria-label={`Variance reason for ${line.invoiceNumber}`} placeholder="Reason for partial / rejection" value={draft.reason} onChange={(event) => setResponses((current) => ({ ...current, [line.id]: { ...draft, reason: event.target.value } }))} /></div>
              </div>
            );
          })}
          <Button disabled={busy} onClick={() => run(() => commands.recordClaimResponse(batch.id, batch.lines.map((line) => ({ lineId: line.id, ...responseFor(line.id) })), "Transaction-level OEM response recorded"))}>Record line responses</Button>
        </div>
      ) : null}

      {["RESPONDED", "INVOICED", "PARTIALLY_COLLECTED", "COLLECTED"].includes(batch.status) ? (
        <div className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">
          <div className="grid gap-2"><Label htmlFor="financial-reference">{batch.status === "RESPONDED" ? "Invoice reference" : batch.status === "COLLECTED" ? "Journal reference" : "Receipt reference"}</Label><Input id="financial-reference" value={reference} onChange={(event) => setReference(event.target.value)} /></div>
          <div className="grid gap-2"><Label htmlFor="financial-amount">{batch.status === "RESPONDED" ? "Invoice value" : batch.status === "COLLECTED" ? "Journal value" : "Total receipt allocation to date"}</Label><Input id="financial-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={(((batch.status === "RESPONDED" ? approved : batch.status === "COLLECTED" ? batch.collectedAmountPaise : batch.invoicedAmountPaise) ?? 0) / 100).toString()} /></div>
          <div className="grid gap-2 sm:col-span-2"><Label htmlFor="financial-remarks">Remarks</Label><Textarea id="financial-remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} /></div>
          <Button className="w-fit" disabled={busy || !reference.trim() || rupeesToPaise(amount) <= 0} onClick={() => run(() => {
            const paise = rupeesToPaise(amount);
            const auditRemarks = `${reason}; reference: ${reference.trim()}`;
            if (batch.status === "RESPONDED") return commands.recordClaimInvoice(batch.id, { reference: reference.trim(), amountPaise: paise }, auditRemarks);
            if (batch.status === "COLLECTED") return commands.recordClaimAccounting(batch.id, { journalReference: reference.trim(), amountPaise: paise }, auditRemarks);
            return commands.recordClaimCollection(batch.id, { reference: reference.trim(), amountPaise: paise }, auditRemarks);
          })}>{batch.status === "RESPONDED" ? "Record invoice" : batch.status === "COLLECTED" ? "Post accounting" : "Allocate receipt"}</Button>
        </div>
      ) : null}

      {batch.status === "ACCOUNTED" ? <div className="mt-4"><Button disabled={busy} onClick={() => run(() => commands.closeClaimBatch(batch.id, "Billing, collection and accounting reconciliation confirmed"))}>Close reconciled batch</Button></div> : null}
      {batch.status === "CLOSED" ? <p className="mt-4 text-sm font-medium text-[var(--success)]">This batch is fully reconciled and closed.</p> : null}
      {message ? <p className="mt-4 text-sm" role="status">{message}</p> : null}
    </section>
  );
}
