import { purchaseTransactionInputSchema } from "./schemas";
import { issue, type DomainIssue } from "./issues";
import { resolveProgrammeMapping } from "./programme-mapping";
import type {
  EmployerProgrammeMappingVersion,
  PurchaseTransaction,
  PurchaseTransactionInput,
  SchemeVersion,
} from "./types";

export interface QuarantinedPurchaseImportRow {
  id: string;
  importId: string;
  importedAt: string;
  importedBy: string;
  rowNumber: number;
  sourceChecksum: string;
  sourceSheetName: string;
  sourceRowNumber: number;
  issueCodes: string[];
  input: PurchaseTransactionInput;
  issues: DomainIssue[];
}

export interface ImportResult {
  accepted: PurchaseTransaction[];
  quarantined: QuarantinedPurchaseImportRow[];
}

export interface PurchaseImportContext {
  importId: string;
  importedAt: string;
  importedBy: string;
  idForRow: (rowNumber: number) => string;
  idForQuarantineRow: (rowNumber: number) => string;
  masterData: PurchaseImportMasterData;
  programmeMappings: EmployerProgrammeMappingVersion[];
  schemes: SchemeVersion[];
  existingClaimedDeviceIdentifiers: ReadonlySet<string>;
  existingClaimedLeaseIds: ReadonlySet<string>;
  alternativePartnerDeviceIdentifiers: ReadonlySet<string>;
  alternativePartnerLeaseIds: ReadonlySet<string>;
}

export interface PurchaseImportMasterData {
  employerIds: ReadonlySet<string>;
  programmeIds: ReadonlySet<string>;
  oemIds: ReadonlySet<string>;
  productIds: ReadonlySet<string>;
  productCodesByProductId: ReadonlyMap<string, ReadonlySet<string>>;
  connectLegalEntityIds: ReadonlySet<string>;
  resellerAliases: ReadonlyMap<string, string>;
  distributorAliases: ReadonlyMap<string, string>;
}

function importControlIssues(
  input: PurchaseTransactionInput,
  context: PurchaseImportContext,
): DomainIssue[] {
  const configuredProductCodes =
    context.masterData.productCodesByProductId.get(input.productId);
  const mappingResolution = resolveProgrammeMapping(
    {
      ...input,
      id: `import-preview:${buildPurchaseSourceRowKey(input)}`,
      importedAt: context.importedAt,
    },
    context.programmeMappings,
    context.schemes,
  );

  return [
    context.existingClaimedDeviceIdentifiers.has(input.deviceIdentifier)
      ? quarantineIssue(
          "ALREADY_CLAIMED_DEVICE_IDENTIFIER",
          "deviceIdentifier",
          "The device identifier is already present in an approved claim.",
          "Remove the row or resolve the approved-claim duplication before import.",
        )
      : undefined,
    context.existingClaimedLeaseIds.has(input.leaseId)
      ? quarantineIssue(
          "ALREADY_CLAIMED_LEASE",
          "leaseId",
          "The lease identifier is already present in an approved claim.",
          "Remove the row or resolve the approved-claim duplication before import.",
        )
      : undefined,
    context.alternativePartnerDeviceIdentifiers.has(input.deviceIdentifier)
      ? quarantineIssue(
          "ALTERNATIVE_PARTNER_DEVICE_IDENTIFIER",
          "deviceIdentifier",
          "The device identifier was submitted through another partner.",
          "Resolve partner ownership through an authorised exception before import.",
        )
      : undefined,
    context.alternativePartnerLeaseIds.has(input.leaseId)
      ? quarantineIssue(
          "ALTERNATIVE_PARTNER_LEASE",
          "leaseId",
          "The lease identifier was submitted through another partner.",
          "Resolve partner ownership through an authorised exception before import.",
        )
      : undefined,
    configuredProductCodes?.has(input.productCode)
      ? undefined
      : quarantineIssue(
          "PRODUCT_CODE_MISMATCH",
          "productCode",
          `Product code ${input.productCode} is not configured for product ${input.productId}.`,
          "Correct the product ID/code pair or update approved product configuration.",
        ),
    mappingResolution.status === "RESOLVED"
      ? undefined
      : mappingResolution.issues[0],
  ].flatMap((found) => (found ? [found] : []));
}

