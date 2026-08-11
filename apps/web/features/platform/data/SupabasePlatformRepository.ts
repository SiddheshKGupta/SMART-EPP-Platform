import type { PlatformCommand, PlatformCommandResult, PlatformRepository, PlatformSnapshot } from "@smart-epp/domain";
import { InMemoryPlatformRepository } from "./InMemoryPlatformRepository";

export class SupabasePlatformRepository implements PlatformRepository {
  private readonly fallback = new InMemoryPlatformRepository();

  constructor(private readonly url: string, private readonly publishableKey: string) {}

  async readSnapshot(): Promise<PlatformSnapshot> {
    try {
      const response = await fetch(`${this.url.replace(/\/$/, "")}/rest/v1/rpc/get_demo_platform_snapshot`, {
        method: "POST",
        headers: {
          apikey: this.publishableKey,
          authorization: `Bearer ${this.publishableKey}`,
          "content-type": "application/json",
        },
        body: "{}",
        next: { revalidate: 30 },
      });
      if (!response.ok) throw new Error(`Supabase demo snapshot failed: ${response.status}`);
      const snapshot = await response.json() as PlatformSnapshot;
      if (!Array.isArray(snapshot.employers) || !Array.isArray(snapshot.guidedJourneys)) throw new Error("Supabase demo snapshot is invalid.");
      return snapshot;
    } catch {
      return this.fallback.readSnapshot();
    }
  }

  async execute(command: PlatformCommand): Promise<PlatformCommandResult> {
    return new InMemoryPlatformRepository(await this.readSnapshot()).execute(command);
  }
}
