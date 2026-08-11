"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AccessProfile,
  IntegrationAdapterDemo,
  PlatformSnapshot,
} from "@smart-epp/domain";
import { evaluateAccess, projectPlatformSnapshotForProfile } from "@smart-epp/domain";
import { createPlatformDemoSeed } from "../data/seed";

type IntegrationOutcome = "SUCCESS" | "PARTIAL" | "FAILURE";
export type WorkbenchCommandOutcome = "COMPLETED" | "DENIED" | "NOT_FOUND" | "NO_ACTION" | "ALREADY_COMPLETED";
export type WorkbenchCommandResult = { outcome: WorkbenchCommandOutcome; message: string; snapshot: PlatformSnapshot };

export interface PlatformContextValue {
  snapshot: PlatformSnapshot;
  activeProfile: AccessProfile;
  setActiveProfile(profile: AccessProfile): void;
  activeJourneyId: string | null;
  startJourney(journeyId: string): void;
  stopJourney(): void;
  setJourneyStep(stepId: string): void;
  registerJourneyTrigger(element: HTMLElement | null): void;
  simulateIntegration(adapterId: string, outcome: IntegrationOutcome): void;
  executeWorkItem(workItemId: string, reason: string, breakGlassReason?: string): WorkbenchCommandResult;
}

const ALL_ACTIONS = [
  "READ",
  "CREATE",
  "EDIT",
  "SUBMIT",
  "APPROVE",
  "REJECT",
  "RETURN",
  "REOPEN",
  "OVERRIDE",
  "EXPORT",
  "CONFIGURE",
  "DELETE",
] as const;

const DEMO_PROFILES: AccessProfile[] = [
  {
    userId: "operations-demo",
    roleKeys: ["OPERATIONS"],
    grants: [
      {
        module: "APPLICATIONS_ELIGIBILITY",
        actions: ["CREATE", "EDIT", "SUBMIT", "RETURN"],
      },
      {
        module: "ORDERS_APPROVALS",
        actions: ["CREATE", "EDIT", "SUBMIT", "RETURN"],
      },
      {
        module: "DOCUMENTS_EVIDENCE",
        actions: ["CREATE", "EDIT", "SUBMIT"],
      },
      {
        module: "EXCEPTIONS_RECONCILIATIONS",
        actions: ["EDIT", "SUBMIT", "REOPEN"],
      },
    ],
    dataScopes: ["ALL_EMPLOYERS"],
    maskedFields: ["employee.bankAccount", "employee.pan"],
    isAdmin: false,
    isManagement: false,
  },
  {
    userId: "management-demo",
    roleKeys: ["MANAGEMENT"],
    grants: [{ module: "ALL", actions: [...ALL_ACTIONS] }],
    dataScopes: ["ALL_EMPLOYERS"],
    maskedFields: ["employee.bankAccount", "employee.pan"],
    isAdmin: false,
    isManagement: true,
  },
  {
    userId: "admin-demo",
    roleKeys: ["ADMIN"],
    grants: [{ module: "ALL", actions: [...ALL_ACTIONS] }],
    dataScopes: ["ALL"],
    maskedFields: [],
    isAdmin: true,
    isManagement: false,
  },
  {
    userId: "auditor-demo",
    roleKeys: ["AUDITOR"],
    grants: [],
    dataScopes: ["ALL_EMPLOYERS"],
    maskedFields: ["employee.bankAccount", "employee.pan"],
    isAdmin: false,
    isManagement: false,
  },
];

export function createDefaultPlatformSnapshot(): PlatformSnapshot {
  const snapshot = createPlatformDemoSeed();
  return {
    ...snapshot,
    profiles: structuredClone(DEMO_PROFILES),
  };
}

function simulatedAdapter(
  adapter: IntegrationAdapterDemo,
  outcome: IntegrationOutcome,
  occurredAt: string,
): IntegrationAdapterDemo {
  switch (outcome) {
    case "SUCCESS":
      return {
        ...adapter,
        status: "HEALTHY",
        lastSyncAt: occurredAt,
        accepted: adapter.accepted + 1,
        pending: Math.max(0, adapter.pending - 1),
      };
    case "PARTIAL":
      return {
        ...adapter,
        status: "PARTIAL",
        lastSyncAt: occurredAt,
        accepted: adapter.accepted + 1,
        rejected: adapter.rejected + 1,
        pending: adapter.pending + 1,
      };
    case "FAILURE":
      return {
        ...adapter,
        status: "FAILED",
        lastSyncAt: occurredAt,
        rejected: adapter.rejected + 1,
        pending: adapter.pending + 1,
      };
  }
}

