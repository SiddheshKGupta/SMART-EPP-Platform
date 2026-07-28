import type {
  Actor,
  AuditEvent,
  EmployerProgrammeMappingVersion,
  OemConfiguration,
  PurchaseTransaction,
  PurchaseTransactionInput,
  QuarantinedPurchaseImportRow,
  SchemeVersion,
  SubventionSeed,
} from "@smart-epp/domain";
import { InMemorySubventionRepository } from "./InMemorySubventionRepository";

const DEMO_NOW = "2026-07-28T10:00:00.000Z";

const actors: Actor[] = [
  { userId: "sales-ops-maker", role: "SALES_OPS_MAKER" },
  { userId: "business-head-checker", role: "BUSINESS_HEAD_CHECKER" },
  { userId: "master-data-admin", role: "MASTER_DATA_ADMIN" },
  { userId: "management-viewer", role: "MANAGEMENT_VIEWER" },
  { userId: "audit-reviewer", role: "AUDITOR" },
];

const oems: OemConfiguration[] = [
  {
    id: "oem-apple",
    name: "Apple",
    productIds: ["apple-phone-16", "apple-phone-16-pro"],
  },
  {
    id: "oem-samsung",
    name: "Samsung",
    productIds: ["samsung-galaxy-s25", "samsung-galaxy-fold"],
  },
  {
    id: "oem-google",
    name: "Google",
    productIds: ["google-pixel-10", "google-pixel-10-pro"],
  },
];

function approvedScheme(input: {
  id: string;
  schemeId: string;
  version: number;
  code: string;
  name: string;
  oemId: string;
  productIds: string[];
  effectiveFrom: string;
  effectiveTo: string;
  claimTimelineDays: number;
  rateBps: number;
}): SchemeVersion {
  return {
    id: input.id,
    schemeId: input.schemeId,
    version: input.version,
    code: input.code,
    name: input.name,
    oemId: input.oemId,
    settlementCounterpartyType: "DISTRIBUTOR",
    calculationBasis: "INVOICE_VALUE",
    rateBps: input.rateBps,
    claimTimelineDays: input.claimTimelineDays,
    priority: 10,
    eligibleProductIds: [...input.productIds],
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    requiredDocumentCodes: ["PURCHASE_INVOICE", "LEASE_SCHEDULE"],
    workflowStatus: "APPROVED",
    makerUserId: "master-data-admin",
    checkerUserId: "business-head-checker",
    approvedAt: "2025-12-15T10:00:00.000Z",
    createdAt: "2025-12-01T10:00:00.000Z",
  };
}

const schemes: SchemeVersion[] = [
  approvedScheme({
    id: "scheme-apple-h1-2026",
    schemeId: "scheme-apple-corporate",
    version: 1,
    code: "APL-H1-26",
    name: "Apple Corporate H1 2026",
    oemId: "oem-apple",
    productIds: ["apple-phone-16", "apple-phone-16-pro"],
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-06-30",
    claimTimelineDays: 60,
    rateBps: 325,
  }),
  approvedScheme({
    id: "scheme-apple-h2-2026",
    schemeId: "scheme-apple-corporate",
    version: 2,
    code: "APL-H2-26",
    name: "Apple Corporate H2 2026",
    oemId: "oem-apple",
    productIds: ["apple-phone-16", "apple-phone-16-pro"],
    effectiveFrom: "2026-07-01",
    effectiveTo: "2026-12-31",
    claimTimelineDays: 60,
    rateBps: 350,
  }),
  approvedScheme({
    id: "scheme-samsung-h1-2026",
    schemeId: "scheme-samsung-corporate",
    version: 1,
    code: "SAM-H1-26",
    name: "Samsung Corporate H1 2026",
    oemId: "oem-samsung",
    productIds: ["samsung-galaxy-s25", "samsung-galaxy-fold"],
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-06-30",
    claimTimelineDays: 45,
    rateBps: 300,
  }),
  approvedScheme({
    id: "scheme-samsung-h2-2026",
    schemeId: "scheme-samsung-corporate",
    version: 2,
    code: "SAM-H2-26",
    name: "Samsung Corporate H2 2026",
    oemId: "oem-samsung",
    productIds: ["samsung-galaxy-s25", "samsung-galaxy-fold"],
    effectiveFrom: "2026-07-01",
    effectiveTo: "2026-12-31",
    claimTimelineDays: 45,
    rateBps: 315,
  }),
  approvedScheme({
    id: "scheme-google-h1-2026",
    schemeId: "scheme-google-corporate",
    version: 1,
    code: "GOO-H1-26",
    name: "Google Corporate H1 2026",
    oemId: "oem-google",
    productIds: ["google-pixel-10", "google-pixel-10-pro"],
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-06-30",
    claimTimelineDays: 30,
    rateBps: 275,
  }),
  approvedScheme({
    id: "scheme-google-h2-2026",
    schemeId: "scheme-google-corporate",
    version: 2,
    code: "GOO-H2-26",
    name: "Google Corporate H2 2026",
    oemId: "oem-google",
    productIds: ["google-pixel-10", "google-pixel-10-pro"],
    effectiveFrom: "2026-07-01",
    effectiveTo: "2026-12-31",
    claimTimelineDays: 10,
    rateBps: 290,
  }),
  {
    id: "scheme-version-draft",
    schemeId: "scheme-apple-enterprise-2027",
    version: 1,
    code: "APL-H1-27-DRAFT",
    name: "Apple Enterprise H1 2027",
    oemId: "oem-apple",
    settlementCounterpartyType: "OEM",
    calculationBasis: "BASE_VALUE",
    rateBps: 375,
    claimTimelineDays: 60,
    priority: 20,
    eligibleProductIds: ["apple-phone-16-pro"],
    effectiveFrom: "2027-01-01",
    effectiveTo: "2027-06-30",
    requiredDocumentCodes: ["PURCHASE_INVOICE", "LEASE_SCHEDULE"],
    workflowStatus: "DRAFT",
    makerUserId: "master-data-admin",
    createdAt: "2026-07-25T10:00:00.000Z",
  },
];

