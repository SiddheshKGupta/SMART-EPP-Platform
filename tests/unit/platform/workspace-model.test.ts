import { describe, expect, test } from "vitest";
import { PLATFORM_MODULES } from "@smart-epp/domain";
import { createPlatformDemoSeed } from "@/features/platform/data/seed";
import { buildWorkspaceView } from "@/features/platform/workspaces/ModuleWorkspace";

const snapshot = createPlatformDemoSeed();

describe("buildWorkspaceView", () => {
  test("normalizes and applies query and status filters before totals", () => {
    const applications = PLATFORM_MODULES.find((module) => module.slug === "applications")!;
    const view = buildWorkspaceView(applications, applications.submodules[0], snapshot, {
      q: " application ",
      status: "pending",
    });
    expect(view.filters).toEqual({ q: "application", status: "PENDING" });
    expect(view.records).toHaveLength(2);
    expect(view.totalPaise).toBe(22_240_000);
  });

  test("resolves every registry workspace to a non-empty truthful view", () => {
    for (const module of PLATFORM_MODULES) {
      expect(buildWorkspaceView(module, undefined, snapshot, {}).records.length).toBeGreaterThan(0);
      for (const submodule of module.submodules) {
        expect(buildWorkspaceView(module, submodule, snapshot, {}).records.length).toBeGreaterThan(0);
      }
    }
  });

  test("uses distinct evidence for management reports and BRE administration", () => {
    const reports = PLATFORM_MODULES.find((module) => module.slug === "reports")!;
    const admin = PLATFORM_MODULES.find((module) => module.slug === "admin")!;
    const management = buildWorkspaceView(reports, reports.submodules.find((item) => item.slug === "management"), snapshot, {});
    const bre = buildWorkspaceView(admin, admin.submodules.find((item) => item.slug === "bre-engine"), snapshot, {});
    expect(management.records[0]?.source).toMatch(/portfolio|programme/i);
    expect(bre.records[0]?.source).toMatch(/audit|profile/i);
    expect(management.records[0]?.title).not.toBe(bre.records[0]?.title);
  });

  test("does not invent operating states for asset, audit or IAM evidence", () => {
    const assets = PLATFORM_MODULES.find((module) => module.slug === "assets")!;
    const admin = PLATFORM_MODULES.find((module) => module.slug === "admin")!;
    expect(buildWorkspaceView(assets, assets.submodules[0], snapshot, {}).records.every((record) => record.state === null)).toBe(true);
    expect(buildWorkspaceView(admin, admin.submodules.find((item) => item.slug === "bre-engine"), snapshot, {}).records.every((record) => record.state === null)).toBe(true);
    expect(buildWorkspaceView(admin, admin.submodules.find((item) => item.slug === "iam"), snapshot, {}).records.every((record) => record.state === null)).toBe(true);
  });

  test("keeps integration source status exact without mapping it to an operating state", () => {
    const admin = PLATFORM_MODULES.find((module) => module.slug === "admin")!;
    const view = buildWorkspaceView(admin, admin.submodules.find((item) => item.slug === "integrations"), snapshot, {});
    expect(view.records[0]?.state).toBeNull();
    expect(view.records[0]?.sourceStatus).toBe(snapshot.integrations.find((item) => item.id === view.records[0]?.id)?.status);
  });
});