export function transitionJourneyStep(
  snapshot: PlatformSnapshot,
  journeyId: string,
  stepId: string,
): PlatformSnapshot {
  const journey = snapshot.guidedJourneys.find(
    (candidate) => candidate.id === journeyId,
  );
  const stepIndex = journey?.steps.findIndex((step) => step.id === stepId) ?? -1;
  if (stepIndex < 0) return snapshot;

  return {
    ...snapshot,
    guidedJourneys: snapshot.guidedJourneys.map((candidate) =>
      candidate.id !== journeyId
        ? candidate
        : {
            ...candidate,
            steps: candidate.steps.map((step, index) => ({
              ...step,
              status:
                index < stepIndex
                  ? "COMPLETE"
                  : index === stepIndex
                    ? "CURRENT"
                    : "UPCOMING",
            })),
          },
    ),
  };
}

export function focusJourneyTrigger(trigger: HTMLElement | null): HTMLElement | null {
  if (!trigger?.isConnected) return null;
  trigger.focus();
  return trigger;
}

export function simulateIntegrationSnapshot(
  snapshot: PlatformSnapshot,
  adapterId: string,
  outcome: IntegrationOutcome,
  actorId = "platform-demo",
): PlatformSnapshot {
  if (!snapshot.integrations.some((adapter) => adapter.id === adapterId)) {
    return snapshot;
  }
  return {
    ...snapshot,
    integrations: snapshot.integrations.map((adapter) =>
      adapter.id === adapterId
        ? simulatedAdapter(adapter, outcome, snapshot.generatedAt)
        : adapter,
    ),
    auditEvents: [...snapshot.auditEvents, {
      id: nextAuditEventId(snapshot),
      entityType: "IntegrationAdapter",
      entityId: adapterId,
      action: `MOCK_INTEGRATION_${outcome}`,
      actorId,
      reason: "Synthetic local demo outcome; no external data used.",
      outcome: outcome === "SUCCESS" ? "SUCCESS" : outcome === "PARTIAL" ? "PARTIAL" : "FAILURE",
      occurredAt: snapshot.generatedAt,
    }],
  };
}

const nextAuditEventId = (snapshot: PlatformSnapshot): string =>
  `audit-event-${String(snapshot.auditEvents.length + 1).padStart(4, "0")}`;

const workbenchResult = (
  snapshot: PlatformSnapshot,
  outcome: WorkbenchCommandOutcome,
  message: string,
): WorkbenchCommandResult => ({ outcome, message, snapshot });

export function executeWorkItemForProfile(
  snapshot: PlatformSnapshot,
  profile: AccessProfile,
  workItemId: string,
  reason: string,
  breakGlassReason?: string,
): WorkbenchCommandResult {
  const item = snapshot.workItems.find((candidate) => candidate.id === workItemId);
  if (!item) return workbenchResult(snapshot, "NOT_FOUND", "Work item was not found.");

  const action = item.requestedAction;
  if (!action) return workbenchResult(snapshot, "NO_ACTION", "No controlled action is configured for this work item.");

  const decision = evaluateAccess({
    profile,
    module: item.module,
    action,
    initiatedBy: item.initiatedBy,
    breakGlassReason,
  });
  const auditAction = `WORK_ITEM_${action}`;
  const appendAudit = (current: PlatformSnapshot, outcome: "SUCCESS" | "DENIED" | "NO_CHANGE", auditReason: string): PlatformSnapshot => ({
    ...current,
    auditEvents: [...current.auditEvents, {
      id: nextAuditEventId(current),
      entityType: "WorkItem",
      entityId: item.id,
      action: auditAction,
      actorId: profile.userId,
      reason: auditReason,
      outcome,
      occurredAt: current.generatedAt,
    }],
  });

  if (!decision.allowed) {
    const denied = appendAudit(snapshot, "DENIED", `${reason} IAM decision: ${decision.reason}`);
    return workbenchResult(denied, "DENIED", decision.reason);
  }
  if (item.completedAt) {
    const unchanged = appendAudit(snapshot, "NO_CHANGE", `${reason} Work item was already completed.`);
    return workbenchResult(unchanged, "ALREADY_COMPLETED", "This work item was already completed.");
  }

  const transitioned: PlatformSnapshot = {
    ...snapshot,
    workItems: snapshot.workItems.map((candidate) => candidate.id === item.id ? {
      ...candidate,
      completedAt: snapshot.generatedAt,
      completedBy: profile.userId,
    } : candidate),
  };
  const completed = appendAudit(transitioned, "SUCCESS", breakGlassReason?.trim() || reason);
  return workbenchResult(completed, "COMPLETED", `${action.toLowerCase().replace(/^./, (letter) => letter.toUpperCase())} completed for ${item.title}.`);
}

