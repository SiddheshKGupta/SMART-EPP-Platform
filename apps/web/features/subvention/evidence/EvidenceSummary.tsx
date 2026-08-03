"use client";

import { CheckCircle2, CircleAlert, CircleX, Link2 } from "lucide-react";
import { StatusBadge, type SemanticStatus } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import type {
  EvidenceDecision,
  EvidenceValidationResult,
  TransactionEvidenceLink,
} from "../../../../../packages/domain/src/subvention/evidence";

function tone(decision: EvidenceDecision): SemanticStatus {
  if (decision === "PASS") return "APPROVED";
  if (decision === "BLOCKED") return "CRITICAL";
  if (decision === "REVIEW") return "ATTENTION";
  return "INFO";
}

function label(decision: EvidenceDecision): string {
  return {
    PASS: "Evidence complete",
    REVIEW: "Needs review",
    BLOCKED: "Evidence blocked",
    LINKED_SERVICE: "Linked service",
  }[decision];
}

export function EvidenceSummary({
  link,
  validation,
  onOpen,
}: {
  link: TransactionEvidenceLink;
  validation: EvidenceValidationResult;
  onOpen?(): void;
}) {
  const passed = validation.rules.filter((rule) => rule.outcome === "PASS").length;
  const attention = validation.rules.length - passed;
  const Icon = validation.decision === "PASS"
    ? CheckCircle2
    : validation.decision === "BLOCKED"
      ? CircleX
      : validation.decision === "REVIEW"
        ? CircleAlert
        : Link2;

  return (
    <section
      className="rounded-xl border border-border bg-background p-4"
      aria-label={`Evidence for transaction ${link.transactionId}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 rounded-lg bg-muted p-2 text-foreground" aria-hidden="true">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="truncate text-sm">{link.invoice.invoiceNumber}</strong>
              <StatusBadge status={tone(validation.decision)} label={label(validation.decision)} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              PO {link.purchaseOrder.purchaseOrderNumber} · {link.invoice.vendorLegalName}
            </p>
          </div>
        </div>
        {onOpen ? (
          <Button variant="ghost" size="sm" onClick={onOpen} aria-label={`Open evidence for ${link.invoice.invoiceNumber}`}>
            Open
          </Button>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Checks passed</dt>
          <dd className="mt-1 font-semibold text-foreground">{passed} of {validation.rules.length}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Attention items</dt>
          <dd className="mt-1 font-semibold text-foreground">{attention}</dd>
        </div>
      </dl>
    </section>
  );
}
