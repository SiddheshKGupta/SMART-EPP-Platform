import type {
  PlatformCommand,
  PlatformCommandResult,
  PlatformRepository,
  PlatformSnapshot,
} from "@smart-epp/domain";
import { InMemoryPlatformRepository } from "../data/InMemoryPlatformRepository";
import { SupabasePlatformRepository } from "../data/SupabasePlatformRepository";

export interface PlatformApplication {
  loadSnapshot(): Promise<PlatformSnapshot>;
  execute(command: PlatformCommand): Promise<PlatformCommandResult>;
}

/**
 * Provider-neutral application boundary. A later PostgreSQL/Supabase adapter can
 * be injected here without exposing its SDK to domain or UI modules.
 */
export function createPlatformApplication(
  repository: PlatformRepository = createConfiguredRepository(),
): PlatformApplication {
  return {
    loadSnapshot: () => repository.readSnapshot(),
    execute: (command) => repository.execute(command),
  };
}

function createConfiguredRepository(): PlatformRepository {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && publishableKey
    ? new SupabasePlatformRepository(url, publishableKey)
    : new InMemoryPlatformRepository();
}
