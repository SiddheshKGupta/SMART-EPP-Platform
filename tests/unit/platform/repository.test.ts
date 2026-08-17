import { describe, expect, it } from "vitest";
import type { PlatformRepository } from "@smart-epp/domain";
import { InMemoryPlatformRepository } from "@/features/platform/data/InMemoryPlatformRepository";
import { createPlatformDemoSeed } from "@/features/platform/data/seed";
import {
  simulateIntegrationSnapshot,
  transitionJourneyStep,
} from "@/features/platform/store/PlatformProvider";

const repositoryContract: PlatformRepository = new InMemoryPlatformRepository();
void repositoryContract;

describe("InMemoryPlatformRepository", () => {
  it("isolates constructor input from later caller mutation", async () => {
    const seed = createPlatformDemoSeed();
    const repository = new InMemoryPlatformRepository(seed);

    seed.employers[0]!.name = "Changed outside repository";

    expect((await repository.readSnapshot()).employers[0]!.name).toBe(
      "Northstar Consulting Private Limited",
    );
  });

  it("returns a fresh snapshot for every asynchronous read", async () => {
    const repository = new InMemoryPlatformRepository(createPlatformDemoSeed());
    const first = await repository.readSnapshot();
    first.guidedJourneys[0]!.steps[0]!.label = "Changed returned value";

    expect(
      (await repository.readSnapshot()).guidedJourneys[0]!.steps[0]!.label,
    ).toBe(
      "Employer readiness",
    );
  });

  it("returns an isolated snapshot from a targeted command", async () => {
    const repository = new InMemoryPlatformRepository(createPlatformDemoSeed());
    const result = await repository.execute({
      type: "ADVANCE_GUIDED_JOURNEY",
      journeyId: "journey-northstar-01",
      stepId: "journey-step-02",
    });

    result.snapshot.guidedJourneys[0]!.steps[0]!.label = "Changed command result";
    expect(
      (await repository.readSnapshot()).guidedJourneys[0]!.steps[0]!.label,
    ).toBe("Employer readiness");
  });

  it("uses the deterministic platform demo seed by default", async () => {
    expect((await new InMemoryPlatformRepository().readSnapshot()).generatedAt).toBe(
      "2026-08-10T09:00:00.000Z",
    );
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
      "UPCOMING",
      "UPCOMING",
      "UPCOMING",
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
