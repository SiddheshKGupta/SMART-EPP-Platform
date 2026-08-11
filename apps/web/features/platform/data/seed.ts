import type {
  ApplicationRecord,
  AssetRecord,
  EmployeeRecord,
  IntegrationAdapterDemo,
  LeaseRecord,
  OperatingState,
  PlatformExceptionRecord,
  PlatformModuleKey,
  PlatformSnapshot,
  WorkItem,
  WorkQueueKey,
  PlatformAction,
} from "@smart-epp/domain";

const generatedAt = "2026-08-10T09:00:00.000Z";

const employee = (id: string, employerId: string, name: string, payrollId: string, status: OperatingState): EmployeeRecord => ({ id, employerId, name, payrollId, pan: `SYNTH-PAN-${id}`, bankAccount: `SYNTH-BANK-${id}`, status });
const asset = (id: string, oem: string, model: string, category: string, serialNumber: string, invoiceValuePaise: number): AssetRecord => ({ id, oem, model, category, serialNumber, invoiceValuePaise });
const application = (id: string, employeeId: string, assetId: string, requestedPaise: number, reservedPaise: number, status: OperatingState): ApplicationRecord => ({ id, employeeId, assetId, requestedPaise, reservedPaise, status });
const lease = (id: string, applicationId: string, lotId: string, tenureMonths: number, rentalPaise: number, residualValuePaise: number, status: OperatingState): LeaseRecord => ({ id, applicationId, lotId, tenureMonths, rentalPaise, residualValuePaise, status });
const workItem = (id: string, employerId: string, module: PlatformModuleKey, title: string, owner: string, dueDate: string, state: OperatingState, financialImpactPaise: number, href: string, queueKeys: WorkQueueKey[], provenance: { assignedUserId?: string; initiatedBy?: string; requestedAction?: PlatformAction } = {}): WorkItem => ({ id, employerId, module, title, owner, dueDate, state, financialImpactPaise, href, queueKeys, ...provenance });
const integration = (id: string, name: string, status: IntegrationAdapterDemo["status"], accepted: number, rejected: number, pending: number): IntegrationAdapterDemo => ({ id, name, mode: "MOCK", status, lastSyncAt: generatedAt, accepted, rejected, pending });

