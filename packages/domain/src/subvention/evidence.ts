export type EvidenceSource = "CONTROLLED_UPLOAD" | "LMS" | "PLATFORM_REPORT";

export type PurchaseOrderApprovalStatus = "DRAFT" | "APPROVED" | "CANCELLED";

export interface PurchaseOrderEvidence {
  id: string;
  purchaseOrderNumber: string;
  employerId: string;
  programmeId: string;
  vendorId: string;
  settlementCounterpartyId: string;
  oemId: string;
  productId: string;
  orderDate: string;
  approvedAmountPaise: number;
  quantity: number;
  approvalStatus: PurchaseOrderApprovalStatus;
  platformProviderId?: string;
  source: EvidenceSource;
}

export type InvoiceLineClassification =
  | "ELIGIBLE_DEVICE"
  | "LINKED_SERVICE"
  | "INELIGIBLE";

export interface InvoiceLineEvidence {
  id: string;
  productText: string;
  productId?: string;
  deviceIdentifiers: string[];
  hsnOrSac: string;
  classification: InvoiceLineClassification;
  quantity: number;
  baseValuePaise: number;
  taxableValuePaise: number;
  taxAmountPaise: number;
  totalValuePaise: number;
}

export type InvoiceValidationState =
  | "RECEIVED"
  | "RECOGNISED"
  | "COMMITTED"
  | "EXCEPTION";

export type InvoiceSupplyRoute = "NORMAL_SUPPLY" | "BILL_TO_SHIP_TO";

export interface VendorInvoiceEvidence {
  id: string;
  readonly sourceFileName: string;
  readonly sourceChecksum: string;
  readonly templateVersionId: string;
  documentType: "TAX_INVOICE" | "PROTECTION_INVOICE" | "CREDIT_NOTE";
  vendorId: string;
  vendorLegalName: string;
  invoiceNumber: string;
  invoiceDate: string;
  purchaseOrderNumber: string;
  resolvedPurchaseOrderId?: string;
  employerId: string;
  programmeId: string;
  supplierGstin: string;
  billToGstin: string;
  shipToGstin?: string;
  supplyRoute?: InvoiceSupplyRoute;
  irn?: string;
  deliveryNoteNumber?: string;
  totalValuePaise: number;
  recognitionConfidence: number;
  readonly recognitionStatus?: InvoiceValidationState;
  /** @deprecated Use recognitionStatus. Retained while stored prototype data migrates. */
  validationState: InvoiceValidationState;
  requiresIrn: boolean;
  requiresEWayBill: boolean;
  lines: InvoiceLineEvidence[];
  readonly importedAt: string;
  readonly importedBy: string;
}

export type MovementDocumentLinkMode = "INVOICE_NUMBER" | "DELIVERY_NOTE";

export interface EWayBillEvidence {
  id: string;
  eWayBillNumber: string;
  documentNumber: string;
  documentDate: string;
  supplierGstin: string;
  recipientGstin: string;
  transactionType?: InvoiceSupplyRoute;
  hsnOrSac: string;
  valuePaise: number;
  irn?: string;
  partBPresent: boolean;
  movementValid: boolean;
  linkMode: MovementDocumentLinkMode;
}

export interface TransactionEvidenceLink {
  transactionId: string;
  purchaseOrder: PurchaseOrderEvidence;
  invoice: VendorInvoiceEvidence;
  invoiceLineId: string;
  deviceIdentifier?: string;
  eWayBill?: EWayBillEvidence;
  valueTolerancePaise: number;
  linkedAt: string;
  linkedBy: string;
}

export type EvidenceRuleOutcome = "PASS" | "REVIEW" | "FAIL";

export interface EvidenceRuleResult {
  code: string;
  label: string;
  outcome: EvidenceRuleOutcome;
  reason: string;
  recoveryAction?: string;
}

export type EvidenceDecision = "PASS" | "REVIEW" | "BLOCKED" | "LINKED_SERVICE";

export interface EvidenceValidationResult {
  decision: EvidenceDecision;
  createsDeviceTransaction: boolean;
  rules: EvidenceRuleResult[];
}

export interface TransactionEvidenceSubject {
  id: string;
  purchaseOrderNumber: string;
  invoiceNumber: string;
  employerId: string;
  programmeId: string;
  productId: string;
  deviceIdentifier: string;
}

