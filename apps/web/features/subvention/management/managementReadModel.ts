import {
  listFinancialYearMonths,
  normalizeManagementPeriodFilter,
  quarterForMonth,
  selectManagementOverview,
  type ManagementOverview,
  type ManagementPeriodFilter,
  type SubventionFinancialRecord,
} from "../../../../../packages/domain/src/subvention/management";

export interface ManagementSearchParams {
  get(name: string): string | null;
}

export function managementFilterFromSearchParams(
  searchParams: ManagementSearchParams,
  fallbackFinancialYear: string,
): ManagementPeriodFilter {
  const quarter = searchParams.get("quarter");
  const filter: ManagementPeriodFilter = {
    financialYear: searchParams.get("fy") ?? fallbackFinancialYear,
    quarter:
      quarter === "Q1" || quarter === "Q2" || quarter === "Q3" || quarter === "Q4"
        ? quarter
        : "ALL",
    month: searchParams.get("month") ?? "ALL",
  };
  return normalizeManagementPeriodFilter(filter);
}

export function managementFilterToSearchParams(
  filter: ManagementPeriodFilter,
): URLSearchParams {
  const normalized = normalizeManagementPeriodFilter(filter);
  const params = new URLSearchParams();
  if (normalized.financialYear !== "ALL") params.set("fy", normalized.financialYear);
  if (normalized.quarter !== "ALL") params.set("quarter", normalized.quarter);
  if (normalized.month !== "ALL") params.set("month", normalized.month);
  return params;
}

export function monthsForManagementFilter(filter: ManagementPeriodFilter): string[] {
  const months = listFinancialYearMonths(filter.financialYear);
  return filter.quarter === "ALL"
    ? months
    : months.filter((month) => quarterForMonth(month) === filter.quarter);
}

export function createManagementReadModel(
  records: SubventionFinancialRecord[],
  filter: ManagementPeriodFilter,
  businessDate: string,
): ManagementOverview {
  return selectManagementOverview(records, filter, { businessDate });
}

export const DEMO_MANAGEMENT_RECORDS: SubventionFinancialRecord[] = [
  {
    claimId: "CLM-RED-2026-041",
    periodDate: "2026-04-26",
    phase: "INVOICED",
    employerId: "EMP-MARUTI",
    employerName: "Maruti Suzuki India Limited",
    counterpartyId: "CP-REDINGTON",
    counterpartyName: "Redington Limited",
    claimValuePaise: 5_026_630,
    approvedValuePaise: 4_972_000,
    dueDate: "2026-06-30",
    receiptAllocations: [
      {
        receiptId: "RCT-RED-2026-018",
        receiptDate: "2026-06-28",
        amountPaise: 3_200_000,
        status: "POSTED",
      },
    ],
    sourceKind: "PERSISTED",
  },
  {
    claimId: "CLM-ING-2026-057",
    periodDate: "2026-05-19",
    phase: "APPROVED_AND_LOCKED",
    employerId: "EMP-CRISIL",
    employerName: "CRISIL Limited",
    counterpartyId: "CP-INGRAM",
    counterpartyName: "Ingram Micro India",
    claimValuePaise: 2_318_470,
    approvedValuePaise: 2_254_000,
    dueDate: "2026-07-18",
    receiptAllocations: [],
    sourceKind: "PERSISTED",
  },
  {
    claimId: "CLM-RAD-2026-063",
    periodDate: "2026-06-11",
    phase: "SUBMITTED_TO_COUNTERPARTY",
    employerId: "EMP-NAYARA",
    employerName: "Nayara Energy Limited",
    counterpartyId: "CP-RADIUS",
    counterpartyName: "Radius Systems Private Limited",
    claimValuePaise: 1_684_900,
    approvedValuePaise: 0,
    receiptAllocations: [],
    sourceKind: "PERSISTED",
  },
  {
    claimId: "CLM-ING-2026-074",
    periodDate: "2026-07-22",
    phase: "RESPONDED",
    employerId: "EMP-INDUS",
    employerName: "Indus Towers Limited",
    counterpartyId: "CP-INGRAM",
    counterpartyName: "Ingram Micro India",
    claimValuePaise: 1_126_000,
    approvedValuePaise: 1_085_000,
    receiptAllocations: [],
    sourceKind: "PERSISTED",
  },
  {
    claimId: "CLM-RED-2026-079",
    periodDate: "2026-08-01",
    phase: "DRAFT",
    employerId: "EMP-ONE97",
    employerName: "One97 Communications Limited",
    counterpartyId: "CP-REDINGTON",
    counterpartyName: "Redington Limited",
    claimValuePaise: 884_500,
    approvedValuePaise: 0,
    receiptAllocations: [],
    sourceKind: "PERSISTED",
  },
];