const employees: EmployeeRecord[] = [
  employee("employee-northstar-01", "employer-northstar", "Aarav Mehta", "NS-1001", "HEALTHY"), employee("employee-northstar-02", "employer-northstar", "Diya Shah", "NS-1002", "PENDING"), employee("employee-northstar-03", "employer-northstar", "Kabir Rao", "NS-1003", "HEALTHY"), employee("employee-northstar-04", "employer-northstar", "Meera Iyer", "NS-1004", "RECONCILED"),
  employee("employee-pinnacle-01", "employer-pinnacle", "Rohan Gupta", "PM-2001", "PENDING"), employee("employee-pinnacle-02", "employer-pinnacle", "Ananya Sen", "PM-2002", "HEALTHY"), employee("employee-pinnacle-03", "employer-pinnacle", "Vikram Nair", "PM-2003", "OVERDUE"), employee("employee-pinnacle-04", "employer-pinnacle", "Ishita Bose", "PM-2004", "REJECTED"),
  employee("employee-harbour-01", "employer-harbour", "Arjun Kapoor", "HR-3001", "HEALTHY"), employee("employee-harbour-02", "employer-harbour", "Nisha Verma", "HR-3002", "RECONCILED"), employee("employee-harbour-03", "employer-harbour", "Sana Khan", "HR-3003", "PENDING"), employee("employee-harbour-04", "employer-harbour", "Dev Malhotra", "HR-3004", "HEALTHY"),
];
const assets: AssetRecord[] = [
  asset("asset-01", "Apple", "MacBook Air M4", "Laptop", "C02X000001", 12_490_000), asset("asset-02", "Apple", "iPhone 16", "Mobile", "C02X000002", 7_990_000), asset("asset-03", "Samsung", "Galaxy S25", "Mobile", "R5CX000003", 7_499_900), asset("asset-04", "Lenovo", "ThinkPad X1", "Laptop", "PF5X000004", 14_250_000),
  asset("asset-05", "Apple", "iPad Air", "Tablet", "DMPX000005", 6_490_000), asset("asset-06", "Dell", "Latitude 7450", "Laptop", "D3LX000006", 11_800_000), asset("asset-07", "Samsung", "Galaxy Tab S10", "Tablet", "R5CX000007", 6_999_900), asset("asset-08", "Apple", "MacBook Pro M4", "Laptop", "C02X000008", 18_990_000),
];
const applications: ApplicationRecord[] = [
  application("application-01", "employee-northstar-01", "asset-01", 12_490_000, 12_490_000, "HEALTHY"), application("application-02", "employee-northstar-02", "asset-02", 7_990_000, 7_990_000, "PENDING"), application("application-03", "employee-northstar-03", "asset-03", 7_499_900, 0, "REJECTED"), application("application-04", "employee-pinnacle-01", "asset-04", 14_250_000, 14_250_000, "PENDING"),
  application("application-05", "employee-pinnacle-03", "asset-05", 6_490_000, 6_490_000, "OVERDUE"), application("application-06", "employee-harbour-01", "asset-06", 11_800_000, 11_800_000, "HEALTHY"), application("application-07", "employee-harbour-02", "asset-07", 6_999_900, 6_999_900, "RECONCILED"), application("application-08", "employee-harbour-03", "asset-08", 18_990_000, 0, "REJECTED"),
];
const leases: LeaseRecord[] = [
  lease("lease-01", "application-01", "lot-northstar-01", 36, 392_500, 2_498_000, "HEALTHY"), lease("lease-02", "application-02", "lot-northstar-01", 24, 333_000, 1_598_000, "PENDING"), lease("lease-03", "application-04", "lot-pinnacle-01", 36, 448_500, 2_850_000, "PENDING"),
  lease("lease-04", "application-05", "lot-pinnacle-02", 24, 270_500, 1_298_000, "OVERDUE"), lease("lease-05", "application-06", "lot-harbour-01", 36, 371_000, 2_360_000, "HEALTHY"), lease("lease-06", "application-07", "lot-harbour-01", 24, 291_500, 1_399_900, "RECONCILED"),
];
const workItems: WorkItem[] = [
  workItem("work-01", "employer-northstar", "APPLICATIONS_ELIGIBILITY", "Review Northstar application", "ops-lead", "2026-08-10", "HEALTHY", 12_490_000, "/applications/register?q=application-01", ["MY_TASKS", "TEAM_QUEUES", "RECENTLY_VIEWED"], { assignedUserId: "operations-demo", initiatedBy: "relationship-manager", requestedAction: "EDIT" }),
  workItem("work-02", "employer-northstar", "ORDERS_APPROVALS", "Approve Northstar iPhone order", "ops-lead", "2026-08-11", "PENDING", 7_990_000, "/orders/approval-queues?q=application-02", ["MY_APPROVALS", "TEAM_QUEUES"], { initiatedBy: "ops-lead", requestedAction: "APPROVE" }),
  workItem("work-03", "employer-pinnacle", "EXCEPTIONS_RECONCILIATIONS", "Resolve Pinnacle rental arrears", "collections-analyst", "2026-08-05", "OVERDUE", 6_490_000, "/exceptions/reconciliation-breaks?q=lease-04", ["MY_EXCEPTIONS", "TEAM_QUEUES", "ESCALATIONS"]),
  workItem("work-04", "employer-northstar", "APPLICATIONS_ELIGIBILITY", "Notify rejected asset request", "ops-lead", "2026-08-09", "REJECTED", 7_499_900, "/applications/rejections-returns?q=application-03", ["MY_TASKS", "MY_EXCEPTIONS", "TEAM_QUEUES", "NOTIFICATIONS"], { assignedUserId: "operations-demo" }),
  workItem("work-05", "employer-harbour", "BILLING_COLLECTIONS", "Reconcile Harbour receipt", "finance-billing", "2026-08-10", "RECONCILED", 6_999_900, "/billing/bank-reconciliation?q=lease-06", ["TEAM_QUEUES", "RECENTLY_VIEWED"]),
  workItem("work-06", "employer-pinnacle", "EMPLOYEES", "Validate Pinnacle payroll feed", "Unassigned", "2026-08-12", "PENDING", 0, "/employees/employment-payroll?q=employee-pinnacle-01", ["TEAM_QUEUES", "UNASSIGNED_WORK"]),
  workItem("work-07", "employer-harbour", "LEASES_PORTFOLIO", "Activate Harbour laptop lease", "portfolio-manager", "2026-08-10", "HEALTHY", 11_800_000, "/portfolio/activation?q=lease-05", ["TEAM_QUEUES", "DELEGATIONS"], { assignedUserId: "portfolio-manager", initiatedBy: "ops-lead", requestedAction: "EDIT" }),
  workItem("work-08", "employer-pinnacle", "DOCUMENTS_EVIDENCE", "Obtain acceptance certificate", "ops-lead", "2026-08-06", "OVERDUE", 14_250_000, "/documents/missing-documents?q=application-04", ["MY_EXCEPTIONS", "TEAM_QUEUES", "ESCALATIONS"]),
  workItem("work-09", "employer-pinnacle", "EMPLOYER_PROGRAMMES", "Review Pinnacle utilisation", "relationship-manager", "2026-08-13", "PENDING", 13_100_000, "/programmes/performance?q=employer-pinnacle", ["TEAM_QUEUES"]),
  workItem("work-10", "employer-harbour", "EXCEPTIONS_RECONCILIATIONS", "Close Harbour sync variance", "finance-billing", "2026-08-09", "RECONCILED", 0, "/exceptions/reconciliation-breaks?q=harbour-sync", ["TEAM_QUEUES", "RECENTLY_VIEWED"]),
];
const exceptions: PlatformExceptionRecord[] = [
  { id: "exception-returned-01", employerId: "employer-northstar", scenario: "RETURNED", operatingState: "REJECTED", recoveryState: "OPEN", sourceRecordType: "Application", sourceRecordId: "application-03", workItemId: "work-04" },
  { id: "exception-duplicated-01", employerId: "employer-pinnacle", scenario: "DUPLICATED", operatingState: "PENDING", recoveryState: "IN_PROGRESS", sourceRecordType: "Employee", sourceRecordId: "employee-pinnacle-01", workItemId: "work-06" },
  { id: "exception-mismatched-01", employerId: "employer-harbour", scenario: "MISMATCHED", operatingState: "RECONCILED", recoveryState: "RECOVERED", sourceRecordType: "IntegrationAdapter", sourceRecordId: "integration-employer-hrms", workItemId: "work-10" },
];
const integrations: IntegrationAdapterDemo[] = [
  integration("integration-master-hub", "Master Hub", "HEALTHY", 1_240, 0, 0), integration("integration-leasing-platform", "Existing Leasing Platform", "PARTIAL", 982, 3, 5), integration("integration-tally", "Tally", "HEALTHY", 426, 0, 0), integration("integration-employer-hrms", "Employer HRMS", "PARTIAL", 355, 2, 4), integration("integration-gst-einvoicing", "GST/E-invoicing", "HEALTHY", 188, 0, 0), integration("integration-bank", "Bank", "HEALTHY", 92, 0, 0), integration("integration-oem-vendor", "OEM/Vendor", "FAILED", 0, 6, 8),
];

