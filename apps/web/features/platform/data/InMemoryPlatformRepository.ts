import type { PlatformRepository, PlatformSnapshot } from "@smart-epp/domain";
import { createPlatformDemoSeed } from "./seed";

export class InMemoryPlatformRepository implements PlatformRepository {
  private snapshot: PlatformSnapshot;

  constructor(snapshot: PlatformSnapshot = createPlatformDemoSeed()) {
    this.snapshot = structuredClone(snapshot);
  }

  getSnapshot(): PlatformSnapshot {
    return structuredClone(this.snapshot);
  }

  replaceSnapshot(snapshot: PlatformSnapshot): void {
    this.snapshot = structuredClone(snapshot);
  }
}