function mapping(input: {
  id: string;
  mappingId: string;
  employerId: string;
  programmeId: string;
  oemId: string;
  schemeVersionId: string;
  workflowStatus?: "APPROVED" | "SUBMITTED";
}): EmployerProgrammeMappingVersion {
  const workflowStatus = input.workflowStatus ?? "APPROVED";
  return {
    id: input.id,
    mappingId: input.mappingId,
    version: 1,
    employerId: input.employerId,
    programmeId: input.programmeId,
    oemId: input.oemId,
    schemeVersionId: input.schemeVersionId,
    resellerId: "reseller-national",
    distributorId: "distributor-national",
    launchDate: "2026-07-01",
    effectiveFrom: "2026-07-01",
    effectiveTo: "2026-12-31",
    workflowStatus,
    makerUserId: "master-data-admin",
    checkerUserId:
      workflowStatus === "APPROVED" ? "business-head-checker" : undefined,
    approvedAt:
      workflowStatus === "APPROVED"
        ? "2026-06-20T10:00:00.000Z"
        : undefined,
    createdAt: "2026-06-10T10:00:00.000Z",
  };
}

const programmeMappings: EmployerProgrammeMappingVersion[] = [
  mapping({
    id: "mapping-alpha-apple",
    mappingId: "mapping-alpha-apple",
    employerId: "employer-alpha",
    programmeId: "programme-apple",
    oemId: "oem-apple",
    schemeVersionId: "scheme-apple-h2-2026",
  }),
  mapping({
    id: "mapping-alpha-samsung",
    mappingId: "mapping-alpha-samsung",
    employerId: "employer-alpha",
    programmeId: "programme-samsung",
    oemId: "oem-samsung",
    schemeVersionId: "scheme-samsung-h2-2026",
  }),
  mapping({
    id: "mapping-beta-google",
    mappingId: "mapping-beta-google",
    employerId: "employer-beta",
    programmeId: "programme-google",
    oemId: "oem-google",
    schemeVersionId: "scheme-google-h2-2026",
  }),
  mapping({
    id: "mapping-beta-apple",
    mappingId: "mapping-beta-apple",
    employerId: "employer-beta",
    programmeId: "programme-apple",
    oemId: "oem-apple",
    schemeVersionId: "scheme-apple-h2-2026",
  }),
  mapping({
    id: "mapping-gamma-samsung",
    mappingId: "mapping-gamma-samsung",
    employerId: "employer-gamma",
    programmeId: "programme-samsung",
    oemId: "oem-samsung",
    schemeVersionId: "scheme-samsung-h2-2026",
  }),
  mapping({
    id: "mapping-gamma-google",
    mappingId: "mapping-gamma-google",
    employerId: "employer-gamma",
    programmeId: "programme-google",
    oemId: "oem-google",
    schemeVersionId: "scheme-google-h2-2026",
  }),
  mapping({
    id: "mapping-delta-apple",
    mappingId: "mapping-delta-apple",
    employerId: "employer-delta",
    programmeId: "programme-apple",
    oemId: "oem-apple",
    schemeVersionId: "scheme-apple-h2-2026",
  }),
  mapping({
    id: "mapping-epsilon-samsung-submitted",
    mappingId: "mapping-epsilon-samsung",
    employerId: "employer-epsilon",
    programmeId: "programme-samsung",
    oemId: "oem-samsung",
    schemeVersionId: "scheme-samsung-h2-2026",
    workflowStatus: "SUBMITTED",
  }),
];

