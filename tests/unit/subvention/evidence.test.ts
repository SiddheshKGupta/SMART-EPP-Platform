import { describe, expect, it } from "vitest";
import {
  validateEvidenceLink,
  type TransactionEvidenceLink,
} from "../../../packages/domain/src/subvention/evidence";

function fixture(
  overrides: Partial<TransactionEvidenceLink> = {},
): TransactionEvidenceLink {
  return {
    transactionId: "txn-1",
    purchaseOrder: {
      id: "po-1",
      purchaseOrderNumber: "PO/2026/001",
      employerId: "employer-crisil",
      programmeId: "programme-crisil-apple",
      vendorId: "vendor-fore-excel",
      settlementCounterpartyId: "nd-ingram",
      oemId: "oem-apple",
      productId: "product-iphone-16",
      orderDate: "2026-07-01",
      approvedAmountPaise: 10_000_000,
      quantity: 1,
      approvalStatus: "APPROVED",
      platformProviderId: "provider-tortoise",
      source: "CONTROLLED_UPLOAD",
    },
    invoice: {
      id: "invoice-1",
      sourceFileName: "FEPL10012_document.pdf",
      sourceChecksum: "sha256:invoice-1",
      templateVersionId: "template-fore-excel-v1",
      documentType: "TAX_INVOICE",
      vendorId: "vendor-fore-excel",
      vendorLegalName: "Fore Excel Private Limited",
      invoiceNumber: "FEPL10012",
      invoiceDate: "2026-07-04",
      purchaseOrderNumber: "PO-2026-001",
      resolvedPurchaseOrderId: "po-1",
      employerId: "employer-crisil",
      programmeId: "programme-crisil-apple",
      supplierGstin: "27AADCF2160Q1ZC",
      billToGstin: "27AAECC0000A1Z0",
      irn: "irn-controlled-fixture",
      deliveryNoteNumber: "DN-10012",
      totalValuePaise: 10_000_000,
      recognitionConfidence: 0.99,
      recognitionStatus: "COMMITTED",
      validationState: "COMMITTED",
      requiresIrn: true,
      requiresEWayBill: true,
      lines: [{
        id: "line-1",
        productText: "Apple iPhone 16",
        productId: "product-iphone-16",
        deviceIdentifiers: ["351234567890123"],
        hsnOrSac: "85171300",
        classification: "ELIGIBLE_DEVICE",
        quantity: 1,
        baseValuePaise: 8_474_576,
        taxableValuePaise: 8_474_576,
        taxAmountPaise: 1_525_424,
        totalValuePaise: 10_000_000,
      }],
      importedAt: "2026-07-04T10:00:00.000Z",
      importedBy: "operations-1",
    },
    invoiceLineId: "line-1",
    deviceIdentifier: "351234567890123",
    eWayBill: {
      id: "eway-1",
      eWayBillNumber: "221965597459",
      documentNumber: "FEPL10012",
      documentDate: "2026-07-04",
      supplierGstin: "27AADCF2160Q1ZC",
      recipientGstin: "27AAECC0000A1Z0",
      hsnOrSac: "85171300",
      valuePaise: 10_000_000,
      irn: "irn-controlled-fixture",
      partBPresent: true,
      movementValid: true,
      linkMode: "INVOICE_NUMBER",
    },
    valueTolerancePaise: 100,
    linkedAt: "2026-07-04T10:05:00.000Z",
    linkedBy: "operations-1",
    ...overrides,
  };
}

