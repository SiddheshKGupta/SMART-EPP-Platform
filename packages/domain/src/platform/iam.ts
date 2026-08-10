import type { PlatformModuleKey } from "./module-registry";

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
