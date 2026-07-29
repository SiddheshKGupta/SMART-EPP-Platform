import { z } from "zod";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false;

  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed) &&
    new Date(parsed).toISOString().slice(0, 10) === value
  );
}

const isoDateSchema = z.string().refine(isValidIsoDate, {
  message: "Invalid ISO date",
});
const positiveIntegerSchema = z.number().int().positive();
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const calculationBasisSchema = z.enum([
  "INVOICE_VALUE",
  "BASE_VALUE",
  "FLAT_AMOUNT",
]);

const purchaseSourceEvidenceSchema = z.object({
  sourceFileName: z.string().min(1),
  sourceSheetName: z.string().min(1),
  sourceRowNumber: positiveIntegerSchema,
  sourceChecksum: z.string().min(1),
  rowKind: z.enum(["TRANSACTION", "FORMULA", "CONTROL"]),
  sourceLabels: z.record(z.string()),
  counterpartyAliases: z.object({
    reseller: z.string().min(1).optional(),
    distributor: z.string().min(1).optional(),
  }),
  calculationBasis: calculationBasisSchema,
  rateBps: positiveIntegerSchema.max(10_000),
  expectedSubventionPaise: nonNegativeIntegerSchema,
});

function refineCalculationRule(
  value: {
    calculationBasis?: z.infer<typeof calculationBasisSchema>;
    rateBps?: number;
    flatAmountPaise?: number;
  },
  context: z.RefinementCtx,
) {
  if (value.calculationBasis === undefined) {
    if (value.rateBps !== undefined || value.flatAmountPaise !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["calculationBasis"],
        message: "Calculation basis required for a commercial override",
      });
    }
    return;
  }

  if (value.calculationBasis === "FLAT_AMOUNT") {
    if (!value.flatAmountPaise || value.flatAmountPaise <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["flatAmountPaise"],
        message: "Positive flat amount required",
      });
    }
    return;
  }

  if (!value.rateBps || value.rateBps <= 0 || value.rateBps > 10_000) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rateBps"],
      message: "Rate must be between 1 and 10000 basis points",
    });
  }

  if (value.flatAmountPaise !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["flatAmountPaise"],
      message: "Flat amount is only valid for flat schemes",
    });
  }
}

function refineEffectiveDates(
  value: { effectiveFrom: string; effectiveTo: string },
  context: z.RefinementCtx,
) {
  if (value.effectiveFrom > value.effectiveTo) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["effectiveTo"],
      message: "Effective to date must not be before effective from date",
    });
  }
}

export const schemeDraftSchema = z
  .object({
    schemeId: z.string().min(1),
    code: z.string().min(1),
    name: z.string().min(1),
    oemId: z.string().min(1),
    distributorId: z.string().min(1).optional(),
    settlementCounterpartyType: z.enum(["OEM", "DISTRIBUTOR", "RESELLER"]),
    calculationBasis: calculationBasisSchema,
    rateBps: positiveIntegerSchema.max(10_000).optional(),
    flatAmountPaise: positiveIntegerSchema.optional(),
    claimTimelineDays: positiveIntegerSchema,
    priority: nonNegativeIntegerSchema,
    eligibleProductIds: z.array(z.string().min(1)),
    effectiveFrom: isoDateSchema,
    effectiveTo: isoDateSchema,
    requiredDocumentCodes: z.array(z.string().min(1)),
  })
  .superRefine(refineCalculationRule)
  .superRefine(refineEffectiveDates);

export const programmeMappingDraftSchema = z
  .object({
    mappingId: z.string().min(1),
    employerId: z.string().min(1),
    programmeId: z.string().min(1),
    oemId: z.string().min(1),
    schemeVersionId: z.string().min(1),
    resellerId: z.string().min(1).optional(),
    distributorId: z.string().min(1).optional(),
    launchDate: isoDateSchema,
    effectiveFrom: isoDateSchema,
    effectiveTo: isoDateSchema,
    overrides: z
      .object({
        calculationBasis: calculationBasisSchema.optional(),
        rateBps: positiveIntegerSchema.max(10_000).optional(),
        flatAmountPaise: positiveIntegerSchema.optional(),
        claimTimelineDays: positiveIntegerSchema.optional(),
        eligibleProductIds: z.array(z.string().min(1)).optional(),
        approvalReference: z.string().min(1),
      })
      .superRefine(refineCalculationRule)
      .optional(),
  })
  .superRefine(refineEffectiveDates);

export const purchaseTransactionInputSchema = z.object({
  leaseId: z.string().min(1),
  lotId: z.string().min(1),
  employeeId: z.string().min(1),
  employerId: z.string().min(1),
  programmeId: z.string().min(1),
  oemId: z.string().min(1),
  productId: z.string().min(1),
  productCode: z.string().min(1),
  connectLegalEntityId: z.string().min(1),
  deviceIdentifier: z.string().min(8),
  purchaseOrderNumber: z.string().min(1),
  invoiceNumber: z.string().min(1),
  invoiceDate: isoDateSchema,
  invoiceValuePaise: nonNegativeIntegerSchema,
  baseValuePaise: nonNegativeIntegerSchema,
  gstAmountPaise: nonNegativeIntegerSchema,
  resellerId: z.string().min(1),
  distributorId: z.string().min(1).optional(),
  leaseStatus: z.enum(["ACTIVE", "CANCELLED", "RETURNED", "REVERSED"]),
  sourceSystem: z.enum(["LMS", "CONTROLLED_UPLOAD"]),
  sourceEvidence: purchaseSourceEvidenceSchema,
});
