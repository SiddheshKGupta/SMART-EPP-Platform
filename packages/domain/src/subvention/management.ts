export type ManagementQuarter = "ALL" | "Q1" | "Q2" | "Q3" | "Q4";

export interface ManagementPeriodFilter {
  financialYear: string;
  quarter: ManagementQuarter;
  month: "ALL" | string;
}

export type ClaimPhase =
  | "DRAFT"
  | "SUBMITTED_FOR_APPROVAL"
  | "APPROVED_AND_LOCKED"
  | "SUBMITTED_TO_COUNTERPARTY"
  | "RESPONDED"
  | "INVOICED"
  | "COLLECTED"
  | "ACCOUNTING_RECONCILED"
  | "CLOSED";

export interface ReceiptAllocation {
  receiptId: string;
  receiptDate: string;
  amountPaise: number;
  status: "POSTED" | "REVERSED";
}

export interface SubventionFinancialRecord {
  claimId: string;
  periodDate: string;
  phase: ClaimPhase;
  employerId: string;
  employerName: string;
  counterpartyId: string;
  counterpartyName: string;
  claimValuePaise: number;
  approvedValuePaise: number;
  receiptAllocations: ReceiptAllocation[];
  dueDate?: string;
  sourceKind: "PERSISTED" | "PREVIEW";
}

export type ManagementAmountBasis =
  | "POSTED_RECEIPT_ALLOCATION"
  | "OUTSTANDING_APPROVED_VALUE"
  | "EXPECTED_CLAIM_VALUE"
  | "APPROVED_CLAIM_VALUE";

export interface ManagementDrilldownRecord {
  claimId: string;
  eventDate: string;
  phase: ClaimPhase;
  counterpartyId: string;
  counterpartyName: string;
  employerId: string;
  employerName: string;
  claimValuePaise: number;
  approvedValuePaise: number;
  receivedPaise: number;
  outstandingPaise: number;
  dueDate?: string;
  amountPaise: number;
  amountBasis: ManagementAmountBasis;
  sourceReceiptIds: string[];
}

export interface ManagementMetric {
  key: "RECEIVED" | "PAYMENT_DUE" | "IN_PROGRESS" | "OVERDUE";
  label: string;
  definition: string;
  amountPaise: number;
  count: number;
  records: ManagementDrilldownRecord[];
}

export interface ManagementPhasePosition {
  phase: ClaimPhase;
  count: number;
  amountPaise: number;
  records: ManagementDrilldownRecord[];
}

export interface ManagementEmployerPosition {
  employerId: string;
  employerName: string;
  count: number;
  amountPaise: number;
  records: ManagementDrilldownRecord[];
}

export interface ManagementCounterpartyDue {
  counterpartyId: string;
  counterpartyName: string;
  count: number;
  amountPaise: number;
  earliestDueDate?: string;
  overdue: boolean;
  records: ManagementDrilldownRecord[];
}

export interface ManagementOverview {
  filter: ManagementPeriodFilter;
  availableFinancialYears: string[];
  received: ManagementMetric;
  paymentDue: ManagementMetric;
  inProgress: ManagementMetric;
  overdue: ManagementMetric;
  phasePosition: ManagementPhasePosition[];
  employerPosition: ManagementEmployerPosition[];
  counterpartyDues: ManagementCounterpartyDue[];
}

const IN_PROGRESS_PHASES = new Set<ClaimPhase>([
  "DRAFT",
  "SUBMITTED_FOR_APPROVAL",
  "SUBMITTED_TO_COUNTERPARTY",
  "RESPONDED",
]);

const PAYMENT_DUE_PHASES = new Set<ClaimPhase>([
  "APPROVED_AND_LOCKED",
  "INVOICED",
]);

function financialYearStart(financialYear: string): number | undefined {
  const match = /^(\d{4})-(\d{2})$/.exec(financialYear);
  if (!match) return undefined;
  const start = Number(match[1]);
  return Number(match[2]) === (start + 1) % 100 ? start : undefined;
}

