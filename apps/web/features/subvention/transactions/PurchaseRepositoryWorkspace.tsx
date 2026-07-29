"use client";

import {
  ArrowUpDown,
  Columns3,
  Download,
  FileCheck2,
  FileWarning,
  Search,
  Upload,
} from "lucide-react";
import {
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  addDaysIso,
  evaluateEligibility,
  type EligibilityDecision,
  type ImportResult,
  type PurchaseTransaction,
  type PurchaseTransactionInput,
} from "@smart-epp/domain";
import { AdaptiveSplitWorkspace } from "@/components/shared/AdaptiveSplitWorkspace";
import { Money } from "@/components/shared/Money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { buildTransactionCsv } from "./transactionCsv";

type SortKey =
  | "leaseId"
  | "deviceIdentifier"
  | "invoiceDate"
  | "invoiceValuePaise"
  | "employerId";

type ColumnKey =
  | "leaseId"
  | "deviceIdentifier"
  | "employer"
  | "employee"
  | "legalEntity"
  | "product"
  | "productCode"
  | "invoice"
  | "invoiceDate"
  | "invoiceValue"
  | "baseValue"
  | "programme"
  | "counterparty"
  | "leaseStatus"
  | "eligibilityStatus"
  | "filingDeadline"
  | "expectedAmount";

const columns: Array<{ key: ColumnKey; label: string }> = [
  { key: "leaseId", label: "Lease ID" },
  { key: "deviceIdentifier", label: "IMEI / serial" },
  { key: "employer", label: "Employer" },
  { key: "employee", label: "Employee" },
  { key: "legalEntity", label: "Connect legal entity" },
  { key: "product", label: "Product" },
  { key: "productCode", label: "Product code" },
  { key: "invoice", label: "Invoice" },
  { key: "invoiceDate", label: "Invoice date" },
  { key: "invoiceValue", label: "Invoice value" },
  { key: "baseValue", label: "Base value" },
  { key: "programme", label: "Programme" },
  { key: "counterparty", label: "Distributor / reseller" },
  { key: "leaseStatus", label: "Lease status" },
  { key: "eligibilityStatus", label: "Eligibility status" },
  { key: "filingDeadline", label: "Filing deadline" },
  { key: "expectedAmount", label: "Expected amount" },
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

function legalEntityShortName(id: string): string {
  return id === "connect-residuary"
    ? "Residuary"
    : id === "connect-equipment-leasing"
      ? "Equipment Leasing"
      : id;
}

function sourceLabel(
  transaction: PurchaseTransaction,
  key: string,
  fallback: string,
): string {
  return transaction.sourceEvidence.sourceLabels[key] ?? fallback;
}

function transactionInput(
  transaction: PurchaseTransaction,
): PurchaseTransactionInput {
  const input: Partial<PurchaseTransaction> = structuredClone(transaction);
  delete input.id;
  delete input.importedAt;
  return input as PurchaseTransactionInput;
}

function syntheticImportRows(
  base: PurchaseTransaction,
): PurchaseTransactionInput[] {
  const input = transactionInput(base);
  const row = (
    sequence: number,
    overrides: Partial<PurchaseTransactionInput> = {},
  ): PurchaseTransactionInput => ({
    ...input,
    leaseId: `SYN-LES-${9000 + sequence}`,
    lotId: `SYN-LOT-${9000 + sequence}`,
    employeeId: `synthetic-employee-${sequence}`,
    deviceIdentifier:
      sequence === 2
        ? "SN-SYNTHETIC-9002"
        : `35888888888${String(sequence).padStart(4, "0")}`,
    invoiceNumber: `SYN-INV-${9000 + sequence}`,
    purchaseOrderNumber: `SYN-PO-${9000 + sequence}`,
    sourceSystem: "CONTROLLED_UPLOAD",
    sourceEvidence: {
      ...input.sourceEvidence,
      sourceFileName: "synthetic-transaction-import.xlsx",
      sourceSheetName: "Purchase evidence",
      sourceRowNumber: sequence + 5,
      sourceChecksum: `sha256:synthetic-import-${sequence}`,
      rowKind: "TRANSACTION",
      sourceLabels: {
        ...input.sourceEvidence.sourceLabels,
        externalOutcome: sequence === 2 ? "Deferred" : "Approved",
      },
      counterpartyAliases: {
        reseller: "Radius Systems Private Limited",
        distributor: sequence % 2 ? "Ingram" : "Redington",
      },
    },
    distributorId:
      sequence % 2 ? "distributor-ingram" : "distributor-redington",
    ...overrides,
  });

  return [
    row(1),
    row(2),
    row(3, {
      sourceEvidence: {
        ...row(3).sourceEvidence,
        rowKind: "FORMULA",
      },
    }),
    row(4, { productId: "unresolved-synthetic-product" }),
    row(5, { connectLegalEntityId: "unresolved-connect-entity" }),
    row(6, {
      sourceEvidence: {
        ...row(6).sourceEvidence,
        counterpartyAliases: {
          ...row(6).sourceEvidence.counterpartyAliases,
          reseller: "Ambiguous synthetic reseller",
        },
      },
    }),
    row(7, { deviceIdentifier: "" }),
  ];
}

function previewDecision(
  transaction: PurchaseTransaction,
  store: ReturnType<typeof useSubvention>,
): EligibilityDecision {
  const persisted = store.snapshot.eligibilityDecisions
    .filter((decision) => decision.transactionId === transaction.id)
    .sort((left, right) => right.version - left.version)[0];
  if (persisted) return persisted;
  return evaluateEligibility({
    transaction,
    schemes: store.snapshot.schemes,
    mappings: store.snapshot.programmeMappings,
    oemDefaults: store.snapshot.oems.find(
      (oem) => oem.id === transaction.oemId,
    )?.defaults,
    duplicateDeviceIdentifiers: new Set(
      store.snapshot.duplicateDeviceIdentifiers,
    ),
    duplicateLeaseIds: new Set(store.snapshot.duplicateLeaseIds),
    existingClaimedDeviceIdentifiers: new Set(
      store.snapshot.existingClaimedDeviceIdentifiers,
    ),
    existingClaimedLeaseIds: new Set(
      store.snapshot.existingClaimedLeaseIds,
    ),
    evaluationDate: DEMO_NOW.slice(0, 10),
    evaluatedAt: DEMO_NOW,
    actor: store.activeActor,
    decisionId: `preview-${transaction.id}`,
    version: 1,
  });
}

function SortButton({
  label,
  sortKey,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  onSort(key: SortKey): void;
}) {
  return (
    <button
      className="table-sort"
      type="button"
      onClick={() => onSort(sortKey)}
    >
      {label}
      <ArrowUpDown aria-hidden />
    </button>
  );
}

function EvidenceSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="evidence-section">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {title}
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open ? <div>{children}</div> : null}
    </section>
  );
}

