"use client";

import { CheckCircle2, CircleAlert, CircleX, X } from "lucide-react";
import { StatusBadge, type SemanticStatus } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import type {
  EvidenceDecision,
  EvidenceRuleResult,
  EvidenceValidationResult,
  TransactionEvidenceLink,
} from "../../../../../packages/domain/src/subvention/evidence";

function tone(decision: EvidenceDecision): SemanticStatus {
  if (decision === "PASS") return "APPROVED";
  if (decision === "BLOCKED") return "CRITICAL";
  if (decision === "REVIEW") return "ATTENTION";
  return "INFO";
}

function RuleIcon({ outcome }: { outcome: EvidenceRuleResult["outcome"] }) {
  if (outcome === "PASS") return <CheckCircle2 className="size-4 text-emerald-700" aria-hidden />;
  if (outcome === "FAIL") return <CircleX className="size-4 text-red-700" aria-hidden />;
  return <CircleAlert className="size-4 text-amber-700" aria-hidden />;
}

export function EvidenceDrawer({
  link,
  validation,
  onClose,
}: {
  link?: TransactionEvidenceLink;
  validation?: EvidenceValidationResult;
  onClose(): void;
}) {
  if (!link || !validation) return null;
  const line = link.invoice.lines.find((candidate) => candidate.id === link.invoiceLineId);
  const visibleChecks = [
    ["Purchase order", link.purchaseOrder.purchaseOrderNumber],
    ["Vendor invoice", link.invoice.invoiceNumber],
    ["Device / IMEI", line?.classification === "LINKED_SERVICE" ? "Linked service only" : link.deviceIdentifier || "Missing"],
    ["Employer programme", link.purchaseOrder.programmeId],
    ["Movement evidence", link.invoice.requiresEWayBill ? link.eWayBill?.eWayBillNumber || "Missing" : "Not required"],
  ];

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl"
      role="dialog"
      aria-modal="false"
      aria-labelledby="evidence-drawer-title"
    >
      <header className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Transaction evidence</span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 id="evidence-drawer-title" className="text-xl font-semibold">{link.invoice.invoiceNumber}</h2>
            <StatusBadge status={tone(validation.decision)} label={validation.decision.replaceAll("_", " ")} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{link.invoice.vendorLegalName}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close evidence drawer">
          <X aria-hidden />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <section aria-labelledby="evidence-links-title">
          <h3 id="evidence-links-title" className="text-sm font-semibold">Evidence chain</h3>
          <dl className="mt-3 divide-y divide-border rounded-xl border border-border">
            {visibleChecks.map(([itemLabel, value]) => (
              <div key={itemLabel} className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-muted-foreground">{itemLabel}</dt>
                <dd className="max-w-[60%] truncate text-right text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-6" aria-labelledby="evidence-resolution-title">
          <h3 id="evidence-resolution-title" className="text-sm font-semibold">Items requiring attention</h3>
          {validation.rules.every((rule) => rule.outcome === "PASS") ? (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              All mandatory evidence checks are clear.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {validation.rules.filter((rule) => rule.outcome !== "PASS").map((rule) => (
                <li key={rule.code} className="rounded-xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <RuleIcon outcome={rule.outcome} />
                    <div>
                      <strong className="text-sm">{rule.label}</strong>
                      <p className="mt-1 text-sm text-muted-foreground">{rule.reason}</p>
                      {rule.recoveryAction ? <p className="mt-2 text-sm font-medium">Next: {rule.recoveryAction}</p> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <details className="mt-6 rounded-xl border border-border p-4">
          <summary className="cursor-pointer text-sm font-medium">View technical validation trace</summary>
          <ul className="mt-4 space-y-3">
            {validation.rules.map((rule) => (
              <li key={rule.code} className="flex items-start gap-3 text-sm">
                <RuleIcon outcome={rule.outcome} />
                <div>
                  <code className="text-xs text-muted-foreground">{rule.code}</code>
                  <p>{rule.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </aside>
  );
}
