import { describe, expect, test } from "vitest";
import { PLATFORM_MODULES } from "@smart-epp/domain";
import { createDefaultPlatformSnapshot } from "@/features/platform/store/PlatformProvider";
import { buildOriginationWorkspaceModel } from "@/features/platform/origination/OriginationWorkspace";

const snapshot = createDefaultPlatformSnapshot();

const moduleFor = (slug: string) =>
  PLATFORM_MODULES.find((candidate) => candidate.slug === slug)!;

describe("origination workspace smoke model", () => {
  test.each([
    ["programmes", "PROGRAMME", 3],
    ["employees", "EMPLOYEE", 12],
    ["applications", "APPLICATION", 8],
  ] as const)("maps %s and every registered subroute to its connected archetype", (slug, domain, count) => {
    const module = moduleFor(slug);
    for (const submodule of module.submodules) {
      const model = buildOriginationWorkspaceModel(
        module,
        submodule,
        snapshot,
        {},
        snapshot.profiles[0]!,
      );
      expect(model.domain).toBe(domain);
      expect(model.rows).toHaveLength(count);
      expect(model.activeStageSlug).toBe(submodule.slug);
      expect(model.rows.every((row) => row.source && row.freshness === snapshot.generatedAt)).toBe(true);
    }
  });

  test("keeps the read register visible while IAM controls application actions", () => {
    const module = moduleFor("applications");
    const submodule = module.submodules.find((item) => item.slug === "approval-routing")!;
    const operations = snapshot.profiles.find((profile) => profile.userId === "operations-demo")!;
    const management = snapshot.profiles.find((profile) => profile.userId === "management-demo")!;

    const operationsView = buildOriginationWorkspaceModel(module, submodule, snapshot, {}, operations);
    const managementView = buildOriginationWorkspaceModel(module, submodule, snapshot, {}, management);

    expect(operationsView.rows).toHaveLength(8);
    expect(operationsView.action).toMatchObject({ key: "APPROVE", allowed: false });
    expect(managementView.action).toMatchObject({ key: "APPROVE", allowed: true });
  });

  test("filters connected rows without changing the domain route contract", () => {
    const module = moduleFor("employees");
    const model = buildOriginationWorkspaceModel(
      module,
      module.submodules[0],
      snapshot,
      { q: "aarav", status: "healthy" },
      snapshot.profiles[0]!,
    );

    expect(model.rows.map((row) => row.id)).toEqual(["employee-northstar-01"]);
    expect(model.filters).toEqual({ q: "aarav", status: "HEALTHY" });
  });
});
