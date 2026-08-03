import type { Actor, MasterWorkflowStatus } from "./types";

export interface VersionedMaster {
  workflowStatus: MasterWorkflowStatus;
  makerUserId: string;
  checkerUserId?: string;
  approvedAt?: string;
}

export type MasterAction = "SUBMIT" | "APPROVE" | "RETURN" | "REJECT";
export type MasterMutationAction = "CREATE" | "SAVE" | MasterAction;
export type SubventionCommandAction =
  | MasterMutationAction
  | "IMPORT_PURCHASE"
  | "EVALUATE_ELIGIBILITY";

const commandRoles: Record<SubventionCommandAction, readonly string[]> = {
  CREATE: ["SALES_OPS_MAKER", "MASTER_DATA_ADMIN"],
  SAVE: ["SALES_OPS_MAKER", "MASTER_DATA_ADMIN"],
  SUBMIT: ["SALES_OPS_MAKER"],
  APPROVE: ["BUSINESS_HEAD_CHECKER"],
  RETURN: ["BUSINESS_HEAD_CHECKER"],
  REJECT: ["BUSINESS_HEAD_CHECKER"],
  IMPORT_PURCHASE: ["SALES_OPS_MAKER"],
  EVALUATE_ELIGIBILITY: ["SALES_OPS_MAKER"],
};

export function assertSubventionCommandAuthorized(
  actor: Actor,
  action: SubventionCommandAction,
): void {
  if (!commandRoles[action].includes(actor.role)) {
    throw new Error(`${actor.role} is not authorized to ${action}`);
  }
}

const allowed = {
  DRAFT: ["SUBMIT"],
  RETURNED: ["SUBMIT"],
  SUBMITTED: ["APPROVE", "RETURN", "REJECT"],
  APPROVED: [],
  REJECTED: [],
  SUPERSEDED: [],
  INACTIVE: [],
} as const;

const statusForAction: Record<MasterAction, MasterWorkflowStatus> = {
  SUBMIT: "SUBMITTED",
  APPROVE: "APPROVED",
  RETURN: "RETURNED",
  REJECT: "REJECTED",
};

export function assertMasterMutationAuthorized(
  actor: Actor,
  action: MasterMutationAction,
): void {
  try {
    assertSubventionCommandAuthorized(actor, action);
  } catch {
    throw new Error(
      `${actor.role} is not authorized to ${action} master data`,
    );
  }
}

export function transitionMaster<T extends VersionedMaster>(
  master: T,
  action: MasterAction,
  actor: Actor,
  remarks: string,
  occurredAt: string,
): T {
  assertMasterMutationAuthorized(actor, action);

  if (master.workflowStatus === "APPROVED") {
    throw new Error("Approved master version is immutable");
  }

  if (!remarks.trim()) {
    throw new Error("Remarks are required");
  }

  if (!allowed[master.workflowStatus].includes(action as never)) {
    throw new Error(`${action} is not allowed from ${master.workflowStatus}`);
  }

  if (action === "APPROVE") {
    if (actor.userId === master.makerUserId) {
      throw new Error("Maker cannot approve own work");
    }

    return {
      ...master,
      workflowStatus: statusForAction[action],
      checkerUserId: actor.userId,
      approvedAt: occurredAt,
    } as T;
  }

  return {
    ...master,
    workflowStatus: statusForAction[action],
  } as T;
}
