import type { Actor, MasterWorkflowStatus } from "./types";

export interface VersionedMaster {
  workflowStatus: MasterWorkflowStatus;
  makerUserId: string;
  checkerUserId?: string;
  approvedAt?: string;
}

type MasterAction = "SUBMIT" | "APPROVE" | "RETURN" | "REJECT";

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

export function transitionMaster<T extends VersionedMaster>(
  master: T,
  action: MasterAction,
  actor: Actor,
  remarks: string,
  occurredAt: string,
): T {
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
