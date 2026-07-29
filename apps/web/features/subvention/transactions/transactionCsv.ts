import type {
  EligibilityDecision,
  PurchaseTransaction,
} from "@smart-epp/domain";

export interface TransactionCsvRecord {
  transaction: PurchaseTransaction;
  decision?: EligibilityDecision;
}

export function escapeCsvCell(
  value: string | number | undefined,
): string {
  const raw = String(value ?? "");
  const safe =
    typeof value === "string" && /^\s*[=+\-@]/.test(raw)
      ? `'${raw}`
      : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

const headers = [
  "Lease ID",
  "Device identifier",
  "Employer",
  "Employee",
  "Connect legal entity",
  "OEM",
  "Product",
  "Product code",
  "Programme",
  "Distributor",
  "Reseller",
  "Purchase order",
  "Invoice",
  "Invoice date",
  "Invoice value paise",
  "Base value paise",
  "GST amount paise",
  "Lease status",
  "Source system",
  "Eligibility status",
  "Filing deadline",
  "Expected amount paise",
] as const;

export function buildTransactionCsv(
  records: TransactionCsvRecord[],
): string {
  const rows: Array<Array<string | number | undefined>> = [
    [...headers],
    ...records.map(({ transaction, decision }) => [
      transaction.leaseId,
      transaction.deviceIdentifier,
      transaction.employerId,
      transaction.employeeId,
      transaction.connectLegalEntityId,
      transaction.oemId,
      transaction.productId,
      transaction.productCode,
      transaction.programmeId,
      transaction.distributorId,
      transaction.resellerId,
      transaction.purchaseOrderNumber,
      transaction.invoiceNumber,
      transaction.invoiceDate,
      transaction.invoiceValuePaise,
      transaction.baseValuePaise,
      transaction.gstAmountPaise,
      transaction.leaseStatus,
      transaction.sourceSystem,
      decision?.status ?? "AWAITING_EVALUATION",
      decision?.filingDeadline,
      decision?.expectedAmountPaise,
    ]),
  ];
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}
