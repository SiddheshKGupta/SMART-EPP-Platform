import type { OemRuleDefaults } from "./programme-mapping";
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
  | "ELIGIBILITY_EVALUATED";

export interface AuditEvent {
  id: string;
  entityType:
    | "SchemeVersion"
    | "EmployerProgrammeMappingVersion"
    | "PurchaseTransaction"
    | "PurchaseImportRow"
    | "EligibilityDecision";
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
  oems: OemConfiguration[];
  schemes: SchemeVersion[];
  programmeMappings: EmployerProgrammeMappingVersion[];
  transactions: PurchaseTransaction[];
  eligibilityDecisions: EligibilityDecision[];
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

export interface AuditRepository {
  listAuditEvents(): Promise<AuditEvent[]>;
  listForEntity(
    entityType: AuditEvent["entityType"],
    entityId: string,
  ): Promise<AuditEvent[]>;
}

export interface SubventionRepository
  extends SchemeRepository,
    ProgrammeMappingRepository,
    PurchaseTransactionRepository,
    EligibilityDecisionRepository,
    AuditRepository {
  getSnapshot(): Promise<SubventionSnapshot>;
}
