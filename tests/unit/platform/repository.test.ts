import { describe, expect, it } from "vitest";
import { InMemoryPlatformRepository } from "@/features/platform/data/InMemoryPlatformRepository";
import { createPlatformDemoSeed } from "@/features/platform/data/seed";
import {
  simulateIntegrationSnapshot,
  transitionJourneyStep,
} from "@/features/platform/store/PlatformProvider";

describe("InMemoryPlatformRepository", () => {
  it("isolates constructor input from later caller mutation", async () => {
    const seed = createPlatformDemoSeed();
    const repository = new InMemoryPlatformRepository(seed);

    seed.employers[0]!.name = "Changed outside repository";

    expect((await repository.getSnapshot()).employers[0]!.name).toBe(
      "Northstar Consulting Private Limited",
    );
  });

  it("returns a fresh snapshot for every read", async () => {
    const repository = new InMemoryPlatformRepository(createPlatformDemoSeed());
    const first = await repository.getSnapshot();
    first.guidedJourneys[0]!.steps[0]!.label = "Changed returned value";

    expect((await repository.getSnapshot()).guidedJourneys[0]!.steps[0]!.label).toBe(
      "Employer programme active",
    );
  });

  it("clones replacement snapshots on input and output", async () => {
    const repository = new InMemoryPlatformRepository(createPlatformDemoSeed());
    const replacement = createPlatformDemoSeed();
    replacement.integrations[0]!.status = "FAILED";

    repository.replace(replacement);
    replacement.integrations[0]!.status = "HEALTHY";

    const stored = await repository.getSnapshot();
    expect(stored.integrations[0]!.status).toBe("FAILED");
    stored.integrations[0]!.status = "PARTIAL";
    expect((await repository.getSnapshot()).integrations[0]!.status).toBe("FAILED");
  });
});

describe("platform state transitions", () => {
  it("updates only a known journey step and keeps unknown journey input unchanged", () => {
    const seed = createPlatformDemoSeed();
    const transition = transitionJourneyStep(
      seed,
      "journey-northstar-01",
      "journey-step-03",
    );

    expect(transition.guidedJourneys[0]!.steps.map((step) => step.status)).toEqual([
      "COMPLETE",
      "COMPLETE",
      "CURRENT",
      "UPCOMING",
    ]);
    expect(
      transitionJourneyStep(seed, "unknown-journey", "journey-step-03"),
    ).toBe(seed);
  });

  it("simulates one known mock adapter deterministically without touching peers", () => {
    const seed = createPlatformDemoSeed();
    const transition = simulateIntegrationSnapshot(
      seed,
      "integration-leasing-platform",
      "SUCCESS",
    );

    expect(transition.integrations[1]).toMatchObject({
      status: "HEALTHY",
      accepted: 983,
      rejected: 3,
      pending: 4,
      lastSyncAt: seed.generatedAt,
    });
    expect(transition.integrations[0]).toEqual(seed.integrations[0]);
    expect(simulateIntegrationSnapshot(seed, "unknown-adapter", "FAILURE")).toBe(
      seed,
    );
  });
});
