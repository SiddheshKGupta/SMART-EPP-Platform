import type {
  GuidedJourney,
  IntegrationAdapterDemo,
  PlatformCommand,
  PlatformCommandResult,
  PlatformIntegrationOutcome,
  PlatformRepository,
  PlatformSnapshot,
} from "@smart-epp/domain";
import { createPlatformDemoSeed } from "./seed";

function advanceJourney(
  journey: GuidedJourney,
  stepId: string,
): GuidedJourney | undefined {
  const stepIndex = journey.steps.findIndex((step) => step.id === stepId);
  if (stepIndex < 0) return undefined;

  return {
    ...journey,
    steps: journey.steps.map((step, index) => ({
      ...step,
      status:
        index < stepIndex
          ? "COMPLETE"
          : index === stepIndex
            ? "CURRENT"
            : "UPCOMING",
    })),
  };
}

function simulateAdapter(
  adapter: IntegrationAdapterDemo,
  outcome: PlatformIntegrationOutcome,
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

export class InMemoryPlatformRepository implements PlatformRepository {
  private snapshot: PlatformSnapshot;

  constructor(snapshot: PlatformSnapshot = createPlatformDemoSeed()) {
    this.snapshot = structuredClone(snapshot);
  }

  async readSnapshot(): Promise<PlatformSnapshot> {
    return structuredClone(this.snapshot);
  }

  async execute(command: PlatformCommand): Promise<PlatformCommandResult> {
    const changed =
      command.type === "ADVANCE_GUIDED_JOURNEY"
        ? this.advanceGuidedJourney(command.journeyId, command.stepId)
        : this.simulateIntegration(
            command.adapterId,
            command.outcome,
            command.actorId,
          );

    return {
      changed,
      snapshot: structuredClone(this.snapshot),
    };
  }

  private advanceGuidedJourney(journeyId: string, stepId: string): boolean {
    const journeyIndex = this.snapshot.guidedJourneys.findIndex(
      (journey) => journey.id === journeyId,
    );
    if (journeyIndex < 0) return false;

    const current = this.snapshot.guidedJourneys[journeyIndex]!;
    const advanced = advanceJourney(current, stepId);
    if (!advanced) return false;

    const guidedJourneys = [...this.snapshot.guidedJourneys];
    guidedJourneys[journeyIndex] = advanced;
    this.snapshot = { ...this.snapshot, guidedJourneys };
    return true;
  }

  private simulateIntegration(
    adapterId: string,
    outcome: PlatformIntegrationOutcome,
    actorId: string,
  ): boolean {
    const adapterIndex = this.snapshot.integrations.findIndex(
      (adapter) => adapter.id === adapterId,
    );
    if (adapterIndex < 0) return false;

    const integrations = [...this.snapshot.integrations];
    integrations[adapterIndex] = simulateAdapter(
      integrations[adapterIndex]!,
      outcome,
      this.snapshot.generatedAt,
    );
    this.snapshot = {
      ...this.snapshot,
      integrations,
      auditEvents: [
        ...this.snapshot.auditEvents,
        {
          id: `audit-repository-${this.snapshot.auditEvents.length + 1}`,
          entityType: "IntegrationAdapter",
          entityId: adapterId,
          action: `MOCK_INTEGRATION_${outcome}`,
          actorId,
          reason: "Synthetic local demo outcome; no external data used.",
          occurredAt: this.snapshot.generatedAt,
        },
      ],
    };
    return true;
  }
}
