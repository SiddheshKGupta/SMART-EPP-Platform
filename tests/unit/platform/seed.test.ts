import { describe, expect, it } from "vitest";
import { createPlatformDemoSeed } from "@/features/platform/data/seed";

describe("platform demo seed", () => {
  it("builds one deterministic connected employer-to-lease journey", () => {
    const seed = createPlatformDemoSeed();
    const journey = seed.guidedJourneys[0]!;
    const employee = seed.employees.find((item) => item.id === journey.employeeId);
    const application = seed.applications.find((item) => item.id === journey.applicationId);
    const lease = seed.leases.find((item) => item.id === journey.leaseId);

    expect(employee?.employerId).toBe(journey.employerId);
    expect(application?.employeeId).toBe(employee?.id);
    expect(lease?.applicationId).toBe(application?.id);
    expect(seed.generatedAt).toBe("2026-08-10T09:00:00.000Z");
  });

  it("contains healthy, pending, overdue, rejected, and reconciled conditions", () => {
    const states = new Set(createPlatformDemoSeed().workItems.map((item) => item.state));
    expect(states).toEqual(new Set(["HEALTHY", "PENDING", "OVERDUE", "REJECTED", "RECONCILED"]));
  });
});