function normaliseReference(value: string | undefined): string {
  return value?.trim().toLocaleUpperCase("en-IN").replace(/\//g, "-") ?? "";
}

function addRule(
  rules: EvidenceRuleResult[],
  input: EvidenceRuleResult,
): void {
  rules.push(input);
}

export function validateEvidenceLink(
  link: TransactionEvidenceLink,
  subject?: TransactionEvidenceSubject,
): EvidenceValidationResult {
  const rules: EvidenceRuleResult[] = [];
  const { purchaseOrder: po, invoice } = link;
  const line = invoice.lines.find((candidate) => candidate.id === link.invoiceLineId);
  const recognitionStatus = invoice.recognitionStatus;

  addRule(rules, recognitionStatus === "COMMITTED" ? {
    code: "INVOICE_COMMITTED",
    label: "Invoice recognition",
    outcome: "PASS",
    reason: "The recognised invoice is committed for transaction processing.",
  } : {
    code: "INVOICE_NOT_COMMITTED",
    label: "Invoice recognition",
    outcome: "FAIL",
    reason: recognitionStatus
      ? `The invoice recognition status is ${recognitionStatus}.`
      : "The invoice has not been committed through the recognition workflow.",
    recoveryAction: "Resolve recognition exceptions and commit the invoice before processing.",
  });

  const committedProvenancePresent = Boolean(
    invoice.sourceChecksum.trim() && invoice.templateVersionId.trim(),
  );
  addRule(rules, committedProvenancePresent ? {
    code: "INVOICE_PROVENANCE_PRESENT",
    label: "Invoice source provenance",
    outcome: "PASS",
    reason: "Immutable source checksum and template version provenance are present.",
  } : {
    code: "INVOICE_PROVENANCE_MISSING",
    label: "Invoice source provenance",
    outcome: "FAIL",
    reason: "The committed invoice lacks a source checksum or template version provenance.",
    recoveryAction: "Reprocess the source document through a controlled, versioned template.",
  });

  addRule(rules, po.approvalStatus === "APPROVED" ? {
    code: "PO_APPROVED",
    label: "Approved purchase order",
    outcome: "PASS",
    reason: `Purchase order ${po.purchaseOrderNumber} is approved.`,
  } : {
    code: "PO_NOT_APPROVED",
    label: "Approved purchase order",
    outcome: "FAIL",
    reason: `Purchase order ${po.purchaseOrderNumber} is not approved.`,
    recoveryAction: "Link an approved purchase order before processing the transaction.",
  });

  const identityChecks: Array<[string, string, boolean, string]> = [
    ["VENDOR_MATCH", "Vendor", po.vendorId === invoice.vendorId, "Select an invoice raised by the purchase-order vendor."],
    ["PO_REFERENCE_MATCH", "PO reference", normaliseReference(po.purchaseOrderNumber) === normaliseReference(invoice.purchaseOrderNumber), "Correct the invoice PO reference or link the matching purchase order."],
    ["EMPLOYER_MATCH", "Employer", po.employerId === invoice.employerId, "Resolve the employer mismatch before claim preparation."],
    ["PROGRAMME_MATCH", "Employer programme", po.programmeId === invoice.programmeId, "Link the invoice to the programme approved on the purchase order."],
  ];
  identityChecks.forEach(([code, label, passed, recoveryAction]) => addRule(rules, passed ? {
    code,
    label,
    outcome: "PASS",
    reason: `${label} matches the purchase order.`,
  } : {
    code,
    label,
    outcome: "FAIL",
    reason: `${label} does not match the purchase order.`,
    recoveryAction,
  }));

  if (!line) {
    addRule(rules, {
      code: "INVOICE_LINE_NOT_FOUND",
      label: "Invoice line",
      outcome: "FAIL",
      reason: "The selected invoice line is not present in the recognised invoice.",
      recoveryAction: "Select a recognised invoice line.",
    });
  } else if (line.classification === "LINKED_SERVICE") {
    addRule(rules, {
      code: "LINKED_SERVICE_ONLY",
      label: "Evidence classification",
      outcome: "PASS",
      reason: "The invoice line is a linked service and may enrich the device record only.",
    });
  } else {
    if (subject) {
      const subjectChecks: Array<[string, string, boolean, string]> = [
        ["TRANSACTION_ID_MATCH", "Transaction", link.transactionId === subject.id, "Link evidence to the correct transaction."],
        ["TRANSACTION_PO_MATCH", "Transaction PO", normaliseReference(po.purchaseOrderNumber) === normaliseReference(subject.purchaseOrderNumber), "Correct the transaction PO reference or evidence link."],
        ["TRANSACTION_INVOICE_MATCH", "Transaction invoice", normaliseReference(invoice.invoiceNumber) === normaliseReference(subject.invoiceNumber), "Correct the transaction invoice reference or evidence link."],
        ["TRANSACTION_EMPLOYER_MATCH", "Transaction employer", po.employerId === subject.employerId, "Link evidence for the transaction employer."],
        ["TRANSACTION_PROGRAMME_MATCH", "Transaction programme", po.programmeId === subject.programmeId, "Link evidence for the transaction programme."],
        ["TRANSACTION_PRODUCT_MATCH", "Transaction product", po.productId === subject.productId, "Link evidence for the transaction product."],
      ];
      subjectChecks.forEach(([code, label, passed, recoveryAction]) => addRule(rules, passed ? {
        code,
        label,
        outcome: "PASS",
        reason: `${label} matches the evidence chain.`,
      } : {
        code,
        label,
        outcome: "FAIL",
        reason: `${label} does not match the evidence chain.`,
        recoveryAction,
      }));
    }
    const identifierMatches = Boolean(link.deviceIdentifier) &&
      line.deviceIdentifiers.some(
        (identifier) => normaliseReference(identifier) === normaliseReference(link.deviceIdentifier),
      );
    const subjectIdentifierMatches = !subject ||
      normaliseReference(subject.deviceIdentifier) === normaliseReference(link.deviceIdentifier);
    addRule(rules, identifierMatches ? {
      code: "DEVICE_IDENTIFIER_MATCH",
      label: "Device identifier",
      outcome: "PASS",
      reason: "The transaction device identifier appears on the selected invoice line.",
    } : {
      code: "DEVICE_IDENTIFIER_MISSING",
      label: "Device identifier",
      outcome: "FAIL",
      reason: "The transaction device identifier is missing from the selected invoice line.",
      recoveryAction: "Select the correct invoice line or resolve the IMEI/serial mismatch.",
    });
    if (!subjectIdentifierMatches) {
      addRule(rules, {
        code: "TRANSACTION_DEVICE_MISMATCH",
        label: "Transaction device identifier",
        outcome: "FAIL",
        reason: "The linked device identifier does not match the transaction.",
        recoveryAction: "Link the invoice line containing the transaction IMEI or serial number.",
      });
    }

    addRule(rules, line.classification === "ELIGIBLE_DEVICE" ? {
      code: "HSN_CLASSIFICATION_ELIGIBLE",
      label: "HSN classification",
      outcome: "PASS",
      reason: `${line.hsnOrSac} is configured as an eligible device classification.`,
    } : {
      code: "HSN_CLASSIFICATION_INELIGIBLE",
      label: "HSN classification",
      outcome: "FAIL",
      reason: `${line.hsnOrSac} is not configured as an eligible device classification.`,
      recoveryAction: "Correct the line classification or exclude it from the subvention transaction.",
    });
  }

  const valueVariance = Math.abs(po.approvedAmountPaise - invoice.totalValuePaise);
  addRule(rules, valueVariance <= link.valueTolerancePaise ? {
    code: "VALUE_WITHIN_TOLERANCE",
    label: "PO and invoice value",
    outcome: "PASS",
    reason: `Value variance is within the configured tolerance of ${link.valueTolerancePaise} paise.`,
  } : {
    code: "VALUE_VARIANCE_EXCEEDED",
    label: "PO and invoice value",
    outcome: "FAIL",
    reason: `Value variance of ${valueVariance} paise exceeds the configured tolerance.`,
    recoveryAction: "Resolve the PO/invoice value mismatch or obtain an authorised exception.",
  });

  const supplyRoute = invoice.supplyRoute ?? "NORMAL_SUPPLY";
  const gstPresent = Boolean(
    invoice.supplierGstin.trim() &&
    invoice.billToGstin.trim() &&
    (supplyRoute !== "BILL_TO_SHIP_TO" || invoice.shipToGstin?.trim()),
  );
  addRule(rules, gstPresent ? {
    code: "GST_EVIDENCE_PRESENT",
    label: "GST evidence",
    outcome: "PASS",
    reason: supplyRoute === "BILL_TO_SHIP_TO"
      ? "Supplier, bill-to and ship-to GSTINs are present."
      : "Supplier and bill-to GSTINs are present.",
  } : {
    code: "GST_EVIDENCE_MISSING",
    label: "GST evidence",
    outcome: "FAIL",
    reason: supplyRoute === "BILL_TO_SHIP_TO"
      ? "Supplier, bill-to or ship-to GSTIN is missing."
      : "Supplier or bill-to GSTIN is missing.",
    recoveryAction: "Complete GST evidence before claim preparation.",
  });

  if (invoice.requiresIrn) {
    addRule(rules, invoice.irn?.trim() ? {
      code: "IRN_PRESENT",
      label: "IRN",
      outcome: "PASS",
      reason: "The required invoice registration number is present.",
    } : {
      code: "IRN_MISSING",
      label: "IRN",
      outcome: "FAIL",
      reason: "The invoice requires an IRN, but none is present.",
      recoveryAction: "Upload or record the valid IRN evidence.",
    });
  }

  if (invoice.requiresEWayBill) {
    const eWayBill = link.eWayBill;
    if (!eWayBill) {
      addRule(rules, {
        code: "EWAY_BILL_MISSING",
        label: "E-Way Bill",
        outcome: "FAIL",
        reason: "Movement evidence is required but no E-Way Bill is linked.",
        recoveryAction: "Link the corresponding E-Way Bill.",
      });
    } else {
      const expectedDocument = eWayBill.linkMode === "DELIVERY_NOTE"
        ? invoice.deliveryNoteNumber
        : invoice.invoiceNumber;
      const documentMatches = Boolean(expectedDocument) &&
        normaliseReference(eWayBill.documentNumber) === normaliseReference(expectedDocument);
      addRule(rules, documentMatches ? {
        code: "EWAY_DOCUMENT_MATCH",
        label: "E-Way Bill document",
        outcome: "PASS",
        reason: `The E-Way Bill matches the configured ${eWayBill.linkMode === "DELIVERY_NOTE" ? "delivery-note" : "invoice"} reference.`,
      } : {
        code: "EWAY_DOCUMENT_MISMATCH",
        label: "E-Way Bill document",
        outcome: "FAIL",
        reason: "The E-Way Bill document reference does not match the configured invoice link.",
        recoveryAction: "Link the correct movement document or correct its configured link mode.",
      });
      addRule(rules, Math.abs(eWayBill.valuePaise - invoice.totalValuePaise) <= link.valueTolerancePaise ? {
        code: "EWAY_VALUE_MATCH",
        label: "E-Way Bill value",
        outcome: "PASS",
        reason: "The E-Way Bill and invoice values reconcile.",
      } : {
        code: "EWAY_VALUE_MISMATCH",
        label: "E-Way Bill value",
        outcome: "FAIL",
        reason: "The E-Way Bill and invoice values do not reconcile.",
        recoveryAction: "Resolve the movement-document value mismatch.",
      });
      const movementTransactionType = eWayBill.transactionType ?? "NORMAL_SUPPLY";
      const expectedRecipientGstin = supplyRoute === "BILL_TO_SHIP_TO"
        ? invoice.shipToGstin
        : invoice.billToGstin;
      const gstMatches = movementTransactionType === supplyRoute &&
        normaliseReference(eWayBill.supplierGstin) === normaliseReference(invoice.supplierGstin) &&
        normaliseReference(eWayBill.recipientGstin) === normaliseReference(expectedRecipientGstin);
      addRule(rules, gstMatches ? {
        code: "EWAY_GSTIN_MATCH",
        label: "Movement GSTINs",
        outcome: "PASS",
        reason: supplyRoute === "BILL_TO_SHIP_TO"
          ? "Supplier and ship-to recipient GSTINs match the configured Bill-To/Ship-To supply."
          : "Supplier and bill-to recipient GSTINs match the recognised invoice.",
      } : {
        code: "EWAY_GSTIN_MISMATCH",
        label: "Movement GSTINs",
        outcome: "FAIL",
        reason: "Supplier, configured recipient or transaction type differs between the invoice and E-Way Bill.",
        recoveryAction: "Link the correct E-Way Bill or resolve the supply-route/GSTIN mismatch.",
      });
      if (invoice.irn && eWayBill.irn) {
        addRule(rules, normaliseReference(invoice.irn) === normaliseReference(eWayBill.irn) ? {
          code: "EWAY_IRN_MATCH",
          label: "Movement IRN",
          outcome: "PASS",
          reason: "The invoice and E-Way Bill IRNs match.",
        } : {
          code: "EWAY_IRN_MISMATCH",
          label: "Movement IRN",
          outcome: "FAIL",
          reason: "The invoice and E-Way Bill IRNs do not match.",
          recoveryAction: "Link movement evidence generated for the recognised invoice.",
        });
      }
      addRule(rules, eWayBill.partBPresent && eWayBill.movementValid ? {
        code: "EWAY_MOVEMENT_VALID",
        label: "Movement evidence",
        outcome: "PASS",
        reason: "Part B is present and movement evidence is valid.",
      } : {
        code: "EWAY_PART_B_REVIEW",
        label: "Movement evidence",
        outcome: "REVIEW",
        reason: "The E-Way Bill is Part-A-only or movement validity is not confirmed.",
        recoveryAction: "Review Part B or record an authorised movement-evidence decision.",
      });
    }
  }

  if (rules.some((rule) => rule.outcome === "FAIL")) {
    return { decision: "BLOCKED", createsDeviceTransaction: false, rules };
  }
  if (rules.some((rule) => rule.outcome === "REVIEW")) {
    return { decision: "REVIEW", createsDeviceTransaction: false, rules };
  }
  if (line?.classification === "LINKED_SERVICE") {
    return { decision: "LINKED_SERVICE", createsDeviceTransaction: false, rules };
  }
  return { decision: "PASS", createsDeviceTransaction: true, rules };
}
