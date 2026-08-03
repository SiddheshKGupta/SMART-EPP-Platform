import { issue, type DomainIssue } from "./issues";
import type {
  Actor,
  CalculationBasis,
  EmployerProgrammeMappingVersion,
  MasterWorkflowStatus,
  SchemeVersion,
  SettlementCounterpartyType,
} from "./types";

export type MasterKind =
  | "OEM"
  | "DISTRIBUTOR"
  | "RESELLER"
  | "PRODUCT"
  | "EMPLOYER";

export interface MasterRecordBase {
  id: string;
  logicalId: string;
  version: number;
  kind: MasterKind;
  code: string;
  name: string;
  workflowStatus: MasterWorkflowStatus;
  effectiveFrom: string;
  effectiveTo: string;
  makerUserId: string;
  checkerUserId?: string;
  approvedAt?: string;
  supersedesVersionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OemMasterRecord extends MasterRecordBase {
  kind: "OEM";
  defaultClaimTimelineDays: number;
  defaultCalculationBasis: CalculationBasis;
  defaultSettlementCounterpartyType: SettlementCounterpartyType;
  defaultRateBps?: number;
  defaultFlatAmountPaise?: number;
}

export interface DistributorMasterRecord extends MasterRecordBase {
  kind: "DISTRIBUTOR";
  oemId: string;
}

export interface ResellerMasterRecord extends MasterRecordBase {
  kind: "RESELLER";
  oemId: string;
  distributorId: string;
}

export interface ProductMasterRecord extends MasterRecordBase {
  kind: "PRODUCT";
  oemId: string;
  model: string;
}

export interface EmployerMasterRecord extends MasterRecordBase {
  kind: "EMPLOYER";
  programmeCode: string;
}

export type MasterRecord =
  | OemMasterRecord
  | DistributorMasterRecord
  | ResellerMasterRecord
  | ProductMasterRecord
  | EmployerMasterRecord;

export interface MasterCatalogue {
  oems: OemMasterRecord[];
  distributors: DistributorMasterRecord[];
  resellers: ResellerMasterRecord[];
  products: ProductMasterRecord[];
  employers: EmployerMasterRecord[];
}

export type MasterCommandSource =
  | "MASTER_DATA_WORKBENCH"
  | "CONTROLLED_IMPORT";

export interface MasterCommand {
  actor: Actor;
  reason: string;
  source: MasterCommandSource;
}

export interface MasterDependency {
  entityType:
    | "MasterRecord"
    | "SchemeVersion"
    | "EmployerProgrammeMappingVersion";
  entityId: string;
  label: string;
}

export interface MasterDependencySnapshot {
  masters: MasterCatalogue;
  schemes: SchemeVersion[];
  programmeMappings: EmployerProgrammeMappingVersion[];
}

const catalogueKey: Record<MasterKind, keyof MasterCatalogue> = {
  OEM: "oems",
  DISTRIBUTOR: "distributors",
  RESELLER: "resellers",
  PRODUCT: "products",
  EMPLOYER: "employers",
};

function masterIssue(
  record: MasterRecord,
  input: Pick<DomainIssue, "code" | "field" | "message" | "recoveryAction">,
): DomainIssue {
  return issue({
    ...input,
    severity: "ERROR",
    entityType: "MasterRecord",
    entityId: record.id,
  });
}

function hasActiveRecord(
  records: readonly MasterRecord[],
  id: string,
): boolean {
  return records.some(
    (record) =>
      (record.id === id || record.logicalId === id) &&
      record.workflowStatus === "APPROVED",
  );
}

export function listMasterRecords(
  catalogue: MasterCatalogue,
  kind?: MasterKind,
): MasterRecord[] {
  if (kind) return [...catalogue[catalogueKey[kind]]];
  return [
    ...catalogue.oems,
    ...catalogue.distributors,
    ...catalogue.resellers,
    ...catalogue.products,
    ...catalogue.employers,
  ];
}

export function validateMasterRecord(
  record: MasterRecord,
  catalogue: MasterCatalogue,
): DomainIssue[] {
  const issues: DomainIssue[] = [];
  const sameKindRecords = listMasterRecords(catalogue, record.kind);
  const duplicateCode = sameKindRecords.some(
    (candidate) =>
      candidate.logicalId !== record.logicalId &&
      candidate.code.trim().toLocaleUpperCase("en-IN") ===
        record.code.trim().toLocaleUpperCase("en-IN"),
  );

  if (!record.id.trim()) {
    issues.push(
      masterIssue(record, {
        code: "MASTER_ID_REQUIRED",
        field: "id",
        message: "Master ID is required.",
        recoveryAction: "Provide a stable master identifier.",
      }),
    );
  }
  if (!record.code.trim()) {
    issues.push(
      masterIssue(record, {
        code: "MASTER_CODE_REQUIRED",
        field: "code",
        message: "Master code is required.",
        recoveryAction: "Provide a unique catalogue code.",
      }),
    );
  } else if (duplicateCode) {
    issues.push(
      masterIssue(record, {
        code: "MASTER_CODE_DUPLICATE",
        field: "code",
        message: `Code ${record.code} already exists for ${record.kind}.`,
        recoveryAction: "Use a unique code within this master catalogue.",
      }),
    );
  }
  if (!record.name.trim()) {
    issues.push(
      masterIssue(record, {
        code: "MASTER_NAME_REQUIRED",
        field: "name",
        message: "Master name is required.",
        recoveryAction: "Provide the controlled legal or catalogue name.",
      }),
    );
  }
  if (!record.logicalId.trim() || record.version < 1) {
    issues.push(
      masterIssue(record, {
        code: "MASTER_VERSION_IDENTITY_INVALID",
        field: "logicalId",
        message: "Master logical identity and version must be valid.",
        recoveryAction: "Provide a stable logical ID and a positive version.",
      }),
    );
  }
  if (record.effectiveFrom > record.effectiveTo) {
    issues.push(
      masterIssue(record, {
        code: "MASTER_EFFECTIVE_WINDOW_INVALID",
        field: "effectiveTo",
        message: "Master effective from date must not be after effective to date.",
        recoveryAction: "Correct the effective date window.",
      }),
    );
  }

  if (record.kind === "OEM") {
    if (record.defaultClaimTimelineDays <= 0) {
      issues.push(
        masterIssue(record, {
          code: "MASTER_OEM_TIMELINE_INVALID",
          field: "defaultClaimTimelineDays",
          message: "OEM default claim timeline must be positive.",
          recoveryAction: "Provide a positive configured claim timeline.",
        }),
      );
    }
  } else if (
    record.kind === "DISTRIBUTOR" ||
    record.kind === "RESELLER" ||
    record.kind === "PRODUCT"
  ) {
    const oemExists = hasActiveRecord(catalogue.oems, record.oemId);
    if (!oemExists) {
      issues.push(
        masterIssue(record, {
          code: "MASTER_OEM_NOT_FOUND",
          field: "oemId",
          message: `OEM ${record.oemId} does not exist or is inactive.`,
          recoveryAction: "Select an active OEM master.",
        }),
      );
    }
  }

  if (record.kind === "RESELLER") {
    const distributorExists = hasActiveRecord(
      catalogue.distributors,
      record.distributorId,
    );
    if (!distributorExists) {
      issues.push(
        masterIssue(record, {
          code: "MASTER_DISTRIBUTOR_NOT_FOUND",
          field: "distributorId",
          message: `Distributor ${record.distributorId} does not exist or is inactive.`,
          recoveryAction: "Select an active distributor master.",
        }),
      );
    }
  }

  if (record.kind === "PRODUCT" && !record.model.trim()) {
    issues.push(
      masterIssue(record, {
        code: "MASTER_PRODUCT_MODEL_REQUIRED",
        field: "model",
        message: "Product model is required.",
        recoveryAction: "Provide the OEM model name.",
      }),
    );
  }

  if (record.kind === "EMPLOYER" && !record.programmeCode.trim()) {
    issues.push(
      masterIssue(record, {
        code: "MASTER_EMPLOYER_PROGRAMME_CODE_REQUIRED",
        field: "programmeCode",
        message: "Employer programme code is required.",
        recoveryAction: "Provide the employer programme code.",
      }),
    );
  }

  return issues;
}

export function masterDependencies(
  masterId: string,
  snapshot: MasterDependencySnapshot,
): MasterDependency[] {
  const dependencies: MasterDependency[] = [];
  const target = listMasterRecords(snapshot.masters).find(
    (record) => record.id === masterId,
  );
  const referencedIds = new Set([masterId, target?.logicalId].filter(Boolean));
  const add = (
    entityType: MasterDependency["entityType"],
    entityId: string,
    label: string,
  ) => dependencies.push({ entityType, entityId, label });

  listMasterRecords(snapshot.masters).forEach((record) => {
    if (record.workflowStatus !== "APPROVED" || record.id === masterId) return;
    const referencesMaster =
      (record.kind === "DISTRIBUTOR" && referencedIds.has(record.oemId)) ||
      (record.kind === "RESELLER" &&
        (referencedIds.has(record.oemId) ||
          referencedIds.has(record.distributorId))) ||
      (record.kind === "PRODUCT" && referencedIds.has(record.oemId));
    if (referencesMaster) add("MasterRecord", record.id, record.name);
  });

  snapshot.schemes
    .filter((scheme) => scheme.workflowStatus === "APPROVED")
    .forEach((scheme) => {
      if (
        referencedIds.has(scheme.oemId) ||
        (scheme.distributorId !== undefined &&
          referencedIds.has(scheme.distributorId)) ||
        scheme.eligibleProductIds.some((id) => referencedIds.has(id))
      ) {
        add("SchemeVersion", scheme.id, `${scheme.code} v${scheme.version}`);
      }
    });

  snapshot.programmeMappings
    .filter((mapping) => mapping.workflowStatus === "APPROVED")
    .forEach((mapping) => {
      if (
        referencedIds.has(mapping.oemId) ||
        (mapping.distributorId !== undefined &&
          referencedIds.has(mapping.distributorId)) ||
        (mapping.resellerId !== undefined && referencedIds.has(mapping.resellerId)) ||
        referencedIds.has(mapping.employerId)
      ) {
        add(
          "EmployerProgrammeMappingVersion",
          mapping.id,
          `${mapping.mappingId} v${mapping.version}`,
        );
      }
    });

  return dependencies;
}

export type MasterLifecycleAction =
  | "SUBMIT"
  | "APPROVE"
  | "RETURN"
  | "REJECT"
  | "DEACTIVATE";

const masterStatusForAction: Record<MasterLifecycleAction, MasterWorkflowStatus> = {
  SUBMIT: "SUBMITTED",
  APPROVE: "APPROVED",
  RETURN: "RETURNED",
  REJECT: "REJECTED",
  DEACTIVATE: "INACTIVE",
};

const allowedMasterActions: Record<MasterWorkflowStatus, MasterLifecycleAction[]> = {
  DRAFT: ["SUBMIT"],
  RETURNED: ["SUBMIT"],
  SUBMITTED: ["APPROVE", "RETURN", "REJECT"],
  APPROVED: ["DEACTIVATE"],
  REJECTED: [],
  SUPERSEDED: [],
  INACTIVE: [],
};

export function transitionMasterRecord<T extends MasterRecord>(
  record: T,
  action: MasterLifecycleAction,
  actor: Actor,
  occurredAt: string,
): T {
  if (!allowedMasterActions[record.workflowStatus].includes(action)) {
    throw new Error(`${action} is not allowed from ${record.workflowStatus}`);
  }
  if (
    (action === "APPROVE" || action === "DEACTIVATE") &&
    actor.userId === record.makerUserId
  ) {
    throw new Error("Maker cannot approve own work");
  }
  return {
    ...record,
    workflowStatus: masterStatusForAction[action],
    checkerUserId:
      action === "APPROVE" || action === "DEACTIVATE"
        ? actor.userId
        : record.checkerUserId,
    approvedAt: action === "APPROVE" ? occurredAt : record.approvedAt,
    updatedAt: occurredAt,
  };
}

export function validateMasterVersionApproval(
  candidate: MasterRecord,
  catalogue: MasterCatalogue,
): DomainIssue[] {
  const issues: DomainIssue[] = [];
  const versions = listMasterRecords(catalogue, candidate.kind).filter(
    (record) => record.logicalId === candidate.logicalId && record.id !== candidate.id,
  );
  const predecessor = candidate.supersedesVersionId
    ? versions.find((record) => record.id === candidate.supersedesVersionId)
    : undefined;

  if (candidate.version > 1) {
    if (
      !predecessor ||
      predecessor.version !== candidate.version - 1 ||
      predecessor.workflowStatus !== "APPROVED"
    ) {
      issues.push(
        masterIssue(candidate, {
          code: "MASTER_PREDECESSOR_INVALID",
          field: "supersedesVersionId",
          message: "Successor must reference the approved immediate predecessor.",
          recoveryAction: "Recreate the successor from the current approved version.",
        }),
      );
    }
  }

  const overlap = versions.find(
    (record) =>
      record.workflowStatus === "APPROVED" &&
      candidate.effectiveFrom <= record.effectiveTo &&
      record.effectiveFrom <= candidate.effectiveTo,
  );
  if (overlap) {
    issues.push(
      masterIssue(candidate, {
        code: "MASTER_VERSION_OVERLAP",
        field: "effectiveFrom",
        message: `Effective window overlaps approved version ${overlap.version}.`,
        recoveryAction: "Use a non-overlapping effective date window.",
      }),
    );
  }
  return issues;
}
