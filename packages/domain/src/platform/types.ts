import type { AccessProfile, PlatformAction } from "./iam";
import type { PlatformModuleKey } from "./module-registry";

export type OperatingState =
  | "HEALTHY"
  | "PENDING"
  | "OVERDUE"
  | "REJECTED"
  | "RECONCILED";

export type ProgrammeStage = "ONBOARDING" | "IMPLEMENTATION" | "ACTIVE";
export type WorkQueueKey = "MY_TASKS" | "MY_APPROVALS" | "MY_EXCEPTIONS" | "TEAM_QUEUES" | "UNASSIGNED_WORK" | "NOTIFICATIONS" | "ESCALATIONS" | "DELEGATIONS" | "RECENTLY_VIEWED";
export interface EmployerRecord { id: string; name: string; programmeId: string; programmeStage: ProgrammeStage; sanctionPaise: number; utilisedPaise: number; status: OperatingState; }
export interface EmployeeRecord { id: string; employerId: string; name: string; payrollId: string; status: OperatingState; }
export interface ApplicationRecord { id: string; employeeId: string; assetId: string; requestedPaise: number; reservedPaise: number; status: OperatingState; }
export interface AssetRecord { id: string; oem: string; model: string; category: string; serialNumber: string; invoiceValuePaise: number; }
export interface LeaseRecord { id: string; applicationId: string; lotId: string; tenureMonths: number; rentalPaise: number; residualValuePaise: number; status: OperatingState; }
export interface WorkItem { id: string; module: PlatformModuleKey; title: string; owner: string; assignedUserId?: string; queueKeys: WorkQueueKey[]; initiatedBy?: string; requestedAction?: PlatformAction; dueDate: string; state: OperatingState; financialImpactPaise: number; href: string; }
export interface GuidedJourney { id: string; employerId: string; employeeId: string; applicationId: string; leaseId: string; steps: Array<{ id: string; label: string; href: string; status: "COMPLETE" | "CURRENT" | "UPCOMING" }>; }
export interface IntegrationAdapterDemo { id: string; name: string; mode: "MOCK"; status: "HEALTHY" | "PARTIAL" | "FAILED"; lastSyncAt: string; accepted: number; rejected: number; pending: number; }
export interface PlatformAuditEvent { id: string; entityType: string; entityId: string; action: string; actorId: string; reason: string; occurredAt: string; }

export interface PlatformSnapshot {
  generatedAt: string;
  profiles: AccessProfile[];
  employers: EmployerRecord[];
  employees: EmployeeRecord[];
  applications: ApplicationRecord[];
  assets: AssetRecord[];
  leases: LeaseRecord[];
  workItems: WorkItem[];
  guidedJourneys: GuidedJourney[];
  integrations: IntegrationAdapterDemo[];
  auditEvents: PlatformAuditEvent[];
}