function transaction(
  sequence: number,
  overrides: Partial<PurchaseTransaction> = {},
): PurchaseTransaction {
  const suffix = String(sequence).padStart(3, "0");
  return {
    id: `transaction-${suffix}`,
    leaseId: `LEASE-2026-${suffix}`,
    lotId: `LOT-2026-${suffix}`,
    employeeId: `employee-${suffix}`,
    employerId: "employer-alpha",
    programmeId: "programme-apple",
    oemId: "oem-apple",
    productId: "apple-phone-16",
    imei: `35123456789${suffix}0`,
    purchaseOrderNumber: `PO-2026-${suffix}`,
    invoiceNumber: `INV-2026-${suffix}`,
    invoiceDate: "2026-07-15",
    invoiceValuePaise: 8_250_000 + sequence * 10_000,
    baseValuePaise: 7_000_000 + sequence * 10_000,
    gstAmountPaise: 1_250_000,
    resellerId: "reseller-national",
    distributorId: "distributor-national",
    leaseStatus: "ACTIVE",
    sourceSystem: "LMS",
    importedAt: "2026-07-16T06:00:00.000Z",
    ...overrides,
  };
}

const eligibleTransactions = Array.from({ length: 20 }, (_, index) =>
  transaction(index + 1, {
    id: `transaction-eligible-${String(index + 1).padStart(2, "0")}`,
  }),
);
const expiredTransactions = Array.from({ length: 3 }, (_, index) =>
  transaction(index + 21, {
    id: `transaction-expired-${String(index + 1).padStart(2, "0")}`,
    employerId: "employer-beta",
    programmeId: "programme-google",
    oemId: "oem-google",
    productId: "google-pixel-10",
    invoiceDate: "2026-07-01",
  }),
);
const cancelledTransactions = Array.from({ length: 2 }, (_, index) =>
  transaction(index + 24, {
    id: `transaction-cancelled-${String(index + 1).padStart(2, "0")}`,
    leaseStatus: "CANCELLED",
  }),
);
const missingMappingTransactions = Array.from({ length: 2 }, (_, index) =>
  transaction(index + 26, {
    id: `transaction-missing-mapping-${String(index + 1).padStart(2, "0")}`,
    employerId: "employer-unmapped",
  }),
);
const productIneligibleTransactions = Array.from({ length: 2 }, (_, index) =>
  transaction(index + 28, {
    id: `transaction-product-ineligible-${String(index + 1).padStart(2, "0")}`,
    productId: "configured-product-not-covered",
  }),
);
const claimedTransactions = [
  transaction(30, { id: "transaction-claimed-imei" }),
  transaction(31, { id: "transaction-claimed-lease" }),
];
const duplicateImportTransaction = transaction(32, {
  id: "transaction-duplicate-import-01",
  sourceSystem: "CONTROLLED_UPLOAD",
});

const transactions = [
  ...eligibleTransactions,
  ...expiredTransactions,
  ...cancelledTransactions,
  ...missingMappingTransactions,
  ...productIneligibleTransactions,
  ...claimedTransactions,
  duplicateImportTransaction,
];

const duplicateImportInput: PurchaseTransactionInput = {
  leaseId: duplicateImportTransaction.leaseId,
  lotId: "LOT-DUPLICATE-IMPORT",
  employeeId: "employee-duplicate-import",
  employerId: duplicateImportTransaction.employerId,
  programmeId: duplicateImportTransaction.programmeId,
  oemId: duplicateImportTransaction.oemId,
  productId: duplicateImportTransaction.productId,
  imei: duplicateImportTransaction.imei,
  purchaseOrderNumber: "PO-DUPLICATE-IMPORT",
  invoiceNumber: "INV-DUPLICATE-IMPORT",
  invoiceDate: "2026-07-20",
  invoiceValuePaise: 8_500_000,
  baseValuePaise: 7_200_000,
  gstAmountPaise: 1_300_000,
  resellerId: "reseller-national",
  distributorId: "distributor-national",
  leaseStatus: "ACTIVE",
  sourceSystem: "CONTROLLED_UPLOAD",
};