export function buildPurchaseSourceRowKey(input: PurchaseTransactionInput): string {
  return JSON.stringify([
    input.sourceEvidence.sourceChecksum,
    input.sourceEvidence.sourceSheetName,
    input.sourceEvidence.sourceRowNumber,
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

function quarantineIssue(
  code: string,
  field: string,
  message: string,
  recoveryAction: string,
): DomainIssue {
  return issue({
    code,
    severity: "ERROR",
    entityType: "PurchaseTransaction",
    field,
    message,
    recoveryAction,
  });
}

function masterIssues(
  input: PurchaseTransactionInput,
  masterData: PurchaseImportMasterData,
): DomainIssue[] {
  const checks: Array<DomainIssue | undefined> = [
    masterData.employerIds.has(input.employerId)
      ? undefined
      : quarantineIssue(
          "UNRESOLVED_EMPLOYER",
          "employerId",
          `Employer ${input.employerId} did not resolve to an approved master.`,
          "Map the source employer label to an approved employer.",
        ),
    masterData.programmeIds.has(input.programmeId)
      ? undefined
      : quarantineIssue(
          "UNRESOLVED_PROGRAMME",
          "programmeId",
          `Programme ${input.programmeId} did not resolve to an approved master.`,
          "Resolve the employer programme before importing the row.",
        ),
    masterData.oemIds.has(input.oemId)
      ? undefined
      : quarantineIssue(
          "UNRESOLVED_OEM",
          "oemId",
          `OEM ${input.oemId} did not resolve to configured master data.`,
          "Resolve the OEM through configured master data.",
        ),
    masterData.productIds.has(input.productId)
      ? undefined
      : quarantineIssue(
          "UNRESOLVED_PRODUCT",
          "productId",
          `Product ${input.productId} did not resolve to an approved master.`,
          "Map the product code to an approved product.",
        ),
    masterData.connectLegalEntityIds.has(input.connectLegalEntityId)
      ? undefined
      : quarantineIssue(
          "UNRESOLVED_CONNECT_LEGAL_ENTITY",
          "connectLegalEntityId",
          `Connect legal entity ${input.connectLegalEntityId} did not resolve.`,
          "Map the source legal-entity label to an approved Connect entity.",
        ),
  ];

  const { reseller, distributor } =
    input.sourceEvidence.counterpartyAliases;
  if (
    reseller &&
    masterData.resellerAliases.get(reseller) !== input.resellerId
  ) {
    checks.push(
      quarantineIssue(
        "UNRESOLVED_COUNTERPARTY_ALIAS",
        "sourceEvidence.counterpartyAliases.reseller",
        `Reseller alias ${reseller} is unresolved or ambiguous.`,
        "Resolve the source reseller alias to one canonical reseller.",
      ),
    );
  }
  if (
    distributor &&
    masterData.distributorAliases.get(distributor) !== input.distributorId
  ) {
    checks.push(
      quarantineIssue(
        "UNRESOLVED_COUNTERPARTY_ALIAS",
        "sourceEvidence.counterpartyAliases.distributor",
        `Distributor alias ${distributor} is unresolved or ambiguous.`,
        "Resolve the source distributor alias to one canonical distributor.",
      ),
    );
  }

  return checks.flatMap((found) => (found ? [found] : []));
}

function validateInput(
  input: PurchaseTransactionInput,
  context: PurchaseImportContext,
): DomainIssue[] {
  const { masterData } = context;
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

  const rowKindIssue =
    input.sourceEvidence?.rowKind === "FORMULA"
      ? quarantineIssue(
          "FORMULA_ROW",
          "sourceEvidence.rowKind",
          "Formula and total rows are control evidence, not transactions.",
          "Classify this workbook row as a formula/control outside the transaction population.",
        )
      : input.sourceEvidence?.rowKind === "CONTROL"
        ? quarantineIssue(
            "CONTROL_ROW",
            "sourceEvidence.rowKind",
            "Workbook control rows cannot be imported as transactions.",
            "Classify this workbook row as a control outside the transaction population.",
          )
        : undefined;
  const zeroValueIssues =
    input.invoiceValuePaise === 0
      ? [inputIssue("invoiceValuePaise", "ZERO_VALUE")]
      : [];
  const resolvedMasterIssues =
    parsed.success && !rowKindIssue ? masterIssues(input, masterData) : [];
  const resolvedControlIssues =
    parsed.success &&
    !rowKindIssue &&
    resolvedMasterIssues.length === 0
      ? importControlIssues(input, context)
      : [];

  return [
    ...schemaIssues,
    ...zeroValueIssues,
    ...(rowKindIssue ? [rowKindIssue] : []),
    ...resolvedMasterIssues,
    ...resolvedControlIssues,
  ];
}

function duplicateIssue(
  code:
    | "DUPLICATE_SOURCE_ROW_KEY"
    | "DUPLICATE_DEVICE_IDENTIFIER"
    | "DUPLICATE_LEASE",
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

  if (code === "DUPLICATE_DEVICE_IDENTIFIER") {
    return issue({
      code,
      severity: "ERROR",
      entityType: "PurchaseTransaction",
      field: "deviceIdentifier",
      message: `Device identifier ${input.deviceIdentifier} already exists.`,
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
  const hasDeviceIdentifier = existing.some(
    (purchase) => purchase.deviceIdentifier === input.deviceIdentifier,
  );
  const hasLease = existing.some(
    (purchase) => purchase.leaseId === input.leaseId,
  );

  return [
    hasSourceRowKey
      ? duplicateIssue("DUPLICATE_SOURCE_ROW_KEY", input)
      : undefined,
    hasDeviceIdentifier
      ? duplicateIssue("DUPLICATE_DEVICE_IDENTIFIER", input)
      : undefined,
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
    const issues = validateInput(input, context);
    const rowIssues =
      issues.length > 0 ? issues : duplicateIssues(workingSet, input);

    if (rowIssues.length > 0) {
      quarantined.push({
        id: context.idForQuarantineRow(rowNumber),
        importId: context.importId,
        importedAt: context.importedAt,
        importedBy: context.importedBy,
        rowNumber,
        sourceChecksum: input.sourceEvidence.sourceChecksum,
        sourceSheetName: input.sourceEvidence.sourceSheetName,
        sourceRowNumber: input.sourceEvidence.sourceRowNumber,
        issueCodes: rowIssues.map((foundIssue) => foundIssue.code),
        input,
        issues: rowIssues,
      });
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
