import type { OemRuleDefaults } from "./programme-mapping";
import type { ClaimBatch, ClaimLineResponse } from "./claims";
import type {
  EWayBillEvidence,
  PurchaseOrderEvidence,
  TransactionEvidenceLink,
  VendorInvoiceEvidence,
} from "./evidence";
import type {
  MasterCatalogue,
  MasterCommand,
  MasterKind,
  MasterRecord,
} from "./master-data";
import type {
  ImportResult,
  PurchaseImportMasterData,
  QuarantinedPurchaseImportRow,
} from "./purchase-import";
import type {
  Actor,
  EligibilityDecision,
  EmployerProgrammeMappingVersion,
  PurchaseTransaction,
  PurchaseTransactionInput,
  SchemeVersion,
} from "./types";

export type AuditAction =
  | "MASTER_DRAFT_SAVED"
  | "MASTER_SUCCESSOR_CREATED"
  | "MASTER_SUBMITTED"
  | "MASTER_APPROVED"
  | "MASTER_RETURNED"
  | "MASTER_REJECTED"
  | "MASTER_SUPERSEDED"
  | "MASTER_DEACTIVATED"
  | "SCHEME_DRAFT_SAVED"
  | "SCHEME_SUBMITTED"
  | "SCHEME_APPROVED"
  | "SCHEME_RETURNED"
  | "SCHEME_REJECTED"
  | "PROGRAMME_MAPPING_DRAFT_SAVED"
  | "PROGRAMME_MAPPING_SUBMITTED"
  | "PROGRAMME_MAPPING_APPROVED"
  | "PROGRAMME_MAPPING_RETURNED"
  | "PROGRAMME_MAPPING_REJECTED"
  | "PURCHASE_IMPORTED"
  | "PURCHASE_IMPORT_QUARANTINED"
  | "TRANSACTION_EVIDENCE_LINKED"
  | "ELIGIBILITY_EVALUATED"
  | "ELIGIBILITY_INVALIDATED"
  | "CLAIM_BATCH_CREATED"
  | "CLAIM_BATCH_SUBMITTED"
  | "CLAIM_BATCH_APPROVED"
  | "CLAIM_SUBMITTED_TO_COUNTERPARTY"
  | "CLAIM_RESPONSE_RECORDED"
  | "CLAIM_INVOICE_RECORDED"
  | "CLAIM_COLLECTION_RECORDED"
  | "CLAIM_ACCOUNTED"
  | "CLAIM_CLOSED";