export function financialYearForDate(date: string): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export function listFinancialYearMonths(financialYear: string): string[] {
  const start = financialYearStart(financialYear);
  if (start === undefined) return [];
  return [
    ...Array.from({ length: 9 }, (_, index) => `${start}-${String(index + 4).padStart(2, "0")}`),
    ...Array.from({ length: 3 }, (_, index) => `${start + 1}-${String(index + 1).padStart(2, "0")}`),
  ];
}

export function quarterForMonth(month: string): Exclude<ManagementQuarter, "ALL"> | undefined {
  const value = Number(month.slice(5, 7));
  if (value >= 4 && value <= 6) return "Q1";
  if (value >= 7 && value <= 9) return "Q2";
  if (value >= 10 && value <= 12) return "Q3";
  if (value >= 1 && value <= 3) return "Q4";
  return undefined;
}

export function normalizeManagementPeriodFilter(
  filter: ManagementPeriodFilter,
): ManagementPeriodFilter {
  if (filter.financialYear === "ALL") {
    return { financialYear: "ALL", quarter: "ALL", month: "ALL" };
  }

  const allowedMonths = listFinancialYearMonths(filter.financialYear);
  const validMonth =
    filter.month !== "ALL" && allowedMonths.includes(filter.month)
      ? filter.month
      : "ALL";
  const month =
    validMonth !== "ALL" &&
    filter.quarter !== "ALL" &&
    quarterForMonth(validMonth) !== filter.quarter
      ? "ALL"
      : validMonth;

  return { ...filter, month };
}

function dateMatchesFilter(
  date: string,
  filter: ManagementPeriodFilter,
): boolean {
  if (filter.financialYear === "ALL") return true;
  if (financialYearForDate(date) !== filter.financialYear) return false;
  const month = date.slice(0, 7);
  if (filter.month !== "ALL") return month === filter.month;
  return filter.quarter === "ALL" || quarterForMonth(month) === filter.quarter;
}

function postedReceived(record: SubventionFinancialRecord): number {
  return record.receiptAllocations
    .filter((allocation) => allocation.status === "POSTED")
    .reduce((sum, allocation) => sum + allocation.amountPaise, 0);
}

function phaseValue(record: SubventionFinancialRecord): {
  amountPaise: number;
  amountBasis: ManagementAmountBasis;
} {
  return record.approvedValuePaise > 0
    ? {
        amountPaise: record.approvedValuePaise,
        amountBasis: "APPROVED_CLAIM_VALUE",
      }
    : {
        amountPaise: record.claimValuePaise,
        amountBasis: "EXPECTED_CLAIM_VALUE",
      };
}

function toDrilldown(
  record: SubventionFinancialRecord,
  amountPaise: number,
  amountBasis: ManagementAmountBasis,
  eventDate = record.periodDate,
  sourceReceiptIds: string[] = [],
): ManagementDrilldownRecord {
  const receivedPaise = postedReceived(record);
  return {
    claimId: record.claimId,
    eventDate,
    phase: record.phase,
    counterpartyId: record.counterpartyId,
    counterpartyName: record.counterpartyName,
    employerId: record.employerId,
    employerName: record.employerName,
    claimValuePaise: record.claimValuePaise,
    approvedValuePaise: record.approvedValuePaise,
    receivedPaise,
    outstandingPaise: Math.max(record.approvedValuePaise - receivedPaise, 0),
    dueDate: record.dueDate,
    amountPaise,
    amountBasis,
    sourceReceiptIds,
  };
}

function metric(
  key: ManagementMetric["key"],
  label: string,
  definition: string,
  rows: ManagementDrilldownRecord[],
): ManagementMetric {
  return {
    key,
    label,
    definition,
    amountPaise: rows.reduce((sum, row) => sum + row.amountPaise, 0),
    count: rows.length,
    records: rows,
  };
}

function groupBy<T>(rows: ManagementDrilldownRecord[], keyFor: (row: ManagementDrilldownRecord) => string, build: (key: string, grouped: ManagementDrilldownRecord[]) => T): T[] {
  const groups = new Map<string, ManagementDrilldownRecord[]>();
  rows.forEach((row) => groups.set(keyFor(row), [...(groups.get(keyFor(row)) ?? []), row]));
  return [...groups.entries()].map(([key, grouped]) => build(key, grouped));
}