export function PurchaseRepositoryWorkspace() {
  const store = useSubvention();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [oem, setOem] = useState("ALL");
  const [employer, setEmployer] = useState("ALL");
  const [deadline, setDeadline] = useState("ALL");
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({ key: "invoiceDate", direction: "desc" });
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    () => new Set(columns.map((column) => column.key)),
  );
  const [selectedId, setSelectedId] = useState<string>();
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult>();
  const [importing, setImporting] = useState(false);

  const decisions = useMemo(
    () =>
      new Map(
        store.snapshot.transactions.map((transaction) => [
          transaction.id,
          previewDecision(transaction, store),
        ]),
      ),
    [store],
  );
  const employers = useMemo(
    () => [...new Set(store.snapshot.transactions.map((item) => item.employerId))],
    [store.snapshot.transactions],
  );
  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const deadlineDate =
      deadline === "7"
        ? addDaysIso(DEMO_NOW.slice(0, 10), 7)
        : deadline === "15"
          ? addDaysIso(DEMO_NOW.slice(0, 10), 15)
          : undefined;
    return [...store.snapshot.transactions]
      .filter((transaction) => {
        const decision = decisions.get(transaction.id)!;
        const searchable = [
          transaction.leaseId,
          transaction.deviceIdentifier,
          transaction.invoiceNumber,
          transaction.employerId,
          sourceLabel(transaction, "employer", ""),
        ]
          .join(" ")
          .toLowerCase();
        return (
          (!normalizedSearch || searchable.includes(normalizedSearch)) &&
          (status === "ALL" ||
            transaction.leaseStatus === status ||
            decision.status === status) &&
          (oem === "ALL" || transaction.oemId === oem) &&
          (employer === "ALL" || transaction.employerId === employer) &&
          (deadline === "ALL" ||
            (deadline === "EXPIRED"
              ? Boolean(
                  decision.filingDeadline &&
                    decision.filingDeadline < DEMO_NOW.slice(0, 10),
                )
              : Boolean(
                  deadlineDate &&
                    decision.filingDeadline &&
                    decision.filingDeadline >= DEMO_NOW.slice(0, 10) &&
                    decision.filingDeadline <= deadlineDate,
                )))
        );
      })
      .sort((left, right) => {
        const leftValue = left[sort.key];
        const rightValue = right[sort.key];
        const comparison =
          typeof leftValue === "number" && typeof rightValue === "number"
            ? leftValue - rightValue
            : String(leftValue).localeCompare(String(rightValue));
        return sort.direction === "asc" ? comparison : -comparison;
      });
  }, [deadline, decisions, employer, oem, search, sort, status, store.snapshot.transactions]);

  const selected = store.snapshot.transactions.find(
    (transaction) => transaction.id === selectedId,
  );
  const selectedDecision = selected ? decisions.get(selected.id) : undefined;

  const onSort = (key: SortKey) =>
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));

  const exportCsv = () => {
    const csv = buildTransactionCsv(
      filtered.map((transaction) => ({
        transaction,
        decision: decisions.get(transaction.id),
      })),
    );
    const href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = href;
    link.download = "subvention-transactions.csv";
    link.click();
    URL.revokeObjectURL(href);
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("ALL");
    setOem("ALL");
    setEmployer("ALL");
    setDeadline("ALL");
  };

  const runSyntheticImport = async () => {
    const base = store.snapshot.transactions[0];
    if (!base) return;
    setImportOpen(true);
    setImporting(true);
    const result = await store.importTransactions(syntheticImportRows(base));
    setImportResult(result);
    setImporting(false);
  };

  const list = (
    <div className="repository-panel">
      <div className="repository-toolbar">
        <div className="repository-search">
          <Search aria-hidden />
          <Input
            placeholder="Search lease, IMEI/serial, invoice, employer"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Status filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active leases</SelectItem>
            <SelectItem value="ELIGIBLE">Eligible</SelectItem>
            <SelectItem value="INELIGIBLE">Ineligible</SelectItem>
            <SelectItem value="EXCEPTION_REVIEW">Exception review</SelectItem>
          </SelectContent>
        </Select>
        <Select value={oem} onValueChange={setOem}>
          <SelectTrigger aria-label="OEM filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All OEMs</SelectItem>
            {store.snapshot.oems.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={employer} onValueChange={setEmployer}>
          <SelectTrigger aria-label="Employer filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All employers</SelectItem>
            {employers.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={deadline} onValueChange={setDeadline}>
          <SelectTrigger aria-label="Deadline filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All deadlines</SelectItem>
            <SelectItem value="15">Due in 15 days</SelectItem>
            <SelectItem value="7">Due in 7 days</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Columns3 aria-hidden />
              Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="column-picker">
            <strong>Visible columns</strong>
            {columns.map((column) => (
              <label key={column.key}>
                <input
                  type="checkbox"
                  checked={visibleColumns.has(column.key)}
                  onChange={(event) =>
                    setVisibleColumns((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(column.key);
                      else next.delete(column.key);
                      return next;
                    })
                  }
                />
                {column.label}
              </label>
            ))}
          </PopoverContent>
        </Popover>
        <Button variant="outline" onClick={exportCsv}>
          <Download aria-hidden />
          Export filtered CSV
        </Button>
      </div>
      <div className="repository-result-strip">
        <span>
          <strong>{filtered.length}</strong> of{" "}
          {store.snapshot.transactions.length} transactions
        </span>
        <span>
          Source rows are checksum-addressed and preserved read-only.
        </span>
      </div>
      <div className="repository-table-scroll">
        <Table className="repository-table">
          <TableHeader>
            <TableRow>
              {visibleColumns.has("leaseId") ? (
                <TableHead className="sticky-transaction-lease">
                  <SortButton
                    label="Lease ID"
                    sortKey="leaseId"
                    onSort={onSort}
                  />
                </TableHead>
              ) : null}
              {visibleColumns.has("deviceIdentifier") ? (
                <TableHead className="sticky-transaction-device">
                  <SortButton
                    label="IMEI / serial"
                    sortKey="deviceIdentifier"
                    onSort={onSort}
                  />
                </TableHead>
              ) : null}
              {columns.slice(2).map((column) =>
                visibleColumns.has(column.key) ? (
                  <TableHead key={column.key}>
                    {column.key === "employer" ? (
                      <SortButton
                        label={column.label}
                        sortKey="employerId"
                        onSort={onSort}
                      />
                    ) : column.key === "invoiceDate" ? (
                      <SortButton
                        label={column.label}
                        sortKey="invoiceDate"
                        onSort={onSort}
                      />
                    ) : column.key === "invoiceValue" ? (
                      <SortButton
                        label="Invoice amount"
                        sortKey="invoiceValuePaise"
                        onSort={onSort}
                      />
                    ) : (
                      column.label
                    )}
                  </TableHead>
                ) : null,
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  className="repository-empty-state"
                  colSpan={Math.max(visibleColumns.size, 1)}
                >
                  <strong>No purchases match these filters</strong>
                  <span>
                    Clear the current search and filter controls to restore
                    the repository view.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetFilters}
                  >
                    Reset filters
                  </Button>
                </TableCell>
              </TableRow>
            ) : null}
            {filtered.map((transaction) => {
              const decision = decisions.get(transaction.id)!;
              const values: Record<Exclude<ColumnKey, "leaseId" | "deviceIdentifier">, ReactNode> = {
                employer: sourceLabel(
                  transaction,
                  "employer",
                  transaction.employerId,
                ),
                employee: transaction.employeeId,
                legalEntity: legalEntityShortName(
                  transaction.connectLegalEntityId,
                ),
                product: sourceLabel(
                  transaction,
                  "product",
                  transaction.productId,
                ),
                productCode: transaction.productCode,
                invoice: transaction.invoiceNumber,
                invoiceDate: transaction.invoiceDate,
                invoiceValue: (
                  <Money paise={transaction.invoiceValuePaise} />
                ),
                baseValue: <Money paise={transaction.baseValuePaise} />,
                programme: transaction.programmeId,
                counterparty: [
                  transaction.sourceEvidence.counterpartyAliases.distributor,
                  transaction.sourceEvidence.counterpartyAliases.reseller,
                ]
                  .filter(Boolean)
                  .join(" / "),
                leaseStatus: (
                  <span>{sentenceCase(transaction.leaseStatus)}</span>
                ),
                eligibilityStatus: (
                  <StatusBadge status={decision.status} />
                ),
                filingDeadline: decision.filingDeadline || "Not available",
                expectedAmount: (
                  <Money paise={decision.expectedAmountPaise} />
                ),
              };
              const onKeyDown = (
                event: KeyboardEvent<HTMLTableRowElement>,
              ) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedId(transaction.id);
                }
              };
              return (
                <TableRow
                  key={transaction.id}
                  tabIndex={0}
                  aria-selected={selectedId === transaction.id}
                  data-state={
                    selectedId === transaction.id ? "selected" : undefined
                  }
                  onClick={(event) => {
                    event.currentTarget.focus();
                    setSelectedId(transaction.id);
                  }}
                  onKeyDown={onKeyDown}
                >
                  {visibleColumns.has("leaseId") ? (
                    <TableCell className="sticky-transaction-lease mono-cell">
                      {transaction.leaseId}
                    </TableCell>
                  ) : null}
                  {visibleColumns.has("deviceIdentifier") ? (
                    <TableCell className="sticky-transaction-device mono-cell">
                      {transaction.deviceIdentifier}
                    </TableCell>
                  ) : null}
                  {columns.slice(2).map((column) =>
                    visibleColumns.has(column.key) ? (
                      <TableCell key={column.key}>
                        {values[
                          column.key as Exclude<
                            ColumnKey,
                            "leaseId" | "deviceIdentifier"
                          >
                        ]}
                      </TableCell>
                    ) : null,
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const detail =
    selected && selectedDecision ? (
      <div className="transaction-evidence">
        <header className="inspector-header">
          <span className="eyebrow">Read-only source snapshot</span>
          <h2 data-detail-heading tabIndex={-1}>
            Transaction evidence · {selected.leaseId}
          </h2>
          <p>
            {selected.deviceIdentifier} · {selected.productCode}
          </p>
        </header>
        <EvidenceSection title="Commercial evidence">
          <dl className="evidence-grid">
            <div>
              <dt>Invoice value</dt>
              <dd>
                <Money paise={selected.invoiceValuePaise} />
              </dd>
            </div>
            <div>
              <dt>Base value</dt>
              <dd>
                <Money paise={selected.baseValuePaise} />
              </dd>
            </div>
            <div>
              <dt>Calculation basis</dt>
              <dd>{sentenceCase(selected.sourceEvidence.calculationBasis)}</dd>
            </div>
            <div>
              <dt>Source rate</dt>
              <dd>{selected.sourceEvidence.rateBps} bps</dd>
            </div>
            <div>
              <dt>Source expected</dt>
              <dd>
                <Money
                  paise={
                    selected.sourceEvidence.expectedSubventionPaise
                  }
                />
              </dd>
            </div>
            <div>
              <dt>System recalculated</dt>
              <dd>
                <Money paise={selectedDecision.expectedAmountPaise} />
              </dd>
            </div>
          </dl>
        </EvidenceSection>
        <EvidenceSection title="Source provenance">
          <dl className="evidence-grid">
            <div>
              <dt>Source file</dt>
              <dd>{selected.sourceEvidence.sourceFileName}</dd>
            </div>
            <div>
              <dt>Sheet / row</dt>
              <dd>
                {selected.sourceEvidence.sourceSheetName} /{" "}
                {selected.sourceEvidence.sourceRowNumber}
              </dd>
            </div>
            <div className="evidence-wide">
              <dt>Checksum</dt>
              <dd className="mono-cell">
                {selected.sourceEvidence.sourceChecksum}
              </dd>
            </div>
            <div>
              <dt>Product code</dt>
              <dd>{selected.productCode}</dd>
            </div>
            <div>
              <dt>Connect legal entity</dt>
              <dd>{legalEntityName(selected.connectLegalEntityId)}</dd>
            </div>
            <div className="evidence-wide">
              <dt>Preserved aliases</dt>
              <dd>
                {Object.values(
                  selected.sourceEvidence.counterpartyAliases,
                )
                  .filter(Boolean)
                  .join(" · ")}
              </dd>
            </div>
          </dl>
        </EvidenceSection>
      </div>
    ) : null;

  return (
    <div className="purchase-repository-workspace">
      <header className="page-heading repository-page-heading">
        <div>
          <span className="eyebrow">Subvention source of record</span>
          <h1>Purchase Repository</h1>
          <p>
            Trace every purchase from immutable source evidence through
            eligibility, deadline and expected subvention.
          </p>
        </div>
        <Button onClick={() => void runSyntheticImport()}>
          <Upload aria-hidden />
          Import transactions
        </Button>
      </header>
      <AdaptiveSplitWorkspace
        listLabel="Purchase transactions"
        selectedLabel={
          selected ? `Transaction evidence ${selected.leaseId}` : undefined
        }
        list={list}
        detail={detail}
        isOpen={Boolean(selected)}
        onClose={() => setSelectedId(undefined)}
      />
      <Sheet open={importOpen} onOpenChange={setImportOpen}>
        <SheetContent className="import-sheet">
          <SheetHeader>
            <SheetTitle>Atomic import summary</SheetTitle>
            <SheetDescription>
              Synthetic evidence only. Every row is accepted or quarantined
              as one unit.
            </SheetDescription>
          </SheetHeader>
          {importing ? (
            <div className="import-progress" role="status">
              <Upload aria-hidden />
              Validating source rows…
            </div>
          ) : importResult ? (
            <div className="import-summary">
              <div className="import-totals">
                <span>
                  <FileCheck2 aria-hidden />
                  <strong>{importResult.accepted.length}</strong> accepted
                </span>
                <span>
                  <FileWarning aria-hidden />
                  <strong>{importResult.quarantined.length}</strong>{" "}
                  quarantined
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Import ID</TableHead>
                    <TableHead>Audit row ID</TableHead>
                    <TableHead>Imported by</TableHead>
                    <TableHead>Imported at</TableHead>
                    <TableHead>Checksum</TableHead>
                    <TableHead>Source row</TableHead>
                    <TableHead>Issue code</TableHead>
                    <TableHead>Recovery action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResult.quarantined.flatMap((row) =>
                    row.issues.map((foundIssue) => (
                      <TableRow
                        key={`${row.rowNumber}-${foundIssue.code}-${foundIssue.field}`}
                      >
                        <TableCell className="mono-cell">
                          {row.importId}
                        </TableCell>
                        <TableCell className="mono-cell">{row.id}</TableCell>
                        <TableCell>{row.importedBy}</TableCell>
                        <TableCell>{row.importedAt}</TableCell>
                        <TableCell className="mono-cell">
                          {row.sourceChecksum}
                        </TableCell>
                        <TableCell>
                          {row.sourceSheetName} / {row.sourceRowNumber}
                        </TableCell>
                        <TableCell className="mono-cell">
                          {foundIssue.code}
                        </TableCell>
                        <TableCell>{foundIssue.recoveryAction}</TableCell>
                      </TableRow>
                    )),
                  )}
                </TableBody>
              </Table>
              <div className="import-sheet-actions">
                <Button variant="outline" onClick={exportCsv}>
                  <Download aria-hidden />
                  Export filtered CSV
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
