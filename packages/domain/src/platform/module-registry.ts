export type PlatformModuleKey =
  | "COMMAND_CENTRE"
  | "WORKBENCH"
  | "EMPLOYER_PROGRAMMES"
  | "EMPLOYEES"
  | "APPLICATIONS_ELIGIBILITY"
  | "ASSETS_PARTNERS"
  | "ORDERS_APPROVALS"
  | "LEASES_PORTFOLIO"
  | "BILLING_COLLECTIONS"
  | "SUBVENTION"
  | "FORECLOSURE"
  | "DOCUMENTS_EVIDENCE"
  | "EXCEPTIONS_RECONCILIATIONS"
  | "REPORTS_MIS"
  | "ADMIN";

export interface PlatformSubmoduleDefinition {
  key: string;
  label: string;
  slug: string;
  description: string;
  demoOnly?: boolean;
}

export interface PlatformModuleDefinition {
  key: PlatformModuleKey;
  label: string;
  slug: string;
  description: string;
  icon: string;
  submodules: readonly PlatformSubmoduleDefinition[];
}

type SubmoduleInput = readonly [slug: string, label: string];

const submodules = (
  items: readonly SubmoduleInput[],
  demoOnlySlug?: string,
): readonly PlatformSubmoduleDefinition[] =>
  items.map(([slug, label]) => ({
    key: slug.toUpperCase().replace(/-/g, "_"),
    label,
    slug,
    description: `Workspace for ${label.toLowerCase()}.`,
    ...(slug === demoOnlySlug ? { demoOnly: true } : {}),
  }));

const defineModule = (
  key: PlatformModuleKey,
  label: string,
  slug: string,
  description: string,
  icon: string,
  items: readonly SubmoduleInput[],
  demoOnlySlug?: string,
): PlatformModuleDefinition => ({
  key,
  label,
  slug,
  description,
  icon,
  submodules: submodules(items, demoOnlySlug),
});

