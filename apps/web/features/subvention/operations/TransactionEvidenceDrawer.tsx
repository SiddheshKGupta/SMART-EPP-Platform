"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { Money } from "@/components/shared/Money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { SemanticStatus } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import type { OperationsQueueRow } from "./operationsReadModel";

function outcomeTone(outcome: OperationsQueueRow["systemResult"]): SemanticStatus {
  if (["Ready for Claim", "Approved", "Collected"].includes(outcome)) return "APPROVED";
  if (["Blocked", "Rejected"].includes(outcome)) return "CRITICAL";
  if (["Needs Review", "Submitted", "Invoiced"].includes(outcome)) return "ATTENTION";
  return "INFO";
}

function EvidenceState({ state }: { state: "MATCHED" | "MISSING" | "REVIEW" }) {
  return state === "MATCHED" ? (
    <span className="operations-evidence-state is-matched">
      <CheckCircle2 aria-hidden /> Matched
    </span>
  ) : (
    <span className="operations-evidence-state is-attention">
      <CircleAlert aria-hidden /> {state === "MISSING" ? "Missing" : "Review"}
    </span>
  );
}

export function TransactionEvidenceDrawer({
  row,
  onClose,
}: {
  row?: OperationsQueueRow;
  onClose(): void;
}) {
  if (!row) return null;

  const references = [
    row.evidence.purchaseOrder,
    row.evidence.vendorInvoice,
    row.evidence.movementEvidence,
    {
      label: "Device / IMEI",
      reference: row.evidence.deviceIdentifier,
      state: row.evidence.deviceIdentifier ? ("MATCHED" as const) : ("MISSING" as const),
    },
    row.evidence.programme,
    row.evidence.scheme,
    row.evidence.settlementRoute,
  ];

  return (
    <aside
      className="operations-evidence-drawer"
      aria-labelledby="operations-evidence-title"
      role="dialog"
      aria-modal="false"
    >
      <header className="operations-evidence-header">
        <div>
          <span className="eyebrow">Transaction evidence</span>
          <h2 id="operations-evidence-title">{row.transactionReference}</h2>
          <StatusBadge status={outcomeTone(row.systemResult)} label={row.systemResult} />
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close evidence">
          <X aria-hidden />
        </Button>
      </header>

      <div className="operations-evidence-list">
        {references.map((item) => (
          <div className="operations-evidence-row" key={item.label}>
            <div>
              <span>{item.label}</span>
              <strong>{item.reference}</strong>
            </div>
            <EvidenceState state={item.state} />
          </div>
        ))}
      </div>

      <dl className="operations-evidence-summary">
        <div>
          <dt>Expected subvention</dt>
          <dd><Money paise={row.evidence.expectedAmountPaise} /></dd>
        </div>
        <div>
          <dt>Claim deadline</dt>
          <dd>{row.evidence.filingDeadline || "Not resolved"}</dd>
        </div>
      </dl>

      {row.recoveryAction ? (
        <section className="operations-recovery-note" aria-labelledby="recovery-title">
          <h3 id="recovery-title">Required resolution</h3>
          <p>{row.recoveryAction}</p>
        </section>
      ) : null}

      <details className="operations-technical-details">
        <summary>View technical details</summary>
        <dl>
          <div><dt>Decision</dt><dd>{row.technicalDetails.decisionId}</dd></div>
          <div><dt>Version</dt><dd>{row.technicalDetails.decisionVersion}</dd></div>
          <div><dt>Evaluated</dt><dd>{row.technicalDetails.evaluatedAt}</dd></div>
        </dl>
        <ul>
          {row.technicalDetails.ruleResults.map((rule) => (
            <li key={rule.code}>
              <strong>{rule.label}</strong>
              <span>{rule.reason}</span>
              <StatusBadge
                status={
                  rule.outcome === "PASS"
                    ? "APPROVED"
                    : rule.outcome === "FAIL"
                      ? "CRITICAL"
                      : "ATTENTION"
                }
                label={rule.outcome}
              />
            </li>
          ))}
        </ul>
      </details>
    </aside>
  );
}
