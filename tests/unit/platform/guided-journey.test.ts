import { describe, expect, test } from "vitest";
import { moduleBySlug, submoduleByPath } from "@smart-epp/domain";
import { createPlatformDemoSeed } from "@/features/platform/data/seed";
import { transitionJourneyStep } from "@/features/platform/store/PlatformProvider";
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
});
