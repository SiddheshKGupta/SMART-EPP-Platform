"use client";

import {
  CalendarClock,
  CheckSquare2,
  ClockAlert,
  History,
  Scale,
  ShieldCheck,
} from "lucide-react";
import {
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  evaluateEligibility,
  type Actor,
  type EligibilityDecision,
  type EligibilityStatus,
  type PurchaseTransaction,
  type SubventionSnapshot,
} from "@smart-epp/domain";
import { AdaptiveSplitWorkspace } from "@/components/shared/AdaptiveSplitWorkspace";
import { AuditTimeline } from "@/components/shared/AuditTimeline";
import { Money } from "@/components/shared/Money";
import { RuleTrace } from "@/components/shared/RuleTrace";
import { StatusBadge } from "@/components/shared/StatusBadge";
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

type QueueFilter =
  | "AWAITING"
  | "ELIGIBLE"
  | "INELIGIBLE"
  | "EXCEPTION_REVIEW"
  | "BLOCKED"
  | "DUE_15"
  | "DUE_7"
  | "EXPIRED";

interface QueueRow {
  transaction: PurchaseTransaction;
  decision: EligibilityDecision;
  persisted: boolean;
  remainingDays?: number;
  exceptionLabel: string;
}

interface BulkResult {
  count: number;
  outcomes: Partial<
    Record<EligibilityStatus, { count: number; valuePaise: number }>
  >;
}

const filterLabels: Array<{ value: QueueFilter; label: string }> = [
  { value: "AWAITING", label: "Awaiting evaluation" },
  { value: "ELIGIBLE", label: "Eligible decisions" },
  { value: "INELIGIBLE", label: "Ineligible decisions" },
  { value: "EXCEPTION_REVIEW", label: "Exception review" },
  { value: "BLOCKED", label: "Blocked source" },
  { value: "DUE_15", label: "Due in 15 days" },
  { value: "DUE_7", label: "Due in 7 days" },
  { value: "EXPIRED", label: "Expired" },
];

function sentenceCase(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (character) => character.toUpperCase());
}