export function selectManagementOverview(
  records: SubventionFinancialRecord[],
  requestedFilter: ManagementPeriodFilter,
  options: { businessDate: string },
): ManagementOverview {
  const filter = normalizeManagementPeriodFilter(requestedFilter);
  const persisted = records.filter((record) => record.sourceKind === "PERSISTED");
  const periodRecords = persisted.filter((record) => dateMatchesFilter(record.periodDate, filter));

  const receivedRows = persisted.flatMap((record) => {
    const allocations = record.receiptAllocations.filter(
      (allocation) => allocation.status === "POSTED" && dateMatchesFilter(allocation.receiptDate, filter),
    );
    if (allocations.length === 0) return [];
    return [
      toDrilldown(
        record,
        allocations.reduce((sum, allocation) => sum + allocation.amountPaise, 0),
        "POSTED_RECEIPT_ALLOCATION",
        allocations.map((allocation) => allocation.receiptDate).sort().at(-1),
        allocations.map((allocation) => allocation.receiptId),
      ),
    ];
  });

  const paymentDueRows = periodRecords
    .filter((record) => PAYMENT_DUE_PHASES.has(record.phase))
    .map((record) => {
      const outstanding = Math.max(record.approvedValuePaise - postedReceived(record), 0);
      return toDrilldown(record, outstanding, "OUTSTANDING_APPROVED_VALUE");
    })
    .filter((row) => row.amountPaise > 0);

  const inProgressRows = periodRecords
    .filter((record) => IN_PROGRESS_PHASES.has(record.phase))
    .map((record) => {
      const value = phaseValue(record);
      return toDrilldown(record, value.amountPaise, value.amountBasis);
    });

  const overdueRows = paymentDueRows.filter(
    (row) => row.dueDate !== undefined && row.dueDate < options.businessDate.slice(0, 10),
  );

  const phaseRows = periodRecords.map((record) => {
    const value = phaseValue(record);
    return toDrilldown(record, value.amountPaise, value.amountBasis);
  });

  return {
    filter,
    availableFinancialYears: [...new Set(persisted.flatMap((record) => [record.periodDate, ...record.receiptAllocations.filter((row) => row.status === "POSTED").map((row) => row.receiptDate)]).map(financialYearForDate))].sort().reverse(),
    received: metric("RECEIVED", "Subvention received", "Posted receipt allocations in the selected period.", receivedRows),
    paymentDue: metric("PAYMENT_DUE", "Payment due", "Approved value less all posted receipt allocations for approved or invoiced claims in the selected period.", paymentDueRows),
    inProgress: metric("IN_PROGRESS", "Claim value in progress", "Expected or approved value for draft, approval, submitted and response-pending claims in the selected period.", inProgressRows),
    overdue: metric("OVERDUE", "Overdue amount", "Payment-due balances with a contractual due date before the business date.", overdueRows),
    phasePosition: groupBy(phaseRows, (row) => row.phase, (phase, grouped) => ({
      phase: phase as ClaimPhase,
      count: grouped.length,
      amountPaise: grouped.reduce((sum, row) => sum + row.amountPaise, 0),
      records: grouped,
    })).sort((a, b) => b.amountPaise - a.amountPaise),
    employerPosition: groupBy(phaseRows, (row) => row.employerId, (employerId, grouped) => ({
      employerId,
      employerName: grouped[0].employerName,
      count: grouped.length,
      amountPaise: grouped.reduce((sum, row) => sum + row.amountPaise, 0),
      records: grouped,
    })).sort((a, b) => b.amountPaise - a.amountPaise),
    counterpartyDues: groupBy(paymentDueRows, (row) => row.counterpartyId, (counterpartyId, grouped) => ({
      counterpartyId,
      counterpartyName: grouped[0].counterpartyName,
      count: grouped.length,
      amountPaise: grouped.reduce((sum, row) => sum + row.amountPaise, 0),
      earliestDueDate: grouped.map((row) => row.dueDate).filter((date): date is string => date !== undefined).sort()[0],
      overdue: grouped.some((row) => row.dueDate !== undefined && row.dueDate < options.businessDate.slice(0, 10)),
      records: grouped,
    })).sort((a, b) => b.amountPaise - a.amountPaise),
  };
}