const quarantinedImports: QuarantinedPurchaseImportRow[] = [
  {
    rowNumber: 1,
    input: duplicateImportInput,
    issues: [
      {
        code: "DUPLICATE_IMEI",
        severity: "ERROR",
        entityType: "PurchaseTransaction",
        field: "imei",
        message: `IMEI ${duplicateImportInput.imei} already exists.`,
        recoveryAction: "Remove the duplicate or correct the source transaction.",
      },
      {
        code: "DUPLICATE_LEASE",
        severity: "ERROR",
        entityType: "PurchaseTransaction",
        field: "leaseId",
        message: `Lease ${duplicateImportInput.leaseId} already exists.`,
        recoveryAction: "Remove the duplicate or correct the source transaction.",
      },
    ],
  },
];

let auditSequence = 0;

function historicalAuditEvent(input: {
  entityType: AuditEvent["entityType"];
  entityId: string;
  action: AuditEvent["action"];
  actor: Actor;
  occurredAt: string;
  remarks: string;
}): AuditEvent {
  auditSequence += 1;
  return {
    id: `audit-seed-${String(auditSequence).padStart(3, "0")}`,
    ...input,
  };
}

const auditEvents: AuditEvent[] = [
  ...schemes
    .filter((scheme) => scheme.workflowStatus === "APPROVED")
    .flatMap((scheme) => [
      historicalAuditEvent({
        entityType: "SchemeVersion",
        entityId: scheme.id,
        action: "SCHEME_SUBMITTED",
        actor: actors[2]!,
        occurredAt: "2025-12-10T10:00:00.000Z",
        remarks: "Scheme configuration submitted for approval",
      }),
      historicalAuditEvent({
        entityType: "SchemeVersion",
        entityId: scheme.id,
        action: "SCHEME_APPROVED",
        actor: actors[1]!,
        occurredAt: scheme.approvedAt!,
        remarks: "Scheme configuration reviewed and approved",
      }),
    ]),
  ...programmeMappings.flatMap((programmeMapping) => [
    historicalAuditEvent({
      entityType: "EmployerProgrammeMappingVersion",
      entityId: programmeMapping.id,
      action: "PROGRAMME_MAPPING_SUBMITTED",
      actor: actors[2]!,
      occurredAt: "2026-06-15T10:00:00.000Z",
      remarks: "Programme mapping submitted for approval",
    }),
    ...(programmeMapping.workflowStatus === "APPROVED"
      ? [
          historicalAuditEvent({
            entityType: "EmployerProgrammeMappingVersion" as const,
            entityId: programmeMapping.id,
            action: "PROGRAMME_MAPPING_APPROVED" as const,
            actor: actors[1]!,
            occurredAt: programmeMapping.approvedAt!,
            remarks: "Programme mapping reviewed and approved",
          }),
        ]
      : []),
  ]),
  ...transactions.map((purchase) =>
    historicalAuditEvent({
      entityType: "PurchaseTransaction",
      entityId: purchase.id,
      action: "PURCHASE_IMPORTED",
      actor: actors[0]!,
      occurredAt: purchase.importedAt,
      remarks: "Purchase transaction imported",
    }),
  ),
  historicalAuditEvent({
    entityType: "PurchaseImportRow",
    entityId: "seed-import-row-1",
    action: "PURCHASE_IMPORT_QUARANTINED",
    actor: actors[0]!,
    occurredAt: "2026-07-20T12:00:00.000Z",
    remarks: "Duplicate import row quarantined",
  }),
];

const demoSeed: SubventionSeed = {
  oems,
  schemes,
  programmeMappings,
  transactions,
  eligibilityDecisions: [],
  quarantinedImports,
  auditEvents,
  actors,
  existingClaimedImeis: [claimedTransactions[0]!.imei],
  existingClaimedLeaseIds: [claimedTransactions[1]!.leaseId],
  duplicateImeis: [duplicateImportTransaction.imei],
  duplicateLeaseIds: [duplicateImportTransaction.leaseId],
};

export function createDemoSubventionSeed(): SubventionSeed {
  return structuredClone(demoSeed);
}

export function createDemoSubventionRepository(): InMemorySubventionRepository {
  let sequence = 0;
  return new InMemorySubventionRepository(createDemoSubventionSeed(), {
    now: () => DEMO_NOW,
    nextId: (prefix) =>
      `${prefix}-demo-${String(++sequence).padStart(4, "0")}`,
  });
}
