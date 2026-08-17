export interface DomainIssue {
  code: string;
  severity: "ERROR" | "WARNING" | "REVIEW";
  entityType: string;
  entityId?: string;
  field?: string;
  message: string;
  recoveryAction: string;
}

export function issue(input: DomainIssue): DomainIssue {
  return input;
}
