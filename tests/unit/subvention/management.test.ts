import { describe, expect, it } from "vitest";
import {
  listFinancialYearMonths,
  normalizeManagementPeriodFilter,
  selectManagementOverview,
  type SubventionFinancialRecord,
} from "../../../packages/domain/src/subvention/management";
import { financialRecordsFromSnapshot } from "../../../apps/web/features/subvention/management/managementReadModel";
import type { SubventionSnapshot } from "../../../packages/domain/src";

const records: SubventionFinancialRecord[] = [
  {
    claimId: "CLM-APR-DUE",
    periodDate: "2026-04-18",
    phase: "INVOICED",
    employerId: "EMP-CRISIL",
    employerName: "CRISIL Limited",
    counterpartyId: "CP-REDINGTON",
    counterpartyName: "Redington Limited",
    claimValuePaise: 1_200_000,
    approvedValuePaise: 1_000_000,
    dueDate: "2026-05-31",
    receiptAllocations: [
      {
        receiptId: "RCT-APR-1",
        receiptDate: "2026-04-30",
        amountPaise: 250_000,
        status: "POSTED",
      },
      {
        receiptId: "RCT-JUL-IGNORED-FOR-RECEIVED",
        receiptDate: "2026-07-02",
        amountPaise: 100_000,
        status: "POSTED",
      },
    ],
    sourceKind: "PERSISTED",
  },
  {
    claimId: "CLM-JUN-PROGRESS",
    periodDate: "2026-06-14",
    phase: "SUBMITTED_TO_COUNTERPARTY",
    employerId: "EMP-MARUTI",
    employerName: "Maruti Suzuki India Limited",
    counterpartyId: "CP-INGRAM",
    counterpartyName: "Ingram Micro India",
    claimValuePaise: 600_000,
    approvedValuePaise: 0,
    receiptAllocations: [],
    sourceKind: "PERSISTED",
  },
  {
    claimId: "CLM-JUL-OUTSIDE-Q1",
    periodDate: "2026-07-01",
    phase: "DRAFT",
    employerId: "EMP-CRISIL",
    employerName: "CRISIL Limited",
    counterpartyId: "CP-REDINGTON",
    counterpartyName: "Redington Limited",
    claimValuePaise: 900_000,
    approvedValuePaise: 0,
    receiptAllocations: [],
    sourceKind: "PERSISTED",
  },
  {
    claimId: "CLM-PREVIEW",
    periodDate: "2026-05-10",
    phase: "DRAFT",
    employerId: "EMP-MARUTI",
    employerName: "Maruti Suzuki India Limited",
    counterpartyId: "CP-INGRAM",
    counterpartyName: "Ingram Micro India",
    claimValuePaise: 9_900_000,
    approvedValuePaise: 0,
    receiptAllocations: [],
    sourceKind: "PREVIEW",
  },
  {
    claimId: "CLM-MAR-PRIOR-FY",
    periodDate: "2026-03-31",
    phase: "INVOICED",
    employerId: "EMP-OLD",
    employerName: "Prior Year Employer",
    counterpartyId: "CP-INGRAM",
    counterpartyName: "Ingram Micro India",
    claimValuePaise: 400_000,
    approvedValuePaise: 400_000,
    dueDate: "2026-04-30",
    receiptAllocations: [],
    sourceKind: "PERSISTED",
  },
];

describe("management period filters", () => {
  it("lists April through March for an Indian financial year", () => {
    expect(listFinancialYearMonths("2026-27")).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
    ]);
  });

  it("clears a month that conflicts with the selected quarter", () => {
    expect(
      normalizeManagementPeriodFilter({
        financialYear: "2026-27",
        quarter: "Q1",
        month: "2026-08",
      }),
    ).toEqual({ financialYear: "2026-27", quarter: "Q1", month: "ALL" });
  });
});

