import { describe, expect, test } from "vitest";
import { moduleBySlug, submoduleByPath } from "@smart-epp/domain";
import { createPlatformDemoSeed } from "@/features/platform/data/seed";
import { focusJourneyTrigger, transitionJourneyStep, type PlatformContextValue } from "@/features/platform/store/PlatformProvider";
import { resolveGuidedJourneyCase } from "@/features/platform/guided-demo/GuidedDemoDrawer";
import { buildWorkspaceView } from "@/features/platform/workspaces/ModuleWorkspace";

const expectedLabels = [
  "Employer readiness",
  "Employee enrolment",
  "Eligibility and credit",
  "Asset identification",
  "Approval",
  "Lease handoff and activation",
  "Servicing",
  "Foreclosure",
];

describe("Northstar guided journey", () => {
  test("uses the eight registered lifecycle destinations with truthful connected filters", () => {
    const snapshot = createPlatformDemoSeed();
    const journey = snapshot.guidedJourneys.find((item) => item.id === "journey-northstar-01")!;

    expect(journey.steps.map((step) => step.label)).toEqual(expectedLabels);
    expect(journey.steps.map((step) => step.status)).toEqual([
      "CURRENT", "UPCOMING", "UPCOMING", "UPCOMING", "UPCOMING", "UPCOMING", "UPCOMING", "UPCOMING",
    ]);

    for (const step of journey.steps) {
      const [path, query = ""] = step.href.split("?");
      const [, moduleSlug, submoduleSlug] = path.split("/");
      const module = moduleSlug ? moduleBySlug(moduleSlug) : undefined;
      const submodule = moduleSlug && submoduleSlug ? submoduleByPath(moduleSlug, [submoduleSlug]) : undefined;
      expect(module).toBeDefined();
      expect(submodule).toBeDefined();
      expect(submoduleSlug).not.toMatch(/^(employer|employee|application|asset|lease)-/);
      const filters = Object.fromEntries(new URLSearchParams(query));
      expect(buildWorkspaceView(module!, submodule, snapshot, filters).records.length).toBeGreaterThan(0);
    }
  });

  test("moves only to a known journey step and computes complete/current/upcoming states", () => {
    const seed = createPlatformDemoSeed();
    const unchanged = transitionJourneyStep(seed, "journey-northstar-01", "unknown");
    expect(unchanged).toBe(seed);

    const moved = transitionJourneyStep(seed, "journey-northstar-01", "journey-step-02");
    expect(moved.guidedJourneys[0]!.steps.map((step) => step.status)).toEqual([
      "COMPLETE", "CURRENT", "UPCOMING", "UPCOMING", "UPCOMING", "UPCOMING", "UPCOMING", "UPCOMING",
    ]);
  });

  test("reports each missing connected entity without throwing", () => {
    const journey = createPlatformDemoSeed().guidedJourneys[0]!;
    const fixtures = [
      ["employer", "employers"], ["employee", "employees"], ["application", "applications"], ["asset", "assets"], ["lease", "leases"],
    ] as const;

    for (const [missing, collection] of fixtures) {
      const snapshot = createPlatformDemoSeed();
      const id = collection === "employers" ? journey.employerId : collection === "employees" ? journey.employeeId : collection === "applications" ? journey.applicationId : collection === "leases" ? journey.leaseId : snapshot.applications.find((item) => item.id === journey.applicationId)!.assetId;
      snapshot[collection] = snapshot[collection].filter((item) => item.id !== id) as never;
      expect(resolveGuidedJourneyCase(snapshot, journey).missing).toEqual([missing]);
    }
  });

  test("accepts null trigger registration and never focuses a detached trigger", () => {
    const register: PlatformContextValue["registerJourneyTrigger"] = () => undefined;
    expect(register(null)).toBeUndefined();
    const detached = { isConnected: false, focus: () => { throw new Error("must not focus"); } } as unknown as HTMLElement;
    expect(focusJourneyTrigger(detached)).toBeNull();
    expect(focusJourneyTrigger(null)).toBeNull();
  });
});