describe("subvention transaction evidence", () => {
  it("passes a complete approved PO, invoice, IMEI and movement chain", () => {
    const result = validateEvidenceLink(fixture());

    expect(result.decision).toBe("PASS");
    expect(result.createsDeviceTransaction).toBe(true);
    expect(result.rules.every((rule) => rule.outcome === "PASS")).toBe(true);
  });

  it.each(["RECEIVED", "RECOGNISED", "EXCEPTION"] as const)(
    "blocks an invoice whose recognition status is %s",
    (recognitionStatus) => {
      const base = fixture();
      const result = validateEvidenceLink(fixture({
        invoice: {
          ...base.invoice,
          recognitionStatus,
        },
      }));

      expect(result.decision).toBe("BLOCKED");
      expect(result.rules).toContainEqual(expect.objectContaining({
        code: "INVOICE_NOT_COMMITTED",
        outcome: "FAIL",
      }));
    },
  );

  it("blocks a committed invoice without immutable source provenance", () => {
    const base = fixture();
    const result = validateEvidenceLink(fixture({
      invoice: {
        ...base.invoice,
        recognitionStatus: "COMMITTED",
        sourceChecksum: "",
        templateVersionId: "",
      },
    }));

    expect(result.decision).toBe("BLOCKED");
    expect(result.rules).toContainEqual(expect.objectContaining({
      code: "INVOICE_PROVENANCE_MISSING",
      outcome: "FAIL",
    }));
  });

  it("blocks vendor, programme and value mismatches", () => {
    const base = fixture();
    const result = validateEvidenceLink(fixture({
      invoice: {
        ...base.invoice,
        vendorId: "vendor-other",
        programmeId: "programme-other",
        totalValuePaise: 9_000_000,
      },
    }));

    expect(result.decision).toBe("BLOCKED");
    expect(result.rules.filter((rule) => rule.outcome === "FAIL").map((rule) => rule.code))
      .toEqual(expect.arrayContaining([
        "VENDOR_MATCH",
        "PROGRAMME_MATCH",
        "VALUE_VARIANCE_EXCEEDED",
      ]));
  });

  it("blocks an evidence package linked to a different transaction invoice", () => {
    const link = fixture();
    const result = validateEvidenceLink(link, {
      id: link.transactionId,
      purchaseOrderNumber: link.purchaseOrder.purchaseOrderNumber,
      invoiceNumber: "OTHER-INVOICE",
      employerId: link.purchaseOrder.employerId,
      programmeId: link.purchaseOrder.programmeId,
      productId: link.purchaseOrder.productId,
      deviceIdentifier: link.deviceIdentifier!,
    });

    expect(result.decision).toBe("BLOCKED");
    expect(result.rules).toContainEqual(expect.objectContaining({
      code: "TRANSACTION_INVOICE_MATCH",
      outcome: "FAIL",
    }));
  });

  it("supports a configured delivery-note link without vendor hardcoding", () => {
    const base = fixture();
    const result = validateEvidenceLink(fixture({
      eWayBill: {
        ...base.eWayBill!,
        documentNumber: "DN/10012",
        linkMode: "DELIVERY_NOTE",
      },
    }));

    expect(result.decision).toBe("PASS");
    expect(result.rules).toContainEqual(expect.objectContaining({
      code: "EWAY_DOCUMENT_MATCH",
      outcome: "PASS",
    }));
  });

  it("accepts the configured ship-to GSTIN for Bill-To/Ship-To movement", () => {
    const base = fixture();
    const result = validateEvidenceLink(fixture({
      invoice: {
        ...base.invoice,
        recognitionStatus: "COMMITTED",
        supplyRoute: "BILL_TO_SHIP_TO",
        shipToGstin: "07AAACC0000B1Z1",
      },
      eWayBill: {
        ...base.eWayBill!,
        recipientGstin: "07AAACC0000B1Z1",
        transactionType: "BILL_TO_SHIP_TO",
      },
    }));

    expect(result.decision).toBe("PASS");
    expect(result.rules).toContainEqual(expect.objectContaining({
      code: "EWAY_GSTIN_MATCH",
      outcome: "PASS",
    }));
  });

  it("sends Part-A-only movement evidence to review", () => {
    const base = fixture();
    const result = validateEvidenceLink(fixture({
      eWayBill: { ...base.eWayBill!, partBPresent: false, movementValid: false },
    }));

    expect(result.decision).toBe("REVIEW");
    expect(result.rules).toContainEqual(expect.objectContaining({
      code: "EWAY_PART_B_REVIEW",
      outcome: "REVIEW",
    }));
  });

  it("links protection evidence without creating another device transaction", () => {
    const base = fixture();
    const result = validateEvidenceLink(fixture({
      invoice: {
        ...base.invoice,
        documentType: "PROTECTION_INVOICE",
        requiresEWayBill: false,
        lines: [{
          ...base.invoice.lines[0]!,
          hsnOrSac: "999799",
          classification: "LINKED_SERVICE",
        }],
      },
      eWayBill: undefined,
    }));

    expect(result.decision).toBe("LINKED_SERVICE");
    expect(result.createsDeviceTransaction).toBe(false);
  });

  it("blocks a linked service whose corporate evidence does not reconcile", () => {
    const base = fixture();
    const result = validateEvidenceLink(fixture({
      invoice: {
        ...base.invoice,
        documentType: "PROTECTION_INVOICE",
        vendorId: "vendor-unmatched",
        requiresEWayBill: false,
        lines: [{
          ...base.invoice.lines[0]!,
          hsnOrSac: "999799",
          classification: "LINKED_SERVICE",
        }],
      },
      eWayBill: undefined,
    }));

    expect(result.decision).toBe("BLOCKED");
    expect(result.createsDeviceTransaction).toBe(false);
  });

  it("does not carry employee personal information in evidence records", () => {
    const serialised = JSON.stringify(fixture()).toLocaleLowerCase("en-IN");

    expect(serialised).not.toContain("employeeName".toLocaleLowerCase("en-IN"));
    expect(serialised).not.toContain("mobile");
    expect(serialised).not.toContain("personalemail");
    expect(serialised).not.toContain("deliveryaddress");
  });
});
