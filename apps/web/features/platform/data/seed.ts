import type { PlatformSnapshot } from "@smart-epp/domain";

const generatedAt = "2026-08-10T09:00:00.000Z";

const demoSeed: PlatformSnapshot = {
  generatedAt,
  profiles: [
    { userId: "ops-lead", roleKeys: ["OPERATIONS_LEAD"], grants: [{ module: "ALL", actions: ["READ", "CREATE", "EDIT", "SUBMIT"] }], dataScopes: ["ALL_EMPLOYERS"], maskedFields: [], isAdmin: false, isManagement: false },
    { userId: "portfolio-manager", roleKeys: ["MANAGEMENT"], grants: [{ module: "LEASES_PORTFOLIO", actions: ["READ", "APPROVE"] }], dataScopes: ["PORTFOLIO"], maskedFields: ["payrollId"], isAdmin: false, isManagement: true },
    { userId: "platform-admin", roleKeys: ["ADMIN"], grants: [{ module: "ALL", actions: ["READ", "CONFIGURE", "APPROVE"] }], dataScopes: ["ALL"], maskedFields: [], isAdmin: true, isManagement: false },
  ],
  employers: [
    { id: "employer-northstar", name: "Northstar Consulting Private Limited", programmeId: "programme-northstar-epp", sanctionPaise: 50_000_000, utilisedPaise: 28_400_000, status: "HEALTHY" },
    { id: "employer-pinnacle", name: "Pinnacle Manufacturing Limited", programmeId: "programme-pinnacle-epp", sanctionPaise: 75_000_000, utilisedPaise: 61_900_000, status: "PENDING" },
    { id: "employer-harbour", name: "Harbour Retail Services Limited", programmeId: "programme-harbour-epp", sanctionPaise: 30_000_000, utilisedPaise: 12_600_000, status: "RECONCILED" },
  ],
  employees: [
    ["employee-northstar-01", "employer-northstar", "Aarav Mehta", "NS-1001", "HEALTHY"], ["employee-northstar-02", "employer-northstar", "Diya Shah", "NS-1002", "PENDING"], ["employee-northstar-03", "employer-northstar", "Kabir Rao", "NS-1003", "HEALTHY"], ["employee-northstar-04", "employer-northstar", "Meera Iyer", "NS-1004", "RECONCILED"],
    ["employee-pinnacle-01", "employer-pinnacle", "Rohan Gupta", "PM-2001", "PENDING"], ["employee-pinnacle-02", "employer-pinnacle", "Ananya Sen", "PM-2002", "HEALTHY"], ["employee-pinnacle-03", "employer-pinnacle", "Vikram Nair", "PM-2003", "OVERDUE"], ["employee-pinnacle-04", "employer-pinnacle", "Ishita Bose", "PM-2004", "REJECTED"],
    ["employee-harbour-01", "employer-harbour", "Arjun Kapoor", "HR-3001", "HEALTHY"], ["employee-harbour-02", "employer-harbour", "Nisha Verma", "HR-3002", "RECONCILED"], ["employee-harbour-03", "employer-harbour", "Sana Khan", "HR-3003", "PENDING"], ["employee-harbour-04", "employer-harbour", "Dev Malhotra", "HR-3004", "HEALTHY"],
  ].map(([id, employerId, name, payrollId, status]) => ({ id, employerId, name, payrollId, status: status as PlatformSnapshot["employees"][number]["status"] })) as PlatformSnapshot["employees"],
  assets: [
    ["asset-01", "Apple", "MacBook Air M4", "Laptop", "C02X000001", 124_900_00], ["asset-02", "Apple", "iPhone 16", "Mobile", "C02X000002", 79_900_00], ["asset-03", "Samsung", "Galaxy S25", "Mobile", "R5CX000003", 74_999_00], ["asset-04", "Lenovo", "ThinkPad X1", "Laptop", "PF5X000004", 142_500_00],
    ["asset-05", "Apple", "iPad Air", "Tablet", "DMPX000005", 64_900_00], ["asset-06", "Dell", "Latitude 7450", "Laptop", "D3LX000006", 118_000_00], ["asset-07", "Samsung", "Galaxy Tab S10", "Tablet", "R5CX000007", 69_999_00], ["asset-08", "Apple", "MacBook Pro M4", "Laptop", "C02X000008", 189_900_00],
  ].map(([id, oem, model, category, serialNumber, invoiceValuePaise]) => ({ id, oem, model, category, serialNumber, invoiceValuePaise: Number(invoiceValuePaise) })) as PlatformSnapshot["assets"],
  applications: [
    ["application-01", "employee-northstar-01", "asset-01", 124_900_00, 124_900_00, "HEALTHY"], ["application-02", "employee-northstar-02", "asset-02", 79_900_00, 79_900_00, "PENDING"], ["application-03", "employee-northstar-03", "asset-03", 74_999_00, 0, "REJECTED"], ["application-04", "employee-pinnacle-01", "asset-04", 142_500_00, 142_500_00, "PENDING"],
    ["application-05", "employee-pinnacle-03", "asset-05", 64_900_00, 64_900_00, "OVERDUE"], ["application-06", "employee-harbour-01", "asset-06", 118_000_00, 118_000_00, "HEALTHY"], ["application-07", "employee-harbour-02", "asset-07", 69_999_00, 69_999_00, "RECONCILED"], ["application-08", "employee-harbour-03", "asset-08", 189_900_00, 0, "REJECTED"],
  ].map(([id, employeeId, assetId, requestedPaise, reservedPaise, status]) => ({ id, employeeId, assetId, requestedPaise: Number(requestedPaise), reservedPaise: Number(reservedPaise), status: status as PlatformSnapshot["applications"][number]["status"] })) as PlatformSnapshot["applications"],
  leases: [
    ["lease-01", "application-01", "lot-northstar-01", 36, 3_925_00, 24_980_00, "HEALTHY"], ["lease-02", "application-02", "lot-northstar-01", 24, 3_330_00, 15_980_00, "PENDING"], ["lease-03", "application-04", "lot-pinnacle-01", 36, 4_485_00, 28_500_00, "PENDING"],
    ["lease-04", "application-05", "lot-pinnacle-02", 24, 2_705_00, 12_980_00, "OVERDUE"], ["lease-05", "application-06", "lot-harbour-01", 36, 3_710_00, 23_600_00, "HEALTHY"], ["lease-06", "application-07", "lot-harbour-01", 24, 2_915_00, 13_999_00, "RECONCILED"],
  ].map(([id, applicationId, lotId, tenureMonths, rentalPaise, residualValuePaise, status]) => ({ id, applicationId, lotId, tenureMonths: Number(tenureMonths), rentalPaise: Number(rentalPaise), residualValuePaise: Number(residualValuePaise), status: status as PlatformSnapshot["leases"][number]["status"] })) as PlatformSnapshot["leases"],
  workItems: [
    ["work-01", "APPLICATIONS_ELIGIBILITY", "Review Northstar application", "ops-lead", "2026-08-10", "HEALTHY", 124_900_00, "/applications/application-01"], ["work-02", "ORDERS_APPROVALS", "Approve Northstar iPhone order", "ops-lead", "2026-08-11", "PENDING", 79_900_00, "/orders/application-02"], ["work-03", "EXCEPTIONS_RECONCILIATIONS", "Resolve Pinnacle rental arrears", "collections-analyst", "2026-08-05", "OVERDUE", 64_900_00, "/exceptions/lease-04"], ["work-04", "APPLICATIONS_ELIGIBILITY", "Notify rejected asset request", "ops-lead", "2026-08-09", "REJECTED", 74_999_00, "/applications/application-03"], ["work-05", "BILLING_COLLECTIONS", "Reconcile Harbour receipt", "finance-billing", "2026-08-10", "RECONCILED", 69_999_00, "/billing/lease-06"],
    ["work-06", "EMPLOYEES", "Validate Pinnacle payroll feed", "hrms-operator", "2026-08-12", "PENDING", 0, "/employees/employee-pinnacle-01"], ["work-07", "LEASES_PORTFOLIO", "Activate Harbour laptop lease", "portfolio-manager", "2026-08-10", "HEALTHY", 118_000_00, "/portfolio/lease-05"], ["work-08", "DOCUMENTS_EVIDENCE", "Obtain acceptance certificate", "ops-lead", "2026-08-06", "OVERDUE", 142_500_00, "/documents/application-04"], ["work-09", "EMPLOYER_PROGRAMMES", "Review Pinnacle utilisation", "relationship-manager", "2026-08-13", "PENDING", 13_100_000, "/programmes/employer-pinnacle"], ["work-10", "EXCEPTIONS_RECONCILIATIONS", "Close Harbour sync variance", "finance-billing", "2026-08-09", "RECONCILED", 0, "/exceptions/harbour-sync"],
  ].map(([id, module, title, owner, dueDate, state, financialImpactPaise, href]) => ({ id, module: module as PlatformSnapshot["workItems"][number]["module"], title, owner, dueDate, state: state as PlatformSnapshot["workItems"][number]["state"], financialImpactPaise: Number(financialImpactPaise), href })) as PlatformSnapshot["workItems"],
  guidedJourneys: [{ id: "journey-northstar-01", employerId: "employer-northstar", employeeId: "employee-northstar-01", applicationId: "application-01", leaseId: "lease-01", steps: [{ id: "journey-step-01", label: "Employer programme active", href: "/programmes/employer-northstar", status: "COMPLETE" }, { id: "journey-step-02", label: "Employee eligible", href: "/employees/employee-northstar-01", status: "COMPLETE" }, { id: "journey-step-03", label: "Application approved", href: "/applications/application-01", status: "COMPLETE" }, { id: "journey-step-04", label: "Lease active", href: "/portfolio/lease-01", status: "CURRENT" }] }],
  integrations: [
    ["integration-master-hub", "Master Hub", "HEALTHY", 1_240, 0, 0], ["integration-leasing-platform", "Existing Leasing Platform", "PARTIAL", 982, 3, 5], ["integration-tally", "Tally", "HEALTHY", 426, 0, 0], ["integration-employer-hrms", "Employer HRMS", "PARTIAL", 355, 2, 4], ["integration-gst-einvoicing", "GST/E-invoicing", "HEALTHY", 188, 0, 0], ["integration-bank", "Bank", "HEALTHY", 92, 0, 0], ["integration-oem-vendor", "OEM/Vendor", "FAILED", 0, 6, 8],
  ].map(([id, name, status, accepted, rejected, pending]) => ({ id, name, mode: "MOCK" as const, status: status as PlatformSnapshot["integrations"][number]["status"], lastSyncAt: generatedAt, accepted: Number(accepted), rejected: Number(rejected), pending: Number(pending) })) as PlatformSnapshot["integrations"],
  auditEvents: [
    { id: "audit-01", entityType: "Employer", entityId: "employer-northstar", action: "PROGRAMME_ACTIVATED", actorId: "platform-admin", reason: "Approved programme go-live", occurredAt: "2026-08-01T09:00:00.000Z" },
    { id: "audit-02", entityType: "Application", entityId: "application-01", action: "APPLICATION_APPROVED", actorId: "ops-lead", reason: "Eligibility and exposure checks passed", occurredAt: "2026-08-08T10:30:00.000Z" },
    { id: "audit-03", entityType: "Lease", entityId: "lease-01", action: "LEASE_ACTIVATED", actorId: "portfolio-manager", reason: "Asset delivery accepted", occurredAt: "2026-08-09T14:15:00.000Z" },
  ],
};

export function createPlatformDemoSeed(): PlatformSnapshot {
  return structuredClone(demoSeed);
}
