import type {
  Actor,
  AuditEvent,
  EmployerProgrammeMappingVersion,
  MasterCatalogue,
  OemConfiguration,
  PurchaseSourceEvidence,
  PurchaseOrderEvidence,
  PurchaseTransaction,
  PurchaseTransactionInput,
  QuarantinedPurchaseImportRow,
  SchemeVersion,
  SubventionSeed,
  TransactionEvidenceLink,
  VendorInvoiceEvidence,
  EWayBillEvidence,
} from "@smart-epp/domain";
import { evaluateEligibility } from "@smart-epp/domain";
import { InMemorySubventionRepository } from "./InMemorySubventionRepository";

export const DEMO_NOW = "2026-07-28T10:00:00.000Z";

const actors: Actor[] = [
  { userId: "sales-ops-maker", role: "SALES_OPS_MAKER" },
  { userId: "business-head-checker", role: "BUSINESS_HEAD_CHECKER" },
  { userId: "master-data-admin", role: "MASTER_DATA_ADMIN" },
  { userId: "management-viewer", role: "MANAGEMENT_VIEWER" },
  { userId: "audit-reviewer", role: "AUDITOR" },
  { userId: "finance-billing", role: "FINANCE_BILLING" },
  { userId: "finance-receipt", role: "FINANCE_RECEIPT" },
  { userId: "finance-accounts", role: "FINANCE_ACCOUNTS" },
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

const masterTimestamp = "2025-12-01T10:00:00.000Z";
const approvedMasterVersion = (id: string) => ({
  logicalId: id,
  version: 1,
  workflowStatus: "APPROVED" as const,
  effectiveFrom: "2025-01-01",
  effectiveTo: "2026-12-31",
  makerUserId: "master-data-admin",
  checkerUserId: "business-head-checker",
  approvedAt: "2025-12-15T10:00:00.000Z",
  createdAt: masterTimestamp,
  updatedAt: masterTimestamp,
});
const masters: MasterCatalogue = {
  oems: oems.map((oem) => ({
    id: oem.id,
    ...approvedMasterVersion(oem.id),
    kind: "OEM",
    code: oem.id.replace("oem-", "").toLocaleUpperCase("en-IN"),
    name: oem.name,
    defaultClaimTimelineDays: oem.defaults?.claimTimelineDays ?? 90,
    defaultCalculationBasis:
      oem.defaults?.calculationBasis ?? "INVOICE_VALUE",
    defaultSettlementCounterpartyType:
      oem.defaults?.settlementCounterpartyType ?? "DISTRIBUTOR",
    defaultRateBps: oem.defaults?.rateBps,
    defaultFlatAmountPaise: oem.defaults?.flatAmountPaise,
  })),
  distributors: [
    {
      id: "distributor-ingram",
      ...approvedMasterVersion("distributor-ingram"),
      kind: "DISTRIBUTOR",
      code: "INGRAM",
      name: "Ingram Micro India Private Limited",
      oemId: "oem-apple",
    },
    {
      id: "distributor-redington",
      ...approvedMasterVersion("distributor-redington"),
      kind: "DISTRIBUTOR",
      code: "REDINGTON",
      name: "Redington Limited",
      oemId: "oem-apple",
    },
    {
      id: "distributor-national",
      ...approvedMasterVersion("distributor-national"),
      kind: "DISTRIBUTOR",
      code: "NATIONAL-DIST",
      name: "National Distributor",
      oemId: "oem-samsung",
    },
  ],
  resellers: [
    {
      id: "reseller-radius",
      ...approvedMasterVersion("reseller-radius"),
      kind: "RESELLER",
      code: "RADIUS",
      name: "Radius Systems Private Limited",
      oemId: "oem-apple",
      distributorId: "distributor-ingram",
    },
    {
      id: "reseller-national",
      ...approvedMasterVersion("reseller-national"),
      kind: "RESELLER",
      code: "NATIONAL-RESELLER",
      name: "National Reseller",
      oemId: "oem-samsung",
      distributorId: "distributor-national",
    },
    ...[
      ["reseller-fore-excel", "FORE-EXCEL", "Fore Excel Private Limited", "distributor-ingram"],
      ["reseller-bluefin", "BLUEFIN", "Bluefin Unlimited", "distributor-redington"],
      ["reseller-dixit", "DIXIT", "Dixit Infotech Services Private Limited", "distributor-ingram"],
      ["reseller-unicorn-post", "UNICORN-POST", "Unicorn Post Media Solutions Private Limited", "distributor-redington"],
      ["reseller-unicorn-info", "UNICORN-INFO", "Unicorn Infosolutions Private Limited", "distributor-ingram"],
      ["reseller-tortoise", "TORTOISE", "Tortoise System Private Limited", "distributor-ingram"],
    ].map(([id, code, name, distributorId]) => ({
      id: id!,
      ...approvedMasterVersion(id!),
      kind: "RESELLER" as const,
      code: code!,
      name: name!,
      oemId: "oem-apple",
      distributorId: distributorId!,
    })),
  ],
  products: oems.flatMap((oem) =>
    (oem.productIds ?? []).map((productId) => ({
      id: productId,
      ...approvedMasterVersion(productId),
      kind: "PRODUCT" as const,
      code: productId.toLocaleUpperCase("en-IN"),
      name: productId
        .split("-")
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(" "),
      oemId: oem.id,
      model: productId,
    })),
  ),
  employers: [
    ["alpha", "CRISIL Limited"],
    ["beta", "Indus Towers Limited"],
    ["gamma", "One97 Communications Limited"],
    ["delta", "Maruti Suzuki India Limited"],
    ["epsilon", "Nayara Energy Limited"],
  ].map(
    ([employer, legalName]) => ({
      id: `employer-${employer}`,
      ...approvedMasterVersion(`employer-${employer}`),
      kind: "EMPLOYER" as const,
      code: `EMPLOYER-${employer.toLocaleUpperCase("en-IN")}`,
      name: legalName,
      programmeCode: "SMART-EPP",
    }),
  ),
};

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
  calculationBasis?: "INVOICE_VALUE" | "BASE_VALUE";
}): SchemeVersion {
  return {
    id: input.id,
    schemeId: input.schemeId,
    version: input.version,
    code: input.code,
    name: input.name,
    oemId: input.oemId,
    settlementCounterpartyType: "DISTRIBUTOR",
    calculationBasis: input.calculationBasis ?? "INVOICE_VALUE",
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
    rateBps: 300,
    calculationBasis: "INVOICE_VALUE",
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
    rateBps: 250,
    calculationBasis: "BASE_VALUE",
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
    rateBps: 245,
    calculationBasis: "BASE_VALUE",
  }),
  {
    id: "scheme-version-draft",
    schemeId: "scheme-apple-enterprise-2027",
    version: 1,
    code: "APL-CORP-Q3-26",
    name: "Apple Corporate Q3 2026",
    oemId: "oem-apple",
    settlementCounterpartyType: "OEM",
    calculationBasis: "BASE_VALUE",
    rateBps: 275,
    claimTimelineDays: 60,
    priority: 20,
    eligibleProductIds: ["apple-phone-16-pro"],
    effectiveFrom: "2026-07-01",
    effectiveTo: "2026-09-30",
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
  resellerId?: string;
  distributorId?: string;
  workflowStatus?: "APPROVED" | "SUBMITTED";
  overrides?: EmployerProgrammeMappingVersion["overrides"];
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
    resellerId: input.resellerId ?? "reseller-national",
    distributorId: input.distributorId ?? "distributor-national",
    launchDate: "2026-07-01",
    effectiveFrom: "2026-07-01",
    effectiveTo: "2026-12-31",
    overrides: input.overrides,
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
    resellerId: "reseller-radius",
    distributorId: "distributor-ingram",
  }),
  mapping({
    id: "mapping-alpha-apple-redington",
    mappingId: "mapping-alpha-apple-redington",
    employerId: "employer-alpha",
    programmeId: "programme-apple",
    oemId: "oem-apple",
    schemeVersionId: "scheme-apple-h2-2026",
    resellerId: "reseller-radius",
    distributorId: "distributor-redington",
  }),
  ...[
    ["fore-excel", "reseller-fore-excel", "distributor-ingram"],
    ["bluefin", "reseller-bluefin", "distributor-redington"],
    ["dixit", "reseller-dixit", "distributor-ingram"],
    ["unicorn-post", "reseller-unicorn-post", "distributor-redington"],
    ["unicorn-info", "reseller-unicorn-info", "distributor-ingram"],
  ].map(([suffix, resellerId, distributorId]) => mapping({
    id: `mapping-alpha-apple-${suffix}`,
    mappingId: `mapping-alpha-apple-${suffix}`,
    employerId: "employer-alpha",
    programmeId: "programme-apple",
    oemId: "oem-apple",
    schemeVersionId: "scheme-apple-h2-2026",
    resellerId,
    distributorId,
  })),
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
    resellerId: "reseller-radius",
    distributorId: "distributor-ingram",
  }),
  mapping({
    id: "mapping-beta-google-redington",
    mappingId: "mapping-beta-google-redington",
    employerId: "employer-beta",
    programmeId: "programme-google",
    oemId: "oem-google",
    schemeVersionId: "scheme-google-h2-2026",
    resellerId: "reseller-radius",
    distributorId: "distributor-redington",
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
    overrides: {
      calculationBasis: "BASE_VALUE",
      approvalReference: "MARUTI-APPLE-BASE-VALUE-CLAUSE",
    },
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
  const invoiceValuePaise = 8_250_000 + sequence * 10_000;
  const baseValuePaise = 7_000_000 + sequence * 10_000;
  const calculationBasis =
    sequence % 2 === 0 ? "INVOICE_VALUE" : "BASE_VALUE";
  const rateBps = [245, 250, 275, 300, 350][
    (sequence - 1) % 5
  ]!;
  const calculationAmountPaise =
    calculationBasis === "INVOICE_VALUE"
      ? invoiceValuePaise
      : baseValuePaise;
  const distributorIsIngram = sequence % 2 === 1;
  const sourceEvidence: PurchaseSourceEvidence = {
    sourceFileName:
      sequence === 1
        ? "source-purchases-april.xlsx"
        : `synthetic-${distributorIsIngram ? "ingram" : "redington"}-transactions.xlsx`,
    sourceSheetName: distributorIsIngram ? "Approved" : "Current cycle",
    sourceRowNumber: sequence + 10,
    sourceChecksum: `sha256:synthetic-source-${suffix}`,
    rowKind: "TRANSACTION",
    sourceLabels: {
      employer: "Employer Alpha",
      connectLegalEntity:
        sequence % 3 === 0
          ? "Connect Residuary"
          : "Connect Equipment Leasing",
      product: "Phone 16",
      externalOutcome:
        sequence % 11 === 0
          ? "Rejected"
          : sequence % 13 === 0
            ? "Deferred"
            : "Approved",
    },
    counterpartyAliases: {
      reseller:
        sequence % 4 === 0
          ? "Radius Systems Pvt Ltd"
          : "Radius Systems Private Limited",
      distributor: distributorIsIngram ? "Ingram" : "Redington",
    },
    calculationBasis,
    rateBps,
    expectedSubventionPaise: Math.round(
      (calculationAmountPaise * rateBps) / 10_000,
    ),
  };
  return {
    id: `transaction-${suffix}`,
    leaseId: `LES-${1000 + sequence}`,
    lotId: `LOT-2026-${suffix}`,
    employeeId: `employee-${suffix}`,
    employerId: "employer-alpha",
    programmeId: "programme-apple",
    oemId: "oem-apple",
    productId: "apple-phone-16",
    productCode: "APL-PHONE-16",
    connectLegalEntityId:
      sequence % 3 === 0
        ? "connect-residuary"
        : "connect-equipment-leasing",
    deviceIdentifier:
      sequence === 1
        ? "351234567890123"
        : sequence % 6 === 0
          ? `SN-ALPHA-${suffix}`
          : `35987654321${suffix}0`,
    purchaseOrderNumber: `PO-2026-${suffix}`,
    invoiceNumber: `INV-2026-${suffix}`,
    invoiceDate: "2026-07-15",
    invoiceValuePaise,
    baseValuePaise,
    gstAmountPaise: 1_250_000,
    resellerId: "reseller-radius",
    distributorId: distributorIsIngram
      ? "distributor-ingram"
      : "distributor-redington",
    leaseStatus: "ACTIVE",
    sourceSystem: "LMS",
    sourceEvidence,
    importedAt: "2026-07-16T06:00:00.000Z",
    ...overrides,
  };
}

const controlledInvoiceReferences = [
  "FEPL10012",
  "BLUF-000013",
  "SL/203/MAY/25-26",
  "MSDSA2526000456",
  "SC4SA2526000048",
];

const evidenceVendorIds = [
  "reseller-fore-excel",
  "reseller-bluefin",
  "reseller-dixit",
  "reseller-unicorn-post",
  "reseller-unicorn-info",
];

const eligibleTransactions = Array.from({ length: 20 }, (_, index) =>
  transaction(index + 1, {
    id: `transaction-eligible-${String(index + 1).padStart(2, "0")}`,
    ...(evidenceVendorIds[index]
      ? { resellerId: evidenceVendorIds[index] }
      : {}),
    ...(controlledInvoiceReferences[index]
      ? { invoiceNumber: controlledInvoiceReferences[index] }
      : {}),
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
  transaction(30, { id: "transaction-claimed-device" }),
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

function vendorName(vendorId: string): string {
  return masters.resellers.find((vendor) => vendor.id === vendorId)?.name ?? vendorId;
}

const purchaseOrders: PurchaseOrderEvidence[] = transactions.map((purchase) => ({
  id: `evidence-po-${purchase.id}`,
  purchaseOrderNumber: purchase.purchaseOrderNumber,
  employerId: purchase.employerId,
  programmeId: purchase.programmeId,
  vendorId: purchase.resellerId,
  settlementCounterpartyId: purchase.distributorId ?? purchase.resellerId,
  oemId: purchase.oemId,
  productId: purchase.productId,
  orderDate: purchase.invoiceDate,
  approvedAmountPaise: purchase.invoiceValuePaise,
  quantity: 1,
  approvalStatus: "APPROVED",
  platformProviderId: "platform-tortoise",
  source: "CONTROLLED_UPLOAD",
}));

const vendorInvoices: VendorInvoiceEvidence[] = transactions.map((purchase, index) => {
  const invoiceNumber = controlledInvoiceReferences[index] ?? purchase.invoiceNumber;
  const isDixit = index === 2;
  const isBillToShipTo = [
    "reseller-dixit",
    "reseller-unicorn-post",
    "reseller-unicorn-info",
  ].includes(purchase.resellerId);
  return {
    id: `evidence-invoice-${purchase.id}`,
    sourceFileName: `${invoiceNumber.replace(/\//g, "-")}_document.pdf`,
    sourceChecksum: `sha256:evidence-${purchase.id}`,
    templateVersionId: `template-${purchase.resellerId}-v1`,
    documentType: "TAX_INVOICE",
    vendorId: purchase.resellerId,
    vendorLegalName: vendorName(purchase.resellerId),
    invoiceNumber,
    invoiceDate: purchase.invoiceDate,
    purchaseOrderNumber: purchase.purchaseOrderNumber,
    resolvedPurchaseOrderId: `evidence-po-${purchase.id}`,
    employerId: purchase.employerId,
    programmeId: purchase.programmeId,
    supplierGstin: `27GSTIN${String(index + 1).padStart(8, "0")}`,
    billToGstin: "27AAECC0000A1Z0",
    shipToGstin: isBillToShipTo ? `07AAACE${String(index + 1).padStart(4, "0")}A1Z1` : undefined,
    supplyRoute: isBillToShipTo ? "BILL_TO_SHIP_TO" : "NORMAL_SUPPLY",
    irn: `irn-${purchase.id}`,
    deliveryNoteNumber: isDixit ? "255/MAY/25-26/DC" : undefined,
    totalValuePaise: purchase.invoiceValuePaise,
    recognitionConfidence: 0.98,
    recognitionStatus: "COMMITTED",
    validationState: "COMMITTED",
    requiresIrn: true,
    requiresEWayBill: true,
    lines: [{
      id: `evidence-line-${purchase.id}`,
      productText: purchase.productCode,
      productId: purchase.productId,
      deviceIdentifiers: [purchase.deviceIdentifier],
      hsnOrSac: "85171300",
      classification: "ELIGIBLE_DEVICE",
      quantity: 1,
      baseValuePaise: purchase.baseValuePaise,
      taxableValuePaise: purchase.baseValuePaise,
      taxAmountPaise: purchase.gstAmountPaise,
      totalValuePaise: purchase.invoiceValuePaise,
    }],
    importedAt: purchase.importedAt,
    importedBy: "sales-ops-maker",
  };
});

const eWayBills: EWayBillEvidence[] = vendorInvoices
  .filter((_, index) => index !== 19)
  .map((invoice, index) => {
    const isDixit = invoice.vendorId === "reseller-dixit";
    const isPartAOnly = invoice.vendorId === "reseller-bluefin";
    return {
      id: `evidence-eway-${invoice.id}`,
      eWayBillNumber: `EWB-${String(index + 1).padStart(6, "0")}`,
      documentNumber: isDixit ? invoice.deliveryNoteNumber! : invoice.invoiceNumber,
      documentDate: invoice.invoiceDate,
      supplierGstin: invoice.supplierGstin,
      recipientGstin: invoice.supplyRoute === "BILL_TO_SHIP_TO"
        ? invoice.shipToGstin!
        : invoice.billToGstin,
      transactionType: invoice.supplyRoute ?? "NORMAL_SUPPLY",
      hsnOrSac: invoice.lines[0]!.hsnOrSac,
      valuePaise: invoice.totalValuePaise,
      irn: invoice.irn,
      partBPresent: !isPartAOnly,
      movementValid: !isPartAOnly,
      linkMode: isDixit ? "DELIVERY_NOTE" : "INVOICE_NUMBER",
    };
  });

const evidenceLinks: TransactionEvidenceLink[] = transactions.map((purchase, index) => {
  const invoice = vendorInvoices[index]!;
  const eWayBill = eWayBills.find((bill) => bill.id === `evidence-eway-${invoice.id}`);
  return {
    transactionId: purchase.id,
    purchaseOrder: purchaseOrders[index]!,
    invoice,
    invoiceLineId: invoice.lines[0]!.id,
    deviceIdentifier: purchase.deviceIdentifier,
    eWayBill,
    valueTolerancePaise: 100,
    linkedAt: purchase.importedAt,
    linkedBy: "sales-ops-maker",
  };
});

const tortoiseProtectionPo: PurchaseOrderEvidence = {
  ...purchaseOrders[0]!,
  id: "evidence-po-tortoise-protection",
  purchaseOrderNumber: "PO-PROTECTION-0001",
  vendorId: "reseller-tortoise",
  approvedAmountPaise: 149_900,
};
const tortoiseProtectionInvoice: VendorInvoiceEvidence = {
  ...vendorInvoices[0]!,
  id: "evidence-invoice-tortoise-protection",
  sourceFileName: "TS-LS-HR-2025-2026-000398.pdf",
  sourceChecksum: "sha256:tortoise-protection-000398",
  templateVersionId: "template-tortoise-protection-v1",
  documentType: "PROTECTION_INVOICE",
  vendorId: "reseller-tortoise",
  vendorLegalName: "Tortoise System Private Limited",
  invoiceNumber: "TS/LS/HR/2025-2026/000398",
  purchaseOrderNumber: tortoiseProtectionPo.purchaseOrderNumber,
  resolvedPurchaseOrderId: tortoiseProtectionPo.id,
  totalValuePaise: 149_900,
  requiresEWayBill: false,
  lines: [{
    id: "evidence-line-tortoise-protection",
    productText: "OneAssist damage and theft protection plan",
    productId: undefined,
    deviceIdentifiers: [transactions[0]!.deviceIdentifier],
    hsnOrSac: "999799",
    classification: "LINKED_SERVICE",
    quantity: 1,
    baseValuePaise: 127_034,
    taxableValuePaise: 127_034,
    taxAmountPaise: 22_866,
    totalValuePaise: 149_900,
  }],
};
purchaseOrders.push(tortoiseProtectionPo);
vendorInvoices.push(tortoiseProtectionInvoice);
evidenceLinks.push({
  transactionId: transactions[0]!.id,
  purchaseOrder: tortoiseProtectionPo,
  invoice: tortoiseProtectionInvoice,
  invoiceLineId: tortoiseProtectionInvoice.lines[0]!.id,
  deviceIdentifier: transactions[0]!.deviceIdentifier,
  valueTolerancePaise: 100,
  linkedAt: transactions[0]!.importedAt,
  linkedBy: "sales-ops-maker",
});

const eligibilityDecisions = eligibleTransactions.slice(0, 12).map((purchase, index) =>
  evaluateEligibility({
    transaction: purchase,
    schemes,
    mappings: programmeMappings,
    oemDefaults: oems.find((oem) => oem.id === purchase.oemId)?.defaults,
    duplicateDeviceIdentifiers: new Set(),
    duplicateLeaseIds: new Set(),
    existingClaimedDeviceIdentifiers: new Set(),
    existingClaimedLeaseIds: new Set(),
    evaluationDate: DEMO_NOW.slice(0, 10),
    evaluatedAt: DEMO_NOW,
    actor: actors[0]!,
    decisionId: `eligibility-seed-${String(index + 1).padStart(3, "0")}`,
    version: 1,
  }),
);

const duplicateImportInput: PurchaseTransactionInput = {
  leaseId: duplicateImportTransaction.leaseId,
  lotId: "LOT-DUPLICATE-IMPORT",
  employeeId: "employee-duplicate-import",
  employerId: duplicateImportTransaction.employerId,
  programmeId: duplicateImportTransaction.programmeId,
  oemId: duplicateImportTransaction.oemId,
  productId: duplicateImportTransaction.productId,
  productCode: duplicateImportTransaction.productCode,
  connectLegalEntityId: duplicateImportTransaction.connectLegalEntityId,
  deviceIdentifier: duplicateImportTransaction.deviceIdentifier,
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
  sourceEvidence: {
    ...duplicateImportTransaction.sourceEvidence,
    sourceFileName: "synthetic-import-controls.xlsx",
    sourceChecksum: "sha256:synthetic-duplicate-row",
    sourceRowNumber: 4,
  },
};

const quarantinedImports: QuarantinedPurchaseImportRow[] = [
  {
    id: "seed-import-row-1",
    importId: "seed-import-1",
    importedAt: "2026-07-20T12:00:00.000Z",
    importedBy: actors[0]!.userId,
    rowNumber: 1,
    sourceChecksum:
      duplicateImportInput.sourceEvidence.sourceChecksum,
    sourceSheetName:
      duplicateImportInput.sourceEvidence.sourceSheetName,
    sourceRowNumber:
      duplicateImportInput.sourceEvidence.sourceRowNumber,
    issueCodes: [
      "DUPLICATE_DEVICE_IDENTIFIER",
      "DUPLICATE_LEASE",
    ],
    input: duplicateImportInput,
    issues: [
      {
        code: "DUPLICATE_DEVICE_IDENTIFIER",
        severity: "ERROR",
        entityType: "PurchaseTransaction",
        field: "deviceIdentifier",
        message: `Device identifier ${duplicateImportInput.deviceIdentifier} already exists.`,
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
  beforeState?: unknown | null;
  afterState?: unknown | null;
  provenance?: AuditEvent["provenance"];
  metadata?: Record<string, unknown>;
}): AuditEvent {
  auditSequence += 1;
  return {
    id: `audit-seed-${String(auditSequence).padStart(3, "0")}`,
    beforeState: input.beforeState ?? null,
    afterState: input.afterState ?? null,
    provenance:
      input.provenance ??
      {
        source: "SEED_HISTORY",
        sourceEntityId: input.entityId,
      },
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
        beforeState: {
          ...scheme,
          workflowStatus: "DRAFT",
          checkerUserId: undefined,
          approvedAt: undefined,
        },
        afterState: {
          ...scheme,
          workflowStatus: "SUBMITTED",
          checkerUserId: undefined,
          approvedAt: undefined,
        },
      }),
      historicalAuditEvent({
        entityType: "SchemeVersion",
        entityId: scheme.id,
        action: "SCHEME_APPROVED",
        actor: actors[1]!,
        occurredAt: scheme.approvedAt!,
        remarks: "Scheme configuration reviewed and approved",
        beforeState: {
          ...scheme,
          workflowStatus: "SUBMITTED",
          checkerUserId: undefined,
          approvedAt: undefined,
        },
        afterState: scheme,
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
      beforeState: {
        ...programmeMapping,
        workflowStatus: "DRAFT",
        checkerUserId: undefined,
        approvedAt: undefined,
      },
      afterState: {
        ...programmeMapping,
        workflowStatus: "SUBMITTED",
        checkerUserId: undefined,
        approvedAt: undefined,
      },
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
            beforeState: {
              ...programmeMapping,
              workflowStatus: "SUBMITTED",
              checkerUserId: undefined,
              approvedAt: undefined,
            },
            afterState: programmeMapping,
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
      beforeState: null,
      afterState: purchase,
      provenance: {
        source: "PURCHASE_SOURCE_EVIDENCE",
        sourceEntityId: purchase.id,
        sourceChecksum: purchase.sourceEvidence.sourceChecksum,
        sourceSheetName: purchase.sourceEvidence.sourceSheetName,
        sourceRowNumber: purchase.sourceEvidence.sourceRowNumber,
      },
    }),
  ),
  ...eligibilityDecisions.map((decision) =>
    historicalAuditEvent({
      entityType: "EligibilityDecision",
      entityId: decision.id,
      action: "ELIGIBILITY_EVALUATED",
      actor: actors[0]!,
      occurredAt: decision.evaluatedAt,
      remarks: "Seeded persisted eligibility decision",
      beforeState: null,
      afterState: decision,
      provenance: {
        source: "SEED_HISTORY",
        sourceEntityId: decision.transactionId,
      },
    }),
  ),
  historicalAuditEvent({
    entityType: "PurchaseImportRow",
    entityId: "seed-import-row-1",
    action: "PURCHASE_IMPORT_QUARANTINED",
    actor: actors[0]!,
    occurredAt: "2026-07-20T12:00:00.000Z",
    remarks: "Duplicate import row quarantined",
    beforeState: null,
    afterState: quarantinedImports[0],
    provenance: {
      source: "PURCHASE_SOURCE_EVIDENCE",
      sourceEntityId: "seed-import-row-1",
      sourceChecksum:
        duplicateImportInput.sourceEvidence.sourceChecksum,
      sourceSheetName:
        duplicateImportInput.sourceEvidence.sourceSheetName,
      sourceRowNumber:
        duplicateImportInput.sourceEvidence.sourceRowNumber,
    },
    metadata: {
      importId: "seed-import-1",
      rowNumber: 1,
      sourceChecksum:
        duplicateImportInput.sourceEvidence.sourceChecksum,
      sourceSheetName:
        duplicateImportInput.sourceEvidence.sourceSheetName,
      sourceRowNumber:
        duplicateImportInput.sourceEvidence.sourceRowNumber,
      issueCodes: [
        "DUPLICATE_DEVICE_IDENTIFIER",
        "DUPLICATE_LEASE",
      ],
    },
  }),
];

const demoSeed: SubventionSeed = {
  masters,
  oems,
  schemes,
  programmeMappings,
  transactions,
  eligibilityDecisions,
  claimBatches: [],
  purchaseOrders,
  vendorInvoices,
  eWayBills,
  evidenceLinks,
  quarantinedImports,
  auditEvents,
  actors,
  purchaseImportMasterData: {
    employerIds: new Set([
      "employer-alpha",
      "employer-beta",
      "employer-gamma",
      "employer-delta",
      "employer-epsilon",
    ]),
    programmeIds: new Set([
      "programme-apple",
      "programme-samsung",
      "programme-google",
    ]),
    oemIds: new Set(oems.map((oem) => oem.id)),
    productIds: new Set(oems.flatMap((oem) => oem.productIds ?? [])),
    productCodesByProductId: new Map([
      ["apple-phone-16", new Set(["APL-PHONE-16"])],
      ["apple-phone-16-pro", new Set(["APL-PHONE-16-PRO"])],
      ["samsung-galaxy-s25", new Set(["SAM-GALAXY-S25"])],
      ["samsung-galaxy-fold", new Set(["SAM-GALAXY-FOLD"])],
      ["google-pixel-10", new Set(["GOO-PIXEL-10"])],
      ["google-pixel-10-pro", new Set(["GOO-PIXEL-10-PRO"])],
    ]),
    connectLegalEntityIds: new Set([
      "connect-equipment-leasing",
      "connect-residuary",
    ]),
    resellerAliases: new Map([
      ["Radius Systems Private Limited", "reseller-radius"],
      ["Radius Systems Pvt Ltd", "reseller-radius"],
      ["National Reseller", "reseller-national"],
    ]),
    distributorAliases: new Map([
      ["Ingram", "distributor-ingram"],
      ["Redington", "distributor-redington"],
      ["National Distributor", "distributor-national"],
    ]),
  },
  existingClaimedDeviceIdentifiers: [
    claimedTransactions[0]!.deviceIdentifier,
  ],
  existingClaimedLeaseIds: [claimedTransactions[1]!.leaseId],
  alternativePartnerDeviceIdentifiers: [],
  alternativePartnerLeaseIds: [],
  duplicateDeviceIdentifiers: [
    duplicateImportTransaction.deviceIdentifier,
  ],
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