export function simulateIntegrationForProfile(
  snapshot: PlatformSnapshot,
  profile: AccessProfile,
  adapterId: string,
  outcome: IntegrationOutcome,
): PlatformSnapshot {
  return evaluateAccess({ profile, module: "ADMIN", action: "CONFIGURE" }).allowed
    ? simulateIntegrationSnapshot(snapshot, adapterId, outcome, profile.userId)
    : snapshot;
}

const PlatformContext = createContext<PlatformContextValue | undefined>(undefined);

export function PlatformProvider({ children, initialSnapshot }: { children: ReactNode; initialSnapshot?: PlatformSnapshot }) {
  const [snapshot, setSnapshot] = useState<PlatformSnapshot>(
    () => initialSnapshot ? structuredClone(initialSnapshot) : createDefaultPlatformSnapshot(),
  );
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const [activeProfileId, setActiveProfileId] = useState("operations-demo");
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const activeJourneyRef = useRef<string | null>(activeJourneyId);
  const journeyTriggerRef = useRef<HTMLElement | null>(null);
  activeJourneyRef.current = activeJourneyId;

  const setActiveProfile = useCallback((profile: AccessProfile) => {
    if (
      snapshotRef.current.profiles.some(
        (candidate) => candidate.userId === profile.userId,
      )
    ) {
      setActiveProfileId(profile.userId);
    }
  }, []);

  const startJourney = useCallback((journeyId: string) => {
    if (
      snapshotRef.current.guidedJourneys.some(
        (journey) => journey.id === journeyId,
      )
    ) {
      activeJourneyRef.current = journeyId;
      setActiveJourneyId(journeyId);
    }
  }, []);

  const stopJourney = useCallback(() => {
    activeJourneyRef.current = null;
    setActiveJourneyId(null);
    const trigger = journeyTriggerRef.current;
    requestAnimationFrame(() => {
      journeyTriggerRef.current = focusJourneyTrigger(trigger);
    });
  }, []);

  const registerJourneyTrigger = useCallback((element: HTMLElement | null) => {
    journeyTriggerRef.current = element;
  }, []);

  const setJourneyStep = useCallback((stepId: string) => {
    setSnapshot((current) => {
      const journeyId = activeJourneyRef.current;
      if (!journeyId) return current;
      return transitionJourneyStep(current, journeyId, stepId);
    });
  }, []);

  const simulateIntegration = useCallback(
    (adapterId: string, outcome: IntegrationOutcome) => {
      setSnapshot((current) => {
        const profile = current.profiles.find((candidate) => candidate.userId === activeProfileId);
        return profile ? simulateIntegrationForProfile(current, profile, adapterId, outcome) : current;
      });
    },
    [activeProfileId],
  );

  const executeWorkItem = useCallback(
    (workItemId: string, reason: string, breakGlassReason?: string) => {
      const current = snapshotRef.current;
      const profile = current.profiles.find((candidate) => candidate.userId === activeProfileId);
      if (!profile) return workbenchResult(current, "DENIED", "The active IAM profile is unavailable.");
      const result = executeWorkItemForProfile(current, profile, workItemId, reason, breakGlassReason);
      snapshotRef.current = result.snapshot;
      setSnapshot(result.snapshot);
      return result;
    },
    [activeProfileId],
  );

  const contextValue = useMemo<PlatformContextValue>(() => {
    const activeProfile =
      snapshot.profiles.find((profile) => profile.userId === activeProfileId) ??
      snapshot.profiles[0]!;
    return {
      snapshot: projectPlatformSnapshotForProfile(snapshot, activeProfile),
      activeProfile: structuredClone(activeProfile),
      setActiveProfile,
      activeJourneyId,
      startJourney,
      stopJourney,
      setJourneyStep,
      registerJourneyTrigger,
      simulateIntegration,
      executeWorkItem,
    };
  }, [
    activeJourneyId,
    activeProfileId,
    setActiveProfile,
    setJourneyStep,
    registerJourneyTrigger,
    simulateIntegration,
    executeWorkItem,
    snapshot,
    startJourney,
    stopJourney,
  ]);

  return (
    <PlatformContext.Provider value={contextValue}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformContextValue {
  const value = useContext(PlatformContext);
  if (!value) {
    throw new Error("usePlatform must be used within PlatformProvider");
  }
  return value;
}