export const PLATFORM_MODULES: readonly PlatformModuleDefinition[] = [
  defineModule("COMMAND_CENTRE", "Command Centre", "command-centre", "Management and operational oversight.", "layout-dashboard", [["executive-overview", "Executive Overview"], ["operations-overview", "Operations Overview"], ["portfolio-health", "Portfolio Health"], ["exposure-utilisation", "Exposure and Utilisation"], ["financial-snapshot", "Financial Snapshot"], ["sla-ageing", "SLA and Ageing"], ["control-alerts", "Exceptions and Control Alerts"], ["integration-health", "Integration Health"], ["guided-demo", "Guided Demo Journey"]]),
  defineModule("WORKBENCH", "Workbench", "workbench", "Personal and team operational work queues.", "inbox", [["my-tasks", "My Tasks"], ["my-approvals", "My Approvals"], ["my-exceptions", "My Exceptions"], ["team-queues", "Team Queues"], ["unassigned-work", "Unassigned Work"], ["notifications", "Notifications"], ["escalations", "Escalations"], ["delegations", "Delegations"], ["recently-viewed", "Recently Viewed"]]),
  defineModule("EMPLOYER_PROGRAMMES", "Employer Programmes", "programmes", "Employer programme lifecycle management.", "briefcase-business", [["leads", "Leads and Prospects"], ["requirements", "Requirement Capture"], ["commercials", "Commercial Structuring"], ["proposal-closure", "Proposal and Closure"], ["credit-handoff", "Credit Handoff"], ["legal-mla", "Legal and MLA Coordination"], ["readiness", "Programme Readiness"], ["governance", "Governance Setup"], ["platform-onboarding", "Platform Onboarding"], ["bre-alignment", "BRE Alignment"], ["hrms-integration", "HRMS Integration"], ["uat-go-live", "UAT and Go-Live"], ["performance", "Programme Performance"], ["amendments-closure", "Programme Amendments and Closure"]]),
  defineModule("EMPLOYEES", "Employees", "employees", "Employee enrolment, status and eligibility information.", "users", [["master", "Employee Master"], ["enrolment", "Employee Enrolment"], ["bulk-imports", "Bulk Imports"], ["programme-mapping", "Programme Mapping"], ["employment-payroll", "Employment and Payroll Status"], ["eligibility-profile", "Eligibility Profile"], ["documents-consent", "Employee Documents and Consent"], ["asset-lease-history", "Asset and Lease History"], ["employment-changes", "Employment Changes"], ["separation-feed", "Separation Feed"]]),
  defineModule("APPLICATIONS_ELIGIBILITY", "Applications & Eligibility", "applications", "Application assessment and decisioning.", "file-check", [["new", "New Applications"], ["register", "Application Register"], ["evidence", "Evidence Capture"], ["eligibility", "Eligibility Assessment"], ["credit", "Credit Assessment"], ["exposure-reservation", "Exposure Reservation"], ["bre-results", "BRE Results"], ["manual-review", "Manual Review"], ["approval-routing", "Approval Routing"], ["rejections-returns", "Rejections and Returns"], ["decision-history", "Decision History"], ["exposure-lifecycle", "Reservation, Utilisation and Release"]]),
  defineModule("ASSETS_PARTNERS", "Assets, Vendors & OEMs", "assets", "Asset, vendor and OEM master operations.", "package", [["oems", "OEM Master"], ["national-distributors", "National Distributor Master"], ["resellers", "Reseller Master"], ["vendors", "Vendor Master"], ["product-catalogue", "Product Catalogue"], ["asset-registry", "Device and Asset Registry"], ["device-identifiers", "Serial/IMEI Identification"], ["scheme-catalogue", "Scheme Catalogue"], ["pricing", "Product Pricing"], ["gst-location-mapping", "Location and GST Mapping"], ["vendor-performance", "Vendor Performance"], ["ownership-history", "Asset Status and Ownership History"]]),
  defineModule("ORDERS_APPROVALS", "Orders & Approvals", "orders", "Order execution and approval management.", "shopping-cart", [["quotations", "Quotations"], ["requests", "Order Requests"], ["register", "Order Register"], ["purchase-orders", "Purchase Orders"], ["vendor-invoices", "Vendor Invoices"], ["eway-bills", "E-way Bill Evidence"], ["approval-queues", "Approval Queues"], ["fulfilment-delivery", "Fulfilment and Delivery"], ["employee-acceptance", "Employee Acceptance"], ["cancellations-returns", "Cancellations and Returns"], ["lease-handoff", "Lease-Execution Handoff"], ["handoff-acknowledgements", "Handoff Acknowledgements"]]),
  defineModule("LEASES_PORTFOLIO", "Leases, Lots & Portfolio", "portfolio", "Lease and portfolio administration.", "landmark", [["leases", "Lease Register"], ["lots", "Lot Register"], ["activation", "Lease Activation"], ["asset-assignment", "Asset Assignment"], ["rental-schedules", "Rental Schedules"], ["residual-value", "Residual Value"], ["sanction-utilisation", "Sanction and Exposure Utilisation"], ["portfolio-movements", "Portfolio Movements"], ["amendments", "Lease Amendments"], ["milestones", "Lease Milestones"], ["external-sync", "External Platform Synchronisation"], ["reconciliation", "Portfolio Reconciliation"]]),
  defineModule("BILLING_COLLECTIONS", "Billing & Collections", "billing", "Billing, receivables and collection operations.", "receipt", [["schedules", "Billing Schedules"], ["invoices", "Invoice Register"], ["tax-gst-irn", "Tax, GST and IRN"], ["receivables", "Receivables"], ["collection-queue", "Collection Work Queue"], ["receipts", "Receipt Capture"], ["allocation", "Receipt Allocation"], ["credit-debit-notes", "Credit and Debit Notes"], ["ageing-follow-up", "Ageing and Follow-up"], ["bank-reconciliation", "Bank Reconciliation"], ["accounting-events", "Accounting Events"], ["tally-handoff", "Tally Handoff and Status"]]),
  defineModule("SUBVENTION", "Subvention", "subvention", "Subvention claim and settlement operations.", "badge-indian-rupee", [["control-desk", "Control Desk"], ["schemes", "Scheme Versions"], ["programme-mappings", "Employer Programme Mappings"], ["purchase-repository", "Purchase Repository"], ["import-quarantine", "Import and Quarantine"], ["purchase-evidence", "Purchase Evidence"], ["eligibility", "Eligibility Operations"], ["claim-preparation", "Claim Preparation"], ["claim-batching", "Claim Batching"], ["maker-checker", "Maker-Checker Review"], ["oem-submission", "OEM Submission"], ["oem-response", "OEM Response"], ["claim-reconciliation", "Claim Reconciliation"], ["rejections", "Rejections"], ["representation", "Representation"], ["invoicing", "Subvention Invoicing"], ["receipts-allocation", "Receipts and Allocation"], ["accounting-closure", "Accounting and Closure"], ["mis", "Subvention MIS"]]),
  defineModule("FORECLOSURE", "Foreclosure", "foreclosure", "Foreclosure case administration and closure.", "circle-dollar-sign", [["intake", "Foreclosure Intake"], ["bulk-intake", "Bulk Intake"], ["master-file-flagging", "Master File Flagging"], ["billing-treatment", "Billing Treatment"], ["computation", "Foreclosure Computation"], ["maker-submission", "Maker Submission"], ["checker-validation", "Checker Validation"], ["tax-signoff", "Tax Sign-off"], ["invoice-dispatch", "Invoice Dispatch"], ["payment-confirmation", "Payment Confirmation"], ["settlement-letter", "Settlement Letter"], ["case-closure", "Case Closure"], ["tracker", "Foreclosure Tracker"], ["mis", "Foreclosure MIS"]]),
  defineModule("DOCUMENTS_EVIDENCE", "Documents & Evidence", "documents", "Document and evidence control.", "folder-open", [["repository", "Central Repository"], ["checklists", "Document Checklists"], ["types", "Document Types"], ["evidence-links", "Evidence Links"], ["version-history", "Version History"], ["missing-documents", "Missing Documents"], ["expiry-monitoring", "Expiry Monitoring"], ["verification-queue", "Verification Queue"], ["templates", "Templates"], ["correspondence", "Correspondence Archive"], ["access-history", "Access and Download History"]]),
  defineModule("EXCEPTIONS_RECONCILIATIONS", "Exceptions & Reconciliations", "exceptions", "Exception management and reconciliation controls.", "triangle-alert", [["inbox", "Exception Inbox"], ["data-quality", "Data-Quality Exceptions"], ["import-quarantine", "Import Quarantine"], ["duplicate-conflicts", "Duplicate Conflicts"], ["rule-failures", "Rule Failures"], ["sla-breaches", "SLA Breaches"], ["reconciliation-breaks", "Reconciliation Breaks"], ["approval-deviations", "Approval Deviations"], ["manual-overrides", "Manual Overrides"], ["remediation", "Remediation Tracker"], ["root-cause", "Root-Cause Analysis"], ["closure", "Exception Closure"]]),
  defineModule("REPORTS_MIS", "Reports & MIS", "reports", "Management, operational and audit reporting.", "chart-column", [["management", "Management Dashboard"], ["operations", "Operational MIS"], ["programmes", "Employer Programme MIS"], ["employees-applications", "Employee and Application MIS"], ["portfolio-leases", "Portfolio and Lease MIS"], ["exposure-sanction", "Exposure and Sanction MIS"], ["billing-collections", "Billing and Collection MIS"], ["subvention", "Subvention MIS"], ["foreclosure", "Foreclosure MIS"], ["exceptions-sla", "Exception and SLA MIS"], ["audit-controls", "Audit and Control MIS"], ["scheduled", "Scheduled Reports"], ["exports", "Export Centre"]]),
  defineModule("ADMIN", "Admin", "admin", "Platform administration and configuration.", "settings", [["iam", "IAM"], ["masters", "Masters"], ["bre-engine", "BRE Engine"], ["workflow-configuration", "Workflow Configuration"], ["integrations", "Integrations"], ["audit-logs", "Audit & System Logs"], ["platform-settings", "Platform Settings"]], "integrations"),
];

export const moduleBySlug = (slug: string): PlatformModuleDefinition | undefined =>
  PLATFORM_MODULES.find((item) => item.slug === slug);

export const submoduleByPath = (
  moduleSlug: string,
  segments: readonly string[],
): PlatformSubmoduleDefinition | undefined =>
  segments.length === 1
    ? moduleBySlug(moduleSlug)?.submodules.find((item) => item.slug === segments[0])
    : undefined;
