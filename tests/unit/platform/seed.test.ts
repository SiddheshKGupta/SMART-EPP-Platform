import { describe, expect, it } from "vitest";
import { moduleBySlug, submoduleByPath } from "@smart-epp/domain";
import { createPlatformDemoSeed } from "@/features/platform/data/seed";

const requiredStates = new Set([
  "HEALTHY",
  "PENDING",
  "OVERDUE",
  "REJECTED",
  "RECONCILED",
]);

describe("platform demo seed", () => {
  it("provides the required deterministic portfolio volumes and operating conditions", () => {
    const seed = createPlatformDemoSeed();

    expect(seed.generatedAt).toBe("2026-08-10T09:00:00.000Z");
    expect(seed.employers).toHaveLength(3);
    expect(seed.employees).toHaveLength(12);
    expect(seed.applications).toHaveLength(8);
    expect(seed.assets).toHaveLength(8);
    expect(seed.leases).toHaveLength(6);
    expect(seed.workItems.length).toBeGreaterThanOrEqual(10);
    expect(new Set(seed.workItems.map((item) => item.state))).toEqual(requiredStates);
    expect(seed.guidedJourneys).toHaveLength(1);
  });

  it("keeps every seeded relationship and guided journey connected", () => {
    const seed = createPlatformDemoSeed();
    const employerIds = new Set(seed.employers.map((item) => item.id));
    const employeeIds = new Set(seed.employees.map((item) => item.id));
    const assetIds = new Set(seed.assets.map((item) => item.id));
    const applicationIds = new Set(seed.applications.map((item) => item.id));

    seed.employees.forEach((item) => expect(employerIds.has(item.employerId)).toBe(true));
    seed.applications.forEach((item) => {
      expect(employeeIds.has(item.employeeId)).toBe(true);
      expect(assetIds.has(item.assetId)).toBe(true);
    });
    seed.leases.forEach((item) => expect(applicationIds.has(item.applicationId)).toBe(true));

    const journey = seed.guidedJourneys[0]!;
    const employee = seed.employees.find((item) => item.id === journey.employeeId);
    const application = seed.applications.find((item) => item.id === journey.applicationId);
    const lease = seed.leases.find((item) => item.id === journey.leaseId);
    expect(employerIds.has(journey.employerId)).toBe(true);
    expect(employee?.employerId).toBe(journey.employerId);
    expect(application?.employeeId).toBe(journey.employeeId);
    expect(lease?.applicationId).toBe(journey.applicationId);
  });

  it("exposes exactly the seven named mock integration adapters", () => {
    const integrations = createPlatformDemoSeed().integrations;

    expect(integrations.map((item) => item.name)).toEqual([
      "Master Hub",
      "Existing Leasing Platform",
      "Tally",
      "Employer HRMS",
      "GST/E-invoicing",
      "Bank",
      "OEM/Vendor",
    ]);
    expect(integrations.every((item) => item.mode === "MOCK")).toBe(true);
  });

  it("uses non-negative safe-integer paise amounts", () => {
    const seed = createPlatformDemoSeed();
    const paiseAmounts = [
      ...seed.employers.flatMap((item) => [item.sanctionPaise, item.utilisedPaise]),
      ...seed.applications.flatMap((item) => [item.requestedPaise, item.reservedPaise]),
      ...seed.assets.map((item) => item.invoiceValuePaise),
      ...seed.leases.flatMap((item) => [item.rentalPaise, item.residualValuePaise]),
      ...seed.workItems.map((item) => item.financialImpactPaise),
    ];

    paiseAmounts.forEach((amount) => {
      expect(Number.isSafeInteger(amount)).toBe(true);
      expect(amount).toBeGreaterThanOrEqual(0);
    });
  });

  it("returns isolated clones for repeated seed creation", () => {
    const first = createPlatformDemoSeed();
    first.employers[0]!.name = "Mutated employer";
    first.guidedJourneys[0]!.steps[0]!.label = "Mutated step";

    const second = createPlatformDemoSeed();
    expect(second.employers[0]!.name).toBe("Northstar Consulting Private Limited");
    expect(second.guidedJourneys[0]!.steps[0]!.label).toBe("Employer readiness");
  });

  it("routes every work item through a registered submodule with record context in q", () => {
    const workItems = createPlatformDemoSeed().workItems;

    for (const item of workItems) {
      const destination = new URL(item.href, "https://smart-epp.test");
      const [moduleSlug, submoduleSlug, ...extraSegments] = destination.pathname
        .split("/")
        .filter(Boolean);

      expect(moduleBySlug(moduleSlug), `${item.id} module`).toBeDefined();
      expect(
        submoduleByPath(moduleSlug, submoduleSlug ? [submoduleSlug] : []),
        `${item.id} submodule`,
      ).toBeDefined();
      expect(extraSegments, `${item.id} path depth`).toEqual([]);
      expect(destination.searchParams.get("q"), `${item.id} record context`).toBeTruthy();
      expect([...destination.searchParams.keys()], `${item.id} supported query parameters`).toEqual(["q"]);
    }
  });
});
