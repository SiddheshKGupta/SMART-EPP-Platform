import { purchaseTransactionInputSchema } from "./schemas";
import { issue, type DomainIssue } from "./issues";
import type { PurchaseTransaction, PurchaseTransactionInput } from "./types";

export interface QuarantinedPurchaseImportRow {
  rowNumber: number;
  input: PurchaseTransactionInput;
  issues: DomainIssue[];
}

export interface ImportResult {
  accepted: PurchaseTransaction[];
  quarantined: QuarantinedPurchaseImportRow[];
}

export interface PurchaseImportContext {
  importedAt: string;
  idForRow: (rowNumber: number) => string;
}

export function buildPurchaseSourceRowKey(input: PurchaseTransactionInput): string {
  return JSON.stringify([
    input.sourceSystem,
    input.leaseId,
    input.imei,
    input.invoiceNumber,
  ]);
}

function inputIssue(
  field: string,
  code: "MANDATORY_FIELD_MISSING" | "INVALID_INPUT" | "ZERO_VALUE",
): DomainIssue {
  if (code === "MANDATORY_FIELD_MISSING") {
    return issue({
      code,
      severity: "ERROR",
      entityType: "PurchaseTransaction",
      field,
      message: `${field} is required.`,
      recoveryAction: "Provide a value for the mandatory field.",
    });
  }

  if (code === "ZERO_VALUE") {
    return issue({
      code,
      severity: "ERROR",
      entityType: "PurchaseTransaction",
      field,
      message: "Invoice value must be greater than zero.",
      recoveryAction: "Provide a positive invoice value.",
    });
  }

  return issue({
    code,
    severity: "ERROR",
    entityType: "PurchaseTransaction",
    field,
    message: `${field} is invalid.`,
    recoveryAction: "Correct the source transaction value.",
  });
}

function validateInput(input: PurchaseTransactionInput): DomainIssue[] {
  const parsed = purchaseTransactionInputSchema.safeParse(input);
  const schemaIssues = parsed.success
    ? []
    : parsed.error.issues.map((validationIssue) => {
        const field = String(validationIssue.path[0] ?? "row");
        const value = input[field as keyof PurchaseTransactionInput];
        return inputIssue(
          field,
          validationIssue.code === "too_small" && value === ""
            ? "MANDATORY_FIELD_MISSING"
            : "INVALID_INPUT",
        );
      });

  return input.invoiceValuePaise === 0
    ? [...schemaIssues, inputIssue("invoiceValuePaise", "ZERO_VALUE")]
    : schemaIssues;
}

function duplicateIssue(
  code: "DUPLICATE_SOURCE_ROW_KEY" | "DUPLICATE_IMEI" | "DUPLICATE_LEASE",
  input: PurchaseTransactionInput,
): DomainIssue {
  if (code === "DUPLICATE_SOURCE_ROW_KEY") {
    return issue({
      code,
      severity: "ERROR",
      entityType: "PurchaseTransaction",
      field: "sourceRowKey",
      message: `Source row key ${buildPurchaseSourceRowKey(input)} already exists.`,
      recoveryAction: "Remove the duplicate or correct the source transaction.",
    });
  }

  if (code === "DUPLICATE_IMEI") {
    return issue({
      code,
      severity: "ERROR",
      entityType: "PurchaseTransaction",
      field: "imei",
      message: `IMEI ${input.imei} already exists.`,
      recoveryAction: "Remove the duplicate or correct the source transaction.",
    });
  }

  return issue({
    code,
    severity: "ERROR",
    entityType: "PurchaseTransaction",
    field: "leaseId",
    message: `Lease ${input.leaseId} already exists.`,
    recoveryAction: "Remove the duplicate or correct the source transaction.",
  });
}

function duplicateIssues(
  existing: PurchaseTransaction[],
  input: PurchaseTransactionInput,
): DomainIssue[] {
  const sourceRowKey = buildPurchaseSourceRowKey(input);
  const hasSourceRowKey = existing.some(
    (purchase) => buildPurchaseSourceRowKey(purchase) === sourceRowKey,
  );
  const hasImei = existing.some((purchase) => purchase.imei === input.imei);
  const hasLease = existing.some(
    (purchase) => purchase.leaseId === input.leaseId,
  );

  return [
    hasSourceRowKey
      ? duplicateIssue("DUPLICATE_SOURCE_ROW_KEY", input)
      : undefined,
    hasImei ? duplicateIssue("DUPLICATE_IMEI", input) : undefined,
    hasLease ? duplicateIssue("DUPLICATE_LEASE", input) : undefined,
  ].flatMap((found) => (found === undefined ? [] : [found]));
}

export function validatePurchaseImport(
  existing: PurchaseTransaction[],
  rows: PurchaseTransactionInput[],
  context: PurchaseImportContext,
): ImportResult {
  const accepted: PurchaseTransaction[] = [];
  const quarantined: QuarantinedPurchaseImportRow[] = [];
  const workingSet = [...existing];

  rows.forEach((input, index) => {
    const rowNumber = index + 1;
    const issues = validateInput(input);
    const rowIssues =
      issues.length > 0 ? issues : duplicateIssues(workingSet, input);

    if (rowIssues.length > 0) {
      quarantined.push({ rowNumber, input, issues: rowIssues });
      return;
    }

    const transaction: PurchaseTransaction = {
      ...input,
      id: context.idForRow(rowNumber),
      importedAt: context.importedAt,
    };
    accepted.push(transaction);
    workingSet.push(transaction);
  });

  return { accepted, quarantined };
}