describe("management overview", () => {
  const filter = {
    financialYear: "2026-27",
    quarter: "Q1" as const,
    month: "ALL" as const,
  };

  it("returns exactly the posted receipt allocations counted as received", () => {
    const model = selectManagementOverview(records, filter, {
      businessDate: "2026-08-03",
    });

    expect(model.received.amountPaise).toBe(250_000);
    expect(model.received.records.map((row) => row.claimId)).toEqual([
      "CLM-APR-DUE",
    ]);
    expect(
      model.received.records.reduce((sum, row) => sum + row.amountPaise, 0),
    ).toBe(model.received.amountPaise);
  });

  it("uses approved value less all posted receipts for payment due", () => {
    const model = selectManagementOverview(records, filter, {
      businessDate: "2026-08-03",
    });

    expect(model.paymentDue.amountPaise).toBe(650_000);
    expect(model.paymentDue.records).toEqual([
      expect.objectContaining({
        claimId: "CLM-APR-DUE",
        approvedValuePaise: 1_000_000,
        receivedPaise: 350_000,
        outstandingPaise: 650_000,
        amountPaise: 650_000,
        amountBasis: "OUTSTANDING_APPROVED_VALUE",
      }),
    ]);
  });

  it("includes response-pending claims in progress and excludes previews", () => {
    const responsePending: SubventionFinancialRecord = {
      ...records[1],
      claimId: "CLM-RESPONSE-PENDING",
      phase: "RESPONDED",
      claimValuePaise: 300_000,
    };
    const model = selectManagementOverview(
      [...records, responsePending],
      filter,
      { businessDate: "2026-08-03" },
    );

    expect(model.inProgress.amountPaise).toBe(900_000);
    expect(model.inProgress.records.map((row) => row.claimId).sort()).toEqual([
      "CLM-JUN-PROGRESS",
      "CLM-RESPONSE-PENDING",
    ]);
  });

  it("marks only positive due balances before the business date as overdue", () => {
    const model = selectManagementOverview(records, filter, {
      businessDate: "2026-08-03",
    });

    expect(model.overdue.amountPaise).toBe(650_000);
    expect(model.overdue.records[0]).toEqual(
      expect.objectContaining({ claimId: "CLM-APR-DUE", dueDate: "2026-05-31" }),
    );
  });

  it("uses the same records for phase, employer and counterparty drilldowns", () => {
    const model = selectManagementOverview(records, filter, {
      businessDate: "2026-08-03",
    });

    expect(model.phasePosition).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          phase: "INVOICED",
          count: 1,
          amountPaise: 1_000_000,
          records: [expect.objectContaining({ claimId: "CLM-APR-DUE" })],
        }),
        expect.objectContaining({
          phase: "SUBMITTED_TO_COUNTERPARTY",
          count: 1,
          amountPaise: 600_000,
          records: [expect.objectContaining({ claimId: "CLM-JUN-PROGRESS" })],
        }),
      ]),
    );
    expect(model.employerPosition).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          employerId: "EMP-CRISIL",
          count: 1,
          amountPaise: 1_000_000,
        }),
      ]),
    );
    expect(model.counterpartyDues).toEqual([
      expect.objectContaining({
        counterpartyId: "CP-REDINGTON",
        amountPaise: 650_000,
        earliestDueDate: "2026-05-31",
        overdue: true,
        records: [expect.objectContaining({ claimId: "CLM-APR-DUE" })],
      }),
    ]);
  });
});

describe("live management source", () => {
  it("derives records from the same claim-batch snapshot and preserves the source batch ID", () => {
    const snapshot = {
      masters: {
        employers: [{ id: "EMP-1", name: "Employer One" }],
        distributors: [{ id: "CP-1", name: "Ingram Micro India" }],
        resellers: [],
        oems: [],
      },
      claimBatches: [{
        id: "batch-live-1", reference: "CLM-LIVE-1", status: "PARTIALLY_COLLECTED", settlementCounterpartyId: "CP-1", settlementCounterpartyType: "DISTRIBUTOR",
        lines: [{ id: "line-1", transactionId: "tx-1", leaseId: "lease-1", employerId: "EMP-1", invoiceNumber: "INV-1", invoiceDate: "2026-07-01", deviceIdentifier: "IMEI-1", settlementCounterpartyId: "CP-1", settlementCounterpartyType: "DISTRIBUTOR", expectedAmountPaise: 5_000, approvedAmountPaise: 4_500, filingDeadline: "2026-09-01", ruleSnapshot: { eligibilityDecisionId: "decision-1", eligibilityDecisionVersion: 1, capturedAt: "2026-07-02", employerProgrammeMappingVersionId: "mapping-1", schemeVersionId: "scheme-1", calculationBasis: "INVOICE_VALUE", rateBps: 350, claimTimelineDays: 90, eligibleProductIds: ["product-1"], settlementCounterpartyType: "DISTRIBUTOR", precedenceSources: ["scheme-1"] } }],
        expectedAmountPaise: 5_000, makerUserId: "maker", createdAt: "2026-07-02T00:00:00.000Z", stageEnteredAt: "2026-07-20T00:00:00.000Z", invoicedAmountPaise: 4_500, collectedAmountPaise: 2_000,
      }],
    } as unknown as Pick<SubventionSnapshot, "claimBatches" | "masters">;
    expect(financialRecordsFromSnapshot(snapshot)).toEqual([expect.objectContaining({ claimId: "batch-live-1", employerName: "Employer One", counterpartyName: "Ingram Micro India", approvedValuePaise: 4_500, receiptAllocations: [expect.objectContaining({ receiptId: "batch-live-1:recorded-collection", amountPaise: 2_000 })] })]);
  });
});