function legalEntityName(id: string): string {
  return id === "connect-residuary"
    ? "Connect Residuary"
    : id === "connect-equipment-leasing"
      ? "Connect Equipment Leasing"
      : id;
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

function latestPersisted(
  decisions: EligibilityDecision[],
  transactionId: string,
): EligibilityDecision | undefined {
  return decisions
    .filter((decision) => decision.transactionId === transactionId)
    .sort((left, right) => right.version - left.version)[0];
}

function evaluatePreview(
  transaction: PurchaseTransaction,
  snapshot: SubventionSnapshot,
  actor: Actor,
): EligibilityDecision {
  return evaluateEligibility({
    transaction,
    schemes: snapshot.schemes,
    mappings: snapshot.programmeMappings,
    oemDefaults: snapshot.oems.find(
      (oem) => oem.id === transaction.oemId,
    )?.defaults,
    duplicateDeviceIdentifiers: new Set(
      snapshot.duplicateDeviceIdentifiers,
    ),
    duplicateLeaseIds: new Set(snapshot.duplicateLeaseIds),
    existingClaimedDeviceIdentifiers: new Set(
      snapshot.existingClaimedDeviceIdentifiers,
    ),
    existingClaimedLeaseIds: new Set(
      snapshot.existingClaimedLeaseIds,
    ),
    evaluationDate: DEMO_NOW.slice(0, 10),
    evaluatedAt: DEMO_NOW,
    actor,
    decisionId: `queue-preview-${transaction.id}`,
    version: 1,
  });
}

function queueRows(
  snapshot: SubventionSnapshot,
  actor: Actor,
): QueueRow[] {
  return snapshot.transactions.map((transaction) => {
    const persisted = latestPersisted(
      snapshot.eligibilityDecisions,
      transaction.id,
    );
    const decision = persisted ?? evaluatePreview(transaction, snapshot, actor);
    const remainingDays = decision.filingDeadline
      ? daysBetween(DEMO_NOW.slice(0, 10), decision.filingDeadline)
      : undefined;
    const firstException = decision.ruleResults.find(
      (result) => result.outcome !== "PASS",
    );
    const exceptionLabel =
      firstException?.code === "FILING_TIMELINE_EXPIRED"
        ? transaction.leaseId === "LES-1021"
          ? "Filing timeline expired"
          : "Deadline expired"
        : firstException?.label ?? "No exception";
    return {
      transaction,
      decision,
      persisted: Boolean(persisted),
      remainingDays,
      exceptionLabel,
    };
  });
}

function matchesFilter(row: QueueRow, filter: QueueFilter): boolean {
  switch (filter) {
    case "AWAITING":
      return !row.persisted;
    case "DUE_15":
      return (
        row.remainingDays !== undefined &&
        row.remainingDays >= 0 &&
        row.remainingDays <= 15
      );
    case "DUE_7":
      return (
        row.remainingDays !== undefined &&
        row.remainingDays >= 0 &&
        row.remainingDays <= 7
      );
    case "EXPIRED":
      return row.remainingDays !== undefined && row.remainingDays < 0;
    case "BLOCKED":
      return row.transaction.leaseStatus !== "ACTIVE";
    default:
      return row.persisted && row.decision.status === filter;
  }
}

function filterFromQuery(
  initialStatus?: string,
  initialDeadline?: string,
): QueueFilter {
  if (
    initialStatus === "AWAITING" ||
    initialStatus === "ELIGIBLE" ||
    initialStatus === "INELIGIBLE" ||
    initialStatus === "EXCEPTION_REVIEW" ||
    initialStatus === "BLOCKED"
  ) {
    return initialStatus;
  }
  if (initialDeadline === "15d") return "DUE_15";
  if (initialDeadline === "7d") return "DUE_7";
  if (initialDeadline === "overdue") return "EXPIRED";
  return "AWAITING";
}

function eligibilityHref(
  filter: QueueFilter,
  transactionId?: string,
): string {
  const params = new URLSearchParams();
  if (
    filter === "AWAITING" ||
    filter === "ELIGIBLE" ||
    filter === "INELIGIBLE" ||
    filter === "EXCEPTION_REVIEW" ||
    filter === "BLOCKED"
  ) {
    params.set("status", filter);
  } else {
    params.set(
      "deadline",
      filter === "DUE_15"
        ? "15d"
        : filter === "DUE_7"
          ? "7d"
          : "overdue",
    );
  }
  if (transactionId) params.set("transaction", transactionId);
  return `/subvention/eligibility?${params.toString()}`;
}

function StatusSummary({ result }: { result: BulkResult }) {
  const labels: Record<EligibilityStatus, string> = {
    ELIGIBLE: "Eligible",
    INELIGIBLE: "Ineligible",
    EXCEPTION_REVIEW: "Exception review",
  };
  return (
    <div className="bulk-result" role="status">
      <strong>{result.count} evaluated</strong>
      {(
        ["ELIGIBLE", "INELIGIBLE", "EXCEPTION_REVIEW"] as const
      ).map((status) => {
        const outcome = result.outcomes[status];
        return outcome ? (
          <span key={status}>
            {labels[status]} {outcome.count} ·{" "}
            <Money paise={outcome.valuePaise} />
          </span>
        ) : null;
      })}
    </div>
  );
}

export function EligibilityWorkspace({
  initialStatus,
  initialDeadline,
  initialTransaction,
}: {
  initialStatus?: string;
  initialDeadline?: string;
  initialTransaction?: string;
}) {
  const store = useSubvention();
  const router = useRouter();
  const normalizedInitialFilter = filterFromQuery(
    initialStatus,
    initialDeadline,
  );
  const [filter, setFilter] = useState<QueueFilter>(
    normalizedInitialFilter,
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(
    store.snapshot.transactions.some(
      (transaction) => transaction.id === initialTransaction,
    )
      ? initialTransaction
      : undefined,
  );
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkResult, setBulkResult] = useState<BulkResult>();
  const rows = useMemo(
    () => queueRows(store.snapshot, store.activeActor),
    [store.activeActor, store.snapshot],
  );
  const filtered = rows.filter((row) => matchesFilter(row, filter));
  const selected = rows.find((row) => row.transaction.id === selectedId);
  const decisionHistory = selected
    ? store.snapshot.eligibilityDecisions
        .filter(
          (decision) =>
            decision.transactionId === selected.transaction.id,
        )
        .sort((left, right) => right.version - left.version)
    : [];
  const previousDecision =
    selected?.decision.previousDecisionId !== undefined
      ? store.snapshot.eligibilityDecisions.find(
          (decision) =>
            decision.id === selected.decision.previousDecisionId,
        )
      : decisionHistory[1];
  const selectedScheme = selected?.decision.ruleSnapshot
    ? store.snapshot.schemes.find(
        (scheme) =>
          scheme.id === selected.decision.ruleSnapshot?.schemeVersionId,
      )
    : undefined;
  const sourceExpected =
    selected?.transaction.sourceEvidence.expectedSubventionPaise ?? 0;
  const variancePaise = selected
    ? selected.decision.expectedAmountPaise - sourceExpected
    : 0;

  const evaluateSelected = async () => {
    if (!selected) return;
    await store.evaluateTransaction(selected.transaction.id);
  };

  const evaluateBulk = async () => {
    const selectedRows = rows.filter((row) =>
      checkedIds.has(row.transaction.id),
    );
    const decisions = await store.evaluateTransactions(
      selectedRows.map((row) => row.transaction.id),
    );
    if (!decisions) return;
    const outcomes: BulkResult["outcomes"] = {};
    decisions.forEach((decision) => {
      const outcome = outcomes[decision.status] ?? {
        count: 0,
        valuePaise: 0,
      };
      outcomes[decision.status] = {
        count: outcome.count + 1,
        valuePaise: outcome.valuePaise + decision.expectedAmountPaise,
      };
    });
    setBulkResult({ count: decisions.length, outcomes });
    setCheckedIds(new Set());
  };

  const changeFilter = (nextFilter: QueueFilter) => {
    setFilter(nextFilter);
    router.replace(eligibilityHref(nextFilter, selectedId));
  };

  const selectTransaction = (transactionId: string) => {
    setSelectedId(transactionId);
    router.replace(eligibilityHref(filter, transactionId));
  };

  const list = (
    <div className="eligibility-list-panel">
      <div className="queue-filter-bar" aria-label="Eligibility queue filters">
        {filterLabels.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={filter === item.value ? "default" : "outline"}
            aria-pressed={filter === item.value}
            onClick={() => changeFilter(item.value)}
          >
            {item.label}
            <span>
              {rows.filter((row) => matchesFilter(row, item.value)).length}
            </span>
          </Button>
        ))}
      </div>
      <div className="bulk-action-bar">
        <span>{checkedIds.size} selected</span>
        <Button
          size="sm"
          disabled={checkedIds.size === 0 || store.isRefreshing}
          onClick={() => void evaluateBulk()}
        >
          <CheckSquare2 aria-hidden />
          Evaluate {checkedIds.size} selected
        </Button>
        {bulkResult ? <StatusSummary result={bulkResult} /> : null}
        {store.actionError ? (
          <span className="bulk-error" role="alert">
            {store.actionError.message}
          </span>
        ) : null}
      </div>
      <div className="eligibility-table-scroll">
        <Table className="eligibility-table">
          <TableHeader>
            <TableRow>
              <TableHead className="selection-column">
                <span className="sr-only">Select</span>
              </TableHead>
              <TableHead className="sticky-eligibility-lease">
                Lease ID
              </TableHead>
              <TableHead>IMEI / serial</TableHead>
              <TableHead>Employer</TableHead>
              <TableHead>Expected amount</TableHead>
              <TableHead>Filing deadline</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Control note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => {
              const onKeyDown = (
                event: KeyboardEvent<HTMLTableRowElement>,
              ) => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  selectTransaction(row.transaction.id);
                }
              };
              return (
                <TableRow
                  key={row.transaction.id}
                  tabIndex={0}
                  aria-selected={selectedId === row.transaction.id}
                  data-state={
                    selectedId === row.transaction.id
                      ? "selected"
                      : undefined
                  }
                  onClick={(event) => {
                    event.currentTarget.focus();
                    selectTransaction(row.transaction.id);
                  }}
                  onKeyDown={onKeyDown}
                >
                  <TableCell
                    className="selection-column"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.transaction.leaseId}`}
                      checked={checkedIds.has(row.transaction.id)}
                      onKeyDown={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        setCheckedIds((current) => {
                          const next = new Set(current);
                          if (event.target.checked) {
                            next.add(row.transaction.id);
                          } else {
                            next.delete(row.transaction.id);
                          }
                          return next;
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="sticky-eligibility-lease mono-cell">
                    {row.transaction.leaseId}
                  </TableCell>
                  <TableCell className="mono-cell">
                    {row.transaction.deviceIdentifier}
                  </TableCell>
                  <TableCell>{row.transaction.employerId}</TableCell>
                  <TableCell>
                    <Money paise={row.decision.expectedAmountPaise} />
                  </TableCell>
                  <TableCell>
                    {row.decision.filingDeadline || "Not available"}
                  </TableCell>
                  <TableCell>
                    {row.remainingDays === undefined
                      ? "—"
                      : row.remainingDays < 0
                        ? `${Math.abs(row.remainingDays)}d overdue`
                        : `${row.remainingDays}d`}
                  </TableCell>
                  <TableCell>
                    {row.persisted ? (
                      <StatusBadge status={row.decision.status} />
                    ) : (
                      <StatusBadge
                        status="INFO"
                        label="Awaiting evaluation"
                      />
                    )}
                  </TableCell>
                  <TableCell>{row.exceptionLabel}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const detail = selected ? (
    <div className="eligibility-inspector">
      <header className="inspector-header">
        <span className="eyebrow">Decision evidence</span>
        <h2 data-detail-heading tabIndex={-1}>
          Eligibility review · {selected.transaction.leaseId}
        </h2>
        <div className="inspector-status-line">
          <StatusBadge
            status={selected.decision.status}
            label={sentenceCase(selected.decision.status)}
          />
          <span>
            Decision v{selected.decision.version} ·{" "}
            {selected.persisted
              ? "Recorded"
              : "Preview · not recorded"}
          </span>
        </div>
      </header>
      <div className="eligibility-action-strip">
        <span>
          <ShieldCheck aria-hidden />
          Each evaluation appends a versioned rule snapshot.
        </span>
        <Button
          disabled={store.isRefreshing}
          onClick={() => void evaluateSelected()}
        >
          Evaluate eligibility
        </Button>
      </div>
      {selected.remainingDays !== undefined &&
      selected.remainingDays < 0 ? (
        <div className="override-required" role="note">
          <ClockAlert aria-hidden />
          <div>
            <strong>Authorised override required</strong>
            <span>
              The filing timeline expired. Continue only through an audited
              exception approval.
            </span>
          </div>
        </div>
      ) : null}
      <section className="inspector-section">
        <h3>
          <Scale aria-hidden />
          Applied calculation
        </h3>
        <dl className="evidence-grid">
          <div>
            <dt>Source amount</dt>
            <dd>
              <Money paise={sourceExpected} />
            </dd>
          </div>
          <div>
            <dt>Basis</dt>
            <dd>
              {sentenceCase(
                selected.transaction.sourceEvidence.calculationBasis,
              )}
            </dd>
          </div>
          <div>
            <dt>Rate</dt>
            <dd>{selected.transaction.sourceEvidence.rateBps} bps</dd>
          </div>
          <div>
            <dt>System expected</dt>
            <dd>
              <Money paise={selected.decision.expectedAmountPaise} />
            </dd>
          </div>
          <div>
            <dt>Variance</dt>
            <dd>
              <Money paise={variancePaise} />
            </dd>
          </div>
          <div>
            <dt>Filing deadline</dt>
            <dd>{selected.decision.filingDeadline || "Not available"}</dd>
          </div>
        </dl>
      </section>
      <section className="inspector-section">
        <h3>
          <CalendarClock aria-hidden />
          Applied controls
        </h3>
        <dl className="evidence-grid">
          <div className="evidence-wide">
            <dt>Programme mapping version</dt>
            <dd>
              {selected.decision.ruleSnapshot
                ?.employerProgrammeMappingVersionId ?? "Not resolved"}
            </dd>
          </div>
          <div className="evidence-wide">
            <dt>Scheme version</dt>
            <dd>
              {selected.decision.ruleSnapshot?.schemeVersionId ??
                "Not resolved"}
            </dd>
          </div>
          <div>
            <dt>Connect legal entity</dt>
            <dd>
              {legalEntityName(
                selected.transaction.connectLegalEntityId,
              )}
            </dd>
          </div>
          <div>
            <dt>Settlement path</dt>
            <dd>
              {selectedScheme?.settlementCounterpartyType ??
                selected.decision.ruleSnapshot
                  ?.settlementCounterpartyType ??
                "Not resolved"}
            </dd>
          </div>
        </dl>
      </section>
      <section className="inspector-section">
        <h3>Ordered rule trace</h3>
        <RuleTrace results={selected.decision.ruleResults} />
      </section>
      <section className="inspector-section">
        <h3>
          <History aria-hidden />
          Decision comparison
        </h3>
        <Table className="comparison-table">
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Evaluated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                {previousDecision
                  ? `Previous · v${previousDecision.version}`
                  : "Previous · none"}
              </TableCell>
              <TableCell>
                {previousDecision
                  ? sentenceCase(previousDecision.status)
                  : "—"}
              </TableCell>
              <TableCell>
                {previousDecision ? (
                  <Money paise={previousDecision.expectedAmountPaise} />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>{previousDecision?.evaluatedAt ?? "—"}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Current · v{selected.decision.version}</TableCell>
              <TableCell>
                Current: {sentenceCase(selected.decision.status)}
              </TableCell>
              <TableCell>
                <Money paise={selected.decision.expectedAmountPaise} />
              </TableCell>
              <TableCell>{selected.decision.evaluatedAt}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>
      <section className="inspector-section">
        <h3>Audit timeline</h3>
        <AuditTimeline
          events={store.snapshot.auditEvents.filter(
            (event) =>
              (event.entityType === "PurchaseTransaction" &&
                event.entityId === selected.transaction.id) ||
              decisionHistory.some(
                (decision) => decision.id === event.entityId,
              ),
          )}
        />
      </section>
    </div>
  ) : null;

  return (
    <div className="eligibility-workspace">
      <header className="page-heading eligibility-page-heading">
        <div>
          <span className="eyebrow">Independent rule evaluation</span>
          <h1>Eligibility Review Queue</h1>
          <p>
            Resolve due transactions with ordered controls, calculation
            evidence, version history and audit trace.
          </p>
          {initialDeadline ? (
            <div
              className="eligibility-filter-context"
              aria-label="Active query filters"
            >
              <span>deadline</span>
              <strong>{initialDeadline}</strong>
            </div>
          ) : null}
        </div>
        <span className="evaluation-date">
          Evaluation date · {DEMO_NOW.slice(0, 10)}
        </span>
      </header>
      <AdaptiveSplitWorkspace
        listLabel="Eligibility queue"
        selectedLabel={
          selected
            ? `Eligibility review ${selected.transaction.leaseId}`
            : undefined
        }
        list={list}
        detail={detail}
        isOpen={Boolean(selected)}
        onClose={() => {
          setSelectedId(undefined);
          router.replace(eligibilityHref(filter));
        }}
      />
    </div>
  );
}
