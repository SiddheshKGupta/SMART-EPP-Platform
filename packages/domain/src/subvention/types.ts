export type MasterWorkflowStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "RETURNED"
  | "REJECTED"
  | "SUPERSEDED"
  | "INACTIVE";

export type CalculationBasis = "INVOICE_VALUE" | "BASE_VALUE" | "FLAT_AMOUNT";

export interface Actor {
  userId: string;
  role: string;
}

export interface SchemeVersion {
  id: string;
  schemeId: string;
  version: number;
  code: string;
  name: string;
  oemId: string;
  distributorId?: string;
  settlementCounterpartyType: "OEM" | "DISTRIBUTOR" | "RESELLER";
  calculationBasis: CalculationBasis;
  rateBps?: number;
  flatAmountPaise?: number;
  claimTimelineDays: number;
  priority: number;
  eligibleProductIds: string[];
  effectiveFrom: string;
  effectiveTo: string;
  requiredDocumentCodes: string[];
  workflowStatus: MasterWorkflowStatus;
  makerUserId: string;
  checkerUserId?: string;
  approvedAt?: string;
  createdAt: string;
}

export type SchemeDraftInput = Omit<
  SchemeVersion,
  | "id"
  | "version"
  | "workflowStatus"
  | "makerUserId"
  | "checkerUserId"
  | "approvedAt"
  | "createdAt"
>;

export interface ProgrammeRuleOverride {
  calculationBasis?: CalculationBasis;
  rateBps?: number;
  flatAmountPaise?: number;
  claimTimelineDays?: number;
  eligibleProductIds?: string[];
  approvalReference: string;
}

export interface EmployerProgrammeMappingVersion {
  id: string;
  mappingId: string;
  version: number;
  employerId: string;
  programmeId: string;
  oemId: string;
  schemeVersionId: string;
  resellerId?: string;
  distributorId?: string;
  launchDate: string;
  effectiveFrom: string;
  effectiveTo: string;
  overrides?: ProgrammeRuleOverride;
  workflowStatus: MasterWorkflowStatus;
  makerUserId: string;
  checkerUserId?: string;
  approvedAt?: string;
  createdAt: string;
}

export type ProgrammeMappingDraftInput = Omit<
  EmployerProgrammeMappingVersion,
  | "id"
  | "version"
  | "workflowStatus"
  | "makerUserId"
  | "checkerUserId"
  | "approvedAt"
  | "createdAt"
>;

export type LeaseTransactionStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "RETURNED"
  | "REVERSED";

export type PurchaseSourceRowKind = "TRANSACTION" | "FORMULA" | "CONTROL";

export interface PurchaseSourceEvidence {
  sourceFileName: string;
  sourceSheetName: string;
  sourceRowNumber: number;
  sourceChecksum: string;
  rowKind: PurchaseSourceRowKind;
  sourceLabels: Record<string, string>;
  counterpartyAliases: {
    reseller?: string;
    distributor?: string;
  };
  calculationBasis: CalculationBasis;
  rateBps: number;
  expectedSubventionPaise: number;
}

export interface PurchaseTransaction {
  id: string;
  leaseId: string;
  lotId: string;
  employeeId: string;
  employerId: string;
  programmeId: string;
  oemId: string;
  productId: string;
  productCode: string;
  connectLegalEntityId: string;
  deviceIdentifier: string;
  purchaseOrderNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValuePaise: number;
  baseValuePaise: number;
  gstAmountPaise: number;
  resellerId: string;
  distributorId?: string;
  leaseStatus: LeaseTransactionStatus;
  sourceSystem: "LMS" | "CONTROLLED_UPLOAD";
  sourceEvidence: PurchaseSourceEvidence;
  importedAt: string;
}

export type PurchaseTransactionInput = Omit<
  PurchaseTransaction,
  "id" | "importedAt"
>;

export type EligibilityStatus =
  | "ELIGIBLE"
  | "INELIGIBLE"
  | "EXCEPTION_REVIEW";

export type RuleOutcome = "PASS" | "FAIL" | "REVIEW";

interface RuleResultBase {
  code: string;
  label: string;
  reason: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
}

export type RuleResult =
  | (RuleResultBase & {
      outcome: "PASS";
      recoveryAction?: never;
    })
  | (RuleResultBase & {
      outcome: "FAIL" | "REVIEW";
      recoveryAction: string;
    });

export interface EligibilityRuleSnapshot {
  employerProgrammeMappingVersionId: string;
  schemeVersionId: string;
  calculationBasis: CalculationBasis;
  rateBps?: number;
  flatAmountPaise?: number;
  claimTimelineDays: number;
  eligibleProductIds: string[];
  settlementCounterpartyType: "OEM" | "DISTRIBUTOR" | "RESELLER";
  precedenceSources: string[];
}

export interface EligibilityDecision {
  id: string;
  transactionId: string;
  version: number;
  status: EligibilityStatus;
  expectedAmountPaise: number;
  filingDeadline: string;
  evaluatedAt: string;
  evaluatedBy: string;
  ruleSnapshot?: EligibilityRuleSnapshot;
  ruleResults: RuleResult[];
  previousDecisionId?: string;
}

export type CalculationInput = {
  calculationBasis: CalculationBasis;
  invoiceValuePaise: number;
  baseValuePaise: number;
  rateBps?: number;
  flatAmountPaise?: number;
};
