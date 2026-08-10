import type { PlatformSnapshot } from "@smart-epp/domain";

export class InMemoryPlatformRepository {
  private snapshot: PlatformSnapshot;

  constructor(snapshot: PlatformSnapshot) {
    this.snapshot = structuredClone(snapshot);
  }

  async getSnapshot(): Promise<PlatformSnapshot> {
    return structuredClone(this.snapshot);
  }

  replace(snapshot: PlatformSnapshot): void {
    this.snapshot = structuredClone(snapshot);
  }
}
