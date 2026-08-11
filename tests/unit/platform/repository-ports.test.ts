import { describe, expect, it } from "vitest";
import type {
  PlatformCommand,
  PlatformRepository,
} from "@smart-epp/domain";
import { InMemoryPlatformRepository } from "@/features/platform/data/InMemoryPlatformRepository";
import { createPlatformDemoSeed } from "@/features/platform/data/seed";
import { createPlatformApplication } from "@/features/platform/server/platformApplication";

async function exerciseRepositoryContract(repository: PlatformRepository) {
  const first = await repository.readSnapshot();
  first.employers[0]!.name = "Changed by repository caller";

  const second = await repository.readSnapshot();
  expect(second.employers[0]!.name).toBe(
    "Northstar Consulting Private Limited",
  );

  const command: PlatformCommand = {
    type: "ADVANCE_GUIDED_JOURNEY",
    journeyId: "journey-northstar-01",
    stepId: "journey-step-03",
  };
  const result = await repository.execute(command);

  expect(result.changed).toBe(true);
  expect(result.snapshot.guidedJourneys[0]!.steps.map((step) => step.status)).toEqual([
    "COMPLETE",
    "COMPLETE",
    "CURRENT",
    "UPCOMING",
    "UPCOMING",
    "UPCOMING",
    "UPCOMING",
    "UPCOMING",
  ]);

  result.snapshot.guidedJourneys[0]!.steps[0]!.label = "Changed command result";
  expect(
    (await repository.readSnapshot()).guidedJourneys[0]!.steps[0]!.label,
  ).toBe("Employer readiness");
}

describe("provider-portable platform repository", () => {
  it("implements asynchronous isolated read and command ports", async () => {
    await exerciseRepositoryContract(
      new InMemoryPlatformRepository(createPlatformDemoSeed()),
    );
  });

  it("does not mutate state for an unknown command target", async () => {
    const repository = new InMemoryPlatformRepository(createPlatformDemoSeed());
    const before = await repository.readSnapshot();

    const result = await repository.execute({
      type: "ADVANCE_GUIDED_JOURNEY",
      journeyId: "unknown-journey",
      stepId: "journey-step-03",
    });

    expect(result.changed).toBe(false);
    expect(result.snapshot).toEqual(before);
    expect(await repository.readSnapshot()).toEqual(before);
  });

  it("updates only the requested mock adapter through a typed command", async () => {
    const repository = new InMemoryPlatformRepository(createPlatformDemoSeed());
    const before = await repository.readSnapshot();

    const result = await repository.execute({
      type: "SIMULATE_INTEGRATION",
      adapterId: "integration-leasing-platform",
      outcome: "SUCCESS",
      actorId: "admin-demo",
    });

    expect(result.changed).toBe(true);
    expect(result.snapshot.integrations[1]).toMatchObject({
      status: "HEALTHY",
      accepted: 983,
      rejected: 3,
      pending: 4,
      lastSyncAt: before.generatedAt,
    });
    expect(result.snapshot.integrations[0]).toEqual(before.integrations[0]);
  });

  it("injects the selected adapter at the application boundary", async () => {
    const repository = new InMemoryPlatformRepository(createPlatformDemoSeed());
    const application = createPlatformApplication(repository);

    const loaded = await application.loadSnapshot();
    const result = await application.execute({
      type: "ADVANCE_GUIDED_JOURNEY",
      journeyId: "journey-northstar-01",
      stepId: "journey-step-02",
    });

    expect(loaded.generatedAt).toBe("2026-08-10T09:00:00.000Z");
    expect(result.changed).toBe(true);
    expect((await repository.readSnapshot()).guidedJourneys[0]!.steps[1]!.status).toBe(
      "CURRENT",
    );
  });
});