const demoSeed: PlatformSnapshot = {
  generatedAt,
  profiles: [
    { userId: "ops-lead", roleKeys: ["OPERATIONS_LEAD"], grants: [{ module: "ALL", actions: ["READ", "CREATE", "EDIT", "SUBMIT"] }], dataScopes: ["ALL_EMPLOYERS"], maskedFields: [], isAdmin: false, isManagement: false },
    { userId: "portfolio-manager", roleKeys: ["MANAGEMENT"], grants: [{ module: "LEASES_PORTFOLIO", actions: ["READ", "APPROVE"] }], dataScopes: ["PORTFOLIO"], maskedFields: ["payrollId"], isAdmin: false, isManagement: true },
    { userId: "platform-admin", roleKeys: ["ADMIN"], grants: [{ module: "ALL", actions: ["READ", "CONFIGURE", "APPROVE"] }], dataScopes: ["ALL"], maskedFields: [], isAdmin: true, isManagement: false },
  ],
  employers: [
    { id: "employer-northstar", name: "Northstar Consulting Private Limited", programmeId: "programme-northstar-epp", programmeStage: "ACTIVE", sanctionPaise: 50_000_000, utilisedPaise: 28_400_000, status: "HEALTHY" },
    { id: "employer-pinnacle", name: "Pinnacle Manufacturing Limited", programmeId: "programme-pinnacle-epp", programmeStage: "IMPLEMENTATION", sanctionPaise: 75_000_000, utilisedPaise: 61_900_000, status: "PENDING" },
    { id: "employer-harbour", name: "Harbour Retail Services Limited", programmeId: "programme-harbour-epp", programmeStage: "ONBOARDING", sanctionPaise: 30_000_000, utilisedPaise: 12_600_000, status: "RECONCILED" },
  ],
  employees,
  applications,
  assets,
  leases,
  workItems,
  guidedJourneys: [{ id: "journey-northstar-01", employerId: "employer-northstar", employeeId: "employee-northstar-01", applicationId: "application-01", leaseId: "lease-01", steps: [
    { id: "journey-step-01", label: "Employer readiness", href: "/programmes/readiness?q=Northstar", status: "CURRENT" },
    { id: "journey-step-02", label: "Employee enrolment", href: "/employees/enrolment?q=Aarav", status: "UPCOMING" },
    { id: "journey-step-03", label: "Eligibility and credit", href: "/applications/eligibility?q=application-01", status: "UPCOMING" },
    { id: "journey-step-04", label: "Asset identification", href: "/assets/device-identifiers?q=C02X000001", status: "UPCOMING" },
    { id: "journey-step-05", label: "Approval", href: "/orders/approval-queues?q=application-01", status: "UPCOMING" },
    { id: "journey-step-06", label: "Lease handoff and activation", href: "/portfolio/activation?q=lease-01", status: "UPCOMING" },
    { id: "journey-step-07", label: "Servicing", href: "/billing/collection-queue?q=lease-01", status: "UPCOMING" },
    { id: "journey-step-08", label: "Foreclosure", href: "/foreclosure/intake?q=lease-01", status: "UPCOMING" },
  ] }],
  integrations,
  exceptions,
  auditEvents: [
    { id: "audit-01", entityType: "Employer", entityId: "employer-northstar", action: "PROGRAMME_ACTIVATED", actorId: "platform-admin", reason: "Approved programme go-live", outcome: "SUCCESS", occurredAt: "2026-08-01T09:00:00.000Z" },
    { id: "audit-02", entityType: "Application", entityId: "application-01", action: "APPLICATION_APPROVED", actorId: "ops-lead", reason: "Eligibility and exposure checks passed", outcome: "SUCCESS", occurredAt: "2026-08-08T10:30:00.000Z" },
    { id: "audit-03", entityType: "Lease", entityId: "lease-01", action: "LEASE_ACTIVATED", actorId: "portfolio-manager", reason: "Asset delivery accepted", outcome: "SUCCESS", occurredAt: "2026-08-09T14:15:00.000Z" },
  ],
};

export function createPlatformDemoSeed(): PlatformSnapshot {
  return structuredClone(demoSeed);
}
