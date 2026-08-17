import type { PlatformModuleKey } from "./module-registry";
import type { PlatformSnapshot } from "./types";

export type PlatformAction =
  | "READ"
  | "CREATE"
  | "EDIT"
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "RETURN"
  | "REOPEN"
  | "OVERRIDE"
  | "EXPORT"
  | "CONFIGURE"
  | "DELETE";

export interface AccessProfile {
  userId: string;
  roleKeys: string[];
  grants: Array<{
    module: PlatformModuleKey | "ALL";
    actions: PlatformAction[];
  }>;
  dataScopes: string[];
  maskedFields: string[];
  isAdmin: boolean;
  isManagement: boolean;
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  requiresBreakGlass: boolean;
  maskedFields: string[];
}

export interface AccessEvaluationInput {
  profile: AccessProfile;
  module: PlatformModuleKey;
  action: PlatformAction;
  initiatedBy?: string;
  breakGlassReason?: string;
}

export interface ApprovalSeparationInput {
  profile: AccessProfile;
  action: PlatformAction;
  initiatedBy?: string;
  breakGlassReason?: string;
}

const isSelfApproval = ({
  profile,
  action,
  initiatedBy,
}: ApprovalSeparationInput): boolean =>
  action === "APPROVE" && initiatedBy === profile.userId;

const requiresBreakGlassApproval = (input: ApprovalSeparationInput): boolean =>
  isSelfApproval(input) && (input.profile.isAdmin || input.profile.isManagement);

export const assertApprovalSeparation = (
  input: ApprovalSeparationInput,
): void => {
  if (isSelfApproval(input) && !requiresBreakGlassApproval(input)) {
    throw new Error("Approval separation prohibits self-approval.");
  }

  if (
    requiresBreakGlassApproval(input) &&
    (input.breakGlassReason?.trim().length ?? 0) < 20
  ) {
    throw new Error(
      "Break-glass approval requires a reason of at least 20 characters.",
    );
  }
};

const hasGrant = ({ profile, module, action }: AccessEvaluationInput): boolean =>
  profile.grants.some(
    (grant) =>
      (grant.module === module || grant.module === "ALL") &&
      grant.actions.includes(action),
  );

export const evaluateAccess = (input: AccessEvaluationInput): AccessDecision => {
  const requiresBreakGlass = requiresBreakGlassApproval(input);

  try {
    assertApprovalSeparation(input);
  } catch {
    return {
      allowed: false,
      reason: requiresBreakGlass
        ? "Break-glass approval requires a reason of at least 20 characters."
        : "Approval separation prohibits self-approval.",
      requiresBreakGlass,
      maskedFields: input.profile.maskedFields,
    };
  }

  if (input.action === "READ") {
    return {
      allowed: true,
      reason: "Read access is available to every authenticated employee.",
      requiresBreakGlass,
      maskedFields: input.profile.maskedFields,
    };
  }

  if (hasGrant(input)) {
    return {
      allowed: true,
      reason: "Access is allowed by an explicit grant.",
      requiresBreakGlass,
      maskedFields: input.profile.maskedFields,
    };
  }

  return {
    allowed: false,
    reason: "This action requires an explicit IAM grant.",
    requiresBreakGlass,
    maskedFields: input.profile.maskedFields,
  };
};

const employerScope = (
  snapshot: PlatformSnapshot,
  profile: AccessProfile,
): Set<string> => {
  if (
    profile.dataScopes.some((scope) =>
      ["ALL", "ALL_EMPLOYERS", "PORTFOLIO"].includes(scope),
    )
  ) {
    return new Set(snapshot.employers.map((employer) => employer.id));
  }

  return new Set(
    profile.dataScopes
      .filter((scope) => scope.startsWith("EMPLOYER:"))
      .map((scope) => scope.slice("EMPLOYER:".length)),
  );
};

/**
 * Authoritative read projection for the prototype boundary. Module discovery
 * remains universal; only employer-linked records and sensitive fields are
 * reduced before the snapshot is handed to UI consumers.
 */
export const projectPlatformSnapshotForProfile = (
  source: PlatformSnapshot,
  profile: AccessProfile,
): PlatformSnapshot => {
  const snapshot = structuredClone(source);
  const employerIds = employerScope(snapshot, profile);
  const employers = snapshot.employers.filter((record) => employerIds.has(record.id));
  const employees = snapshot.employees
    .filter((record) => employerIds.has(record.employerId))
    .map((record) => ({
      ...record,
      payrollId: profile.maskedFields.includes("employee.payrollId") ? "REDACTED" : record.payrollId,
      pan: profile.maskedFields.includes("employee.pan") ? "REDACTED" : record.pan,
      bankAccount: profile.maskedFields.includes("employee.bankAccount") ? "REDACTED" : record.bankAccount,
    }));
  const employeeIds = new Set(employees.map((record) => record.id));
  const applications = snapshot.applications.filter((record) => employeeIds.has(record.employeeId));
  const applicationIds = new Set(applications.map((record) => record.id));
  const assetIds = new Set(applications.map((record) => record.assetId));
  const leases = snapshot.leases.filter((record) => applicationIds.has(record.applicationId));
  const leaseIds = new Set(leases.map((record) => record.id));
  const workItems = snapshot.workItems.filter((record) => employerIds.has(record.employerId));
  const workItemIds = new Set(workItems.map((record) => record.id));
  const auditEvents = snapshot.auditEvents.filter((event) => {
    if (event.entityType === "Employer") return employerIds.has(event.entityId);
    if (event.entityType === "Application") return applicationIds.has(event.entityId);
    if (event.entityType === "Lease") return leaseIds.has(event.entityId);
    if (event.entityType === "WorkItem") return workItemIds.has(event.entityId);
    return true;
  });

  return {
    ...snapshot,
    employers,
    employees,
    applications,
    assets: snapshot.assets.filter((record) => assetIds.has(record.id)),
    leases,
    workItems,
    guidedJourneys: snapshot.guidedJourneys.filter((record) => employerIds.has(record.employerId)),
    exceptions: snapshot.exceptions.filter((record) => employerIds.has(record.employerId)),
    auditEvents,
  };
};
