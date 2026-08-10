import type { PlatformSnapshot } from "./types";

export interface PlatformRepository {
  getSnapshot(): PlatformSnapshot;
  replaceSnapshot(snapshot: PlatformSnapshot): void;
}
