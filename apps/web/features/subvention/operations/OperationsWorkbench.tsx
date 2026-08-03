"use client";

import { Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { SemanticStatus } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEMO_NOW } from "@/features/subvention/data/seed";
import { useSubvention } from "@/features/subvention/store/SubventionProvider";
import {
  buildOperationsReadModel,
  filterOperationsRows,
  OPERATIONS_OUTCOMES,
  type OperationsOutcome,
} from "./operationsReadModel";
import { TransactionEvidenceDrawer } from "./TransactionEvidenceDrawer";

function statusTone(outcome: OperationsOutcome): SemanticStatus {
  switch (outcome) {
    case "Ready for Claim":
    case "Approved":
    case "Collected":
      return "APPROVED";
    case "Blocked":
    case "Rejected":
      return "CRITICAL";
    case "Needs Review":
    case "Submitted":
    case "Invoiced":
      return "ATTENTION";
    case "Processing":
    case "In Claim Batch":
      return "INFO";
  }
}

export interface OperationsWorkbenchProps {
  compact?: boolean;
}

const outcomePriority: Record<OperationsOutcome, number> = {
  Blocked: 0,
  "Needs Review": 1,
  "Ready for Claim": 2,
  Processing: 3,
  "In Claim Batch": 4,
  Submitted: 5,
  Rejected: 6,
  Approved: 7,
  Invoiced: 8,
  Collected: 9,
};

export function OperationsWorkbench({ compact = false }: OperationsWorkbenchProps) {
  const { activeActor, snapshot } = useSubvention();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [outcome, setOutcome] = useState<OperationsOutcome | undefined>();
  const [selectedId, setSelectedId] = useState<string>();
  const model = useMemo(
    () => buildOperationsReadModel(snapshot, {
      actor: activeActor,
      evaluatedAt: DEMO_NOW,
      lifecycleByTransaction: Object.fromEntries(
        snapshot.claimBatches.flatMap((batch) =>
          batch.lines.map((line) => [line.transactionId, batch.status]),
        ),
      ),
    }),
    [activeActor, snapshot],
  );
  const rows = useMemo(
    () => {
      const filtered = filterOperationsRows(model.rows, deferredQuery, outcome);
      if (!compact) return filtered;
      return [...filtered]
        .sort(
          (left, right) =>
            outcomePriority[left.systemResult] - outcomePriority[right.systemResult],
        )
        .slice(0, 6);
    },
    [compact, deferredQuery, model.rows, outcome],
  );
  const selected = model.rows.find((row) => row.transactionId === selectedId);

  return (
    <div className="operations-workbench">
      {!compact ? <header className="page-heading">
        <div>
          <span className="eyebrow">Operations workbench</span>
          <h1>Review Transactions</h1>
          <p>
            Automatic checks are complete. Review exceptions and move clear transactions to claim preparation.
          </p>
        </div>
        <div className="operations-result-summary" aria-label="Transaction position">
          <span><strong>{model.counts["Ready for Claim"]}</strong> ready for claim</span>
          <span><strong>{model.counts["Needs Review"]}</strong> need review</span>
          <span><strong>{model.counts.Blocked}</strong> blocked</span>
        </div>
      </header> : null}

      <section className="operations-queue" aria-labelledby="operations-queue-title">
        <div className="workspace-heading operations-queue-heading">
          <div>
            <span className="eyebrow">{compact ? "Priority queue" : "Daily queue"}</span>
            <h2 id="operations-queue-title">
              {compact ? "Items requiring attention" : "Transaction work queue"}
            </h2>
          </div>
          <span>
            {compact
              ? `${rows.length} of ${model.rows.length} transactions`
              : `${rows.length} transactions`}
          </span>
        </div>

        {!compact ? <div className="operations-toolbar">
          <label className="operations-search">
            <Search aria-hidden />
            <span className="sr-only">Search transactions</span>
            <input
              type="search"
              placeholder="Search invoice, PO, IMEI, employer or vendor"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filter by system result</span>
            <select
              value={outcome ?? ""}
              onChange={(event) =>
                setOutcome((event.target.value || undefined) as OperationsOutcome | undefined)
              }
            >
              <option value="">All system results</option>
              {OPERATIONS_OUTCOMES.map((item) => (
                <option value={item} key={item}>{item} ({model.counts[item]})</option>
              ))}
            </select>
          </label>
        </div> : null}

        <div className="operations-table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>PO and Invoice</TableHead>
                <TableHead>System Result</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.transactionId}>
                  <TableCell>
                    <div className="operations-primary-cell">
                      <strong>{row.transactionReference}</strong>
                      <span>{row.product} · {row.deviceIdentifier}</span>
                    </div>
                  </TableCell>
                  <TableCell>{row.employer}</TableCell>
                  <TableCell>
                    <div className="operations-primary-cell">
                      <strong>{row.purchaseOrderNumber}</strong>
                      <span>{row.invoiceNumber} · {row.vendor}</span>
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={statusTone(row.systemResult)} label={row.systemResult} /></TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setSelectedId(row.transactionId)}>
                      {row.actionLabel}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {rows.length === 0 ? (
          <div className="operations-empty-state">
            <h3>{compact ? "No transactions require attention" : "No transactions match this view"}</h3>
            <p>
              {compact
                ? "All available transactions have cleared their current operational checks."
                : "Clear the search or system-result filter to return to the complete work queue."}
            </p>
            {!compact ? (
              <Button variant="outline" onClick={() => { setQuery(""); setOutcome(undefined); }}>
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      <TransactionEvidenceDrawer row={selected} onClose={() => setSelectedId(undefined)} />
    </div>
  );
}