export interface AuditEvent {
  id: string;
  entityType:
    | "MasterRecord"
    | "SchemeVersion"
    | "EmployerProgrammeMappingVersion"
    | "PurchaseTransaction"
    | "PurchaseImportRow"
    | "TransactionEvidenceLink"
    | "EligibilityDecision"
    | "ClaimBatch";
  entityId: string;
  action: AuditAction;
  actor: Actor;
  occurredAt: string;
  remarks: string;
  beforeState: unknown | null;
  afterState: unknown | null;
  provenance: {
    source:
      | "SUBVENTION_REPOSITORY_COMMAND"
      | "MASTER_DATA_WORKBENCH"
      | "CONTROLLED_IMPORT"
      | "PURCHASE_SOURCE_EVIDENCE"
      | "SEED_HISTORY";
    sourceEntityId: string;
    sourceChecksum?: string;
    sourceSheetName?: string;
    sourceRowNumber?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface OemConfiguration {
  id: string;
  name: string;
  productIds?: string[];
  defaults?: OemRuleDefaults;
}

export interface SubventionSeed {
  masters: MasterCatalogue;
  oems: OemConfiguration[];
  schemes: SchemeVersion[];
  programmeMappings: EmployerProgrammeMappingVersion[];
  transactions: PurchaseTransaction[];
  eligibilityDecisions: EligibilityDecision[];
  claimBatches: ClaimBatch[];
  purchaseOrders: PurchaseOrderEvidence[];
  vendorInvoices: VendorInvoiceEvidence[];
  eWayBills: EWayBillEvidence[];
  evidenceLinks: TransactionEvidenceLink[];
  quarantinedImports: QuarantinedPurchaseImportRow[];
  auditEvents: AuditEvent[];
  actors: Actor[];
  purchaseImportMasterData: PurchaseImportMasterData;
  existingClaimedDeviceIdentifiers: string[];
  existingClaimedLeaseIds: string[];
  alternativePartnerDeviceIdentifiers: string[];
  alternativePartnerLeaseIds: string[];
  duplicateDeviceIdentifiers: string[];
  duplicateLeaseIds: string[];
}

export interface SubventionSnapshot extends SubventionSeed {}

export interface RepositoryDependencies {
  now: () => string;
  nextId: (prefix: string) => string;
}

export interface MasterDataRepository {
  listMasters(kind?: MasterKind): Promise<MasterRecord[]>;
  saveMasterDraft(
    master: MasterRecord,
    command: MasterCommand,
  ): Promise<MasterRecord>;
  createNextMasterVersion(
    id: string,
    command: MasterCommand,
    effectiveWindow: MasterEffectiveWindow,
  ): Promise<MasterRecord>;
  submitMaster(id: string, command: MasterCommand): Promise<MasterRecord>;
  approveMaster(id: string, command: MasterCommand): Promise<MasterRecord>;
  returnMaster(id: string, command: MasterCommand): Promise<MasterRecord>;
  rejectMaster(id: string, command: MasterCommand): Promise<MasterRecord>;
  deactivateMaster(
    id: string,
    command: MasterCommand,
  ): Promise<MasterRecord>;
}

export interface MasterEffectiveWindow {
  effectiveFrom: string;
  effectiveTo: string;
}

export interface SchemeRepository {
  listSchemes(): Promise<SchemeVersion[]>;
  getScheme(id: string): Promise<SchemeVersion | undefined>;
  saveSchemeDraft(
    scheme: SchemeVersion,
    actor: Actor,
    remarks: string,
  ): Promise<SchemeVersion>;
  submitScheme(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<SchemeVersion>;
  approveScheme(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<SchemeVersion>;
  returnScheme(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<SchemeVersion>;
  rejectScheme(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<SchemeVersion>;
  createNextSchemeVersion(
    id: string,
    actor: Actor,
    remarks: string,
    effectiveWindow: SchemeEffectiveWindow,
  ): Promise<SchemeVersion>;
}

export interface ProgrammeMappingRepository {
  listProgrammeMappings(): Promise<EmployerProgrammeMappingVersion[]>;
  getProgrammeMapping(
    id: string,
  ): Promise<EmployerProgrammeMappingVersion | undefined>;
  saveProgrammeMappingDraft(
    mapping: EmployerProgrammeMappingVersion,
    actor: Actor,
    remarks: string,
  ): Promise<EmployerProgrammeMappingVersion>;
  submitProgrammeMapping(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<EmployerProgrammeMappingVersion>;
  approveProgrammeMapping(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<EmployerProgrammeMappingVersion>;
  returnProgrammeMapping(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<EmployerProgrammeMappingVersion>;
  rejectProgrammeMapping(
    id: string,
    actor: Actor,
    remarks: string,
  ): Promise<EmployerProgrammeMappingVersion>;
  createNextProgrammeMappingVersion(
    id: string,
    actor: Actor,
    remarks: string,
    effectiveWindow: ProgrammeMappingEffectiveWindow,
  ): Promise<EmployerProgrammeMappingVersion>;
}

export interface ProgrammeMappingEffectiveWindow {
  effectiveFrom: string;
  effectiveTo: string;
}

export interface SchemeEffectiveWindow {
  effectiveFrom: string;
  effectiveTo: string;
}

export interface PurchaseTransactionRepository {
  listTransactions(): Promise<PurchaseTransaction[]>;
  getTransaction(id: string): Promise<PurchaseTransaction | undefined>;
  importTransactions(
    rows: PurchaseTransactionInput[],
    actor: Actor,
  ): Promise<ImportResult>;
}

export interface EligibilityDecisionRepository {
  listEligibilityDecisions(
    transactionId?: string,
  ): Promise<EligibilityDecision[]>;
  getLatestEligibilityDecision(
    transactionId: string,
  ): Promise<EligibilityDecision | undefined>;
  evaluateTransaction(
    transactionId: string,
    actor: Actor,
  ): Promise<EligibilityDecision>;
  evaluateTransactions(
    transactionIds: string[],
    actor: Actor,
  ): Promise<EligibilityDecision[]>;
}

export interface EvidenceRepository {
  listPurchaseOrders(): Promise<PurchaseOrderEvidence[]>;
  listVendorInvoices(): Promise<VendorInvoiceEvidence[]>;
  listEWayBills(): Promise<EWayBillEvidence[]>;
  listEvidenceLinks(transactionId?: string): Promise<TransactionEvidenceLink[]>;
  saveEvidenceLink(
    link: TransactionEvidenceLink,
    actor: Actor,
    remarks: string,
  ): Promise<TransactionEvidenceLink>;
}

export interface AuditRepository {
  listAuditEvents(): Promise<AuditEvent[]>;
  listForEntity(
    entityType: AuditEvent["entityType"],
    entityId: string,
  ): Promise<AuditEvent[]>;
}

export interface ClaimRepository {
  listClaimBatches(): Promise<ClaimBatch[]>;
  createClaimBatch(
    transactionIds: string[],
    settlementCounterpartyId: string,
    actor: Actor,
    remarks: string,
  ): Promise<ClaimBatch>;
  submitClaimBatch(id: string, actor: Actor, remarks: string): Promise<ClaimBatch>;
  approveClaimBatch(id: string, actor: Actor, remarks: string): Promise<ClaimBatch>;
  recordClaimSubmission(id: string, reference: string, actor: Actor, remarks: string): Promise<ClaimBatch>;
  recordClaimResponse(id: string, responses: ClaimLineResponse[], actor: Actor, remarks: string): Promise<ClaimBatch>;
  recordClaimInvoice(id: string, amountPaise: number, actor: Actor, remarks: string): Promise<ClaimBatch>;
  recordClaimCollection(id: string, amountPaise: number, actor: Actor, remarks: string): Promise<ClaimBatch>;
  recordClaimAccounting(id: string, amountPaise: number, actor: Actor, remarks: string): Promise<ClaimBatch>;
  closeClaimBatch(id: string, actor: Actor, remarks: string): Promise<ClaimBatch>;
}

export interface SubventionRepository
  extends MasterDataRepository,
    SchemeRepository,
    ProgrammeMappingRepository,
    PurchaseTransactionRepository,
    EvidenceRepository,
    EligibilityDecisionRepository,
    ClaimRepository,
    AuditRepository {
  getSnapshot(): Promise<SubventionSnapshot>;
}
