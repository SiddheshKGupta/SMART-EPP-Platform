import { describe, expect, it } from "vitest";
import { PLATFORM_MODULES, evaluateAccess } from "@smart-epp/domain";
import { createDefaultPlatformSnapshot, simulateIntegrationSnapshot } from "@/features/platform/store/PlatformProvider";

describe("admin control surfaces", () => {
  const admin = PLATFORM_MODULES.find((module) => module.key === "ADMIN")!;

  it("keeps the seven distinct admin routes, including separate BRE and workflow controls", () => {
    expect(admin.submodules.map((item) => [item.label, `/${admin.slug}/${item.slug}`])).toEqual([
      ["IAM", "/admin/iam"], ["Masters", "/admin/masters"], ["BRE Engine", "/admin/bre-engine"],
      ["Workflow Configuration", "/admin/workflow-configuration"], ["Integrations", "/admin/integrations"],
      ["Audit & System Logs", "/admin/audit-logs"], ["Platform Settings", "/admin/platform-settings"],
    ]);
  });

  it("seeds exactly seven mock-only adapters and protects the synthetic payload", () => {
    const snapshot = createDefaultPlatformSnapshot();
    expect(snapshot.integrations).toHaveLength(7);
    expect(snapshot.integrations.every((adapter) => adapter.mode === "MOCK")).toBe(true);
    expect(JSON.stringify(snapshot.integrations)).not.toMatch(/credential|secret|token|@/i);
  });

  it("allows configuration only for matching management/admin grants", () => {
    const snapshot = createDefaultPlatformSnapshot();
    const profiles = Object.fromEntries(snapshot.profiles.map((profile) => [profile.roleKeys[0], profile]));
    expect(evaluateAccess({ profile: profiles.OPERATIONS!, module: "ADMIN", action: "CONFIGURE" }).allowed).toBe(false);
    expect(evaluateAccess({ profile: profiles.AUDITOR!, module: "ADMIN", action: "CONFIGURE" }).allowed).toBe(false);
    expect(evaluateAccess({ profile: profiles.MANAGEMENT!, module: "ADMIN", action: "CONFIGURE" }).allowed).toBe(true);
    expect(evaluateAccess({ profile: profiles.ADMIN!, module: "ADMIN", action: "CONFIGURE" }).allowed).toBe(true);
  });

  it("transitions only the targeted adapter and records a redacted local audit line", () => {
    const snapshot = createDefaultPlatformSnapshot();
    const transitioned = simulateIntegrationSnapshot(snapshot, "integration-tally", "PARTIAL", "admin-demo");
    expect(transitioned.integrations.find((item) => item.id === "integration-tally")?.status).toBe("PARTIAL");
    expect(transitioned.integrations.filter((item) => item.id !== "integration-tally")).toEqual(snapshot.integrations.filter((item) => item.id !== "integration-tally"));
    expect(transitioned.auditEvents.at(-1)).toMatchObject({ actorId: "admin-demo", entityId: "integration-tally", action: "MOCK_INTEGRATION_PARTIAL", occurredAt: snapshot.generatedAt });
    expect(JSON.stringify(transitioned.auditEvents.at(-1))).not.toMatch(/credential|secret|token|@/i);
    expect(simulateIntegrationSnapshot(snapshot, "unknown", "SUCCESS")).toBe(snapshot);
  });
});
