import type {
  PlatformCommand,
  PlatformCommandResult,
  PlatformRepository,
  PlatformSnapshot,
} from "@smart-epp/domain";
import { InMemoryPlatformRepository } from "../data/InMemoryPlatformRepository";

export interface PlatformApplication {
  loadSnapshot(): Promise<PlatformSnapshot>;
  execute(command: PlatformCommand): Promise<PlatformCommandResult>;
}

/**
 * Provider-neutral application boundary. A later PostgreSQL/Supabase adapter can
 * be injected here without exposing its SDK to domain or UI modules.
 */
export function createPlatformApplication(
  repository: PlatformRepository = new InMemoryPlatformRepository(),
): PlatformApplication {
  return {
    loadSnapshot: () => repository.readSnapshot(),
    execute: (command) => repository.execute(command),
  };
}
