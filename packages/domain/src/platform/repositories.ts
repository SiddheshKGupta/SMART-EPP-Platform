import type { PlatformSnapshot } from "./types";

export type PlatformIntegrationOutcome = "SUCCESS" | "PARTIAL" | "FAILURE";

export type PlatformCommand =
  | {
      type: "ADVANCE_GUIDED_JOURNEY";
      journeyId: string;
      stepId: string;
    }
  | {
      type: "SIMULATE_INTEGRATION";
      adapterId: string;
      outcome: PlatformIntegrationOutcome;
      actorId: string;
    };

export interface PlatformCommandResult {
  changed: boolean;
  snapshot: PlatformSnapshot;
}

/** Read-side port. Implementations may compose this projection from many tables. */
export interface PlatformQueryPort {
  readSnapshot(): Promise<PlatformSnapshot>;
}

/** Command-side port. Commands express intent instead of replacing all stored data. */
export interface PlatformCommandPort {
  execute(command: PlatformCommand): Promise<PlatformCommandResult>;
}

export interface PlatformRepository
  extends PlatformQueryPort,
    PlatformCommandPort {}
