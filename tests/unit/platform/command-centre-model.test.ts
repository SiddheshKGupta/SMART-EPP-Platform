import { describe, expect, it } from "vitest";
import { createDefaultPlatformSnapshot } from "@/features/platform/store/PlatformProvider";
import { buildCommandCentreMetrics, formatIndianAggregate } from "@/features/platform/command-centre/CommandCentre";
import { nextTabIndex } from "@/features/platform/command-centre/CommandCentre";
import { buildWorkbenchQueues, buildWorkbenchView, getWorkItemAction } from "@/features/platform/workbench/Workbench";
import { buildSanctionUtilisationView } from "@/features/platform/workspaces/ModuleWorkspace";

describe("command centre models", () => {
  const snapshot = createDefaultPlatformSnapshot();

  it("reconciles operations and exposure metrics to snapshot evidence", () => {
    const metrics = buildCommandCentreMetrics(snapshot);
    expect(metrics.operations.workItems.value).toBe(10);
    expect(metrics.operations.overdue.value).toBe(2);
    expect(metrics.operations.approvals.value).toBe(1);
    expect(metrics.operations.alerts.value).toBe(3);
    expect(metrics.executive.sanction.valuePaise).toBe(snapshot.employers.reduce((sum, employer) => sum + employer.sanctionPaise, 0));
    expect(metrics.executive.utilised.valuePaise).toBe(snapshot.employers.reduce((sum, employer) => sum + employer.utilisedPaise, 0));
    expect(metrics.executive.pipeline.breakdown).toEqual(["ACTIVE: 1", "IMPLEMENTATION: 1", "ONBOARDING: 1"]);
    for (const metric of [...Object.values(metrics.operations), ...Object.values(metrics.executive)]) {
      expect(metric.period).toBe("Fixed snapshot at 2026-08-10T09:00:00.000Z");
      expect(metric.targetComparison).toBe("Not configured for Lighthouse; no comparison available.");
    }
  });

  it("reconciles every operations KPI to its consumed destination population", () => {
    const metrics = buildCommandCentreMetrics(snapshot).operations;
    const profile = snapshot.profiles.find((candidate) => candidate.userId === "operations-demo")!;
    expect(buildWorkbenchView(snapshot, profile, { queue: "team-queues" }).items.map((item) => item.id)).toEqual(["work-01", "work-02", "work-03", "work-04", "work-05", "work-06", "work-07", "work-08", "work-09", "work-10"]);
    expect(buildWorkbenchView(snapshot, profile, { queue: "team-queues", status: "OVERDUE" }).items.map((item) => item.id)).toEqual(["work-03", "work-08"]);
    expect(buildWorkbenchView(snapshot, profile, { queue: "my-approvals" }).items.map((item) => item.id)).toEqual(["work-02"]);
    expect(buildWorkbenchView(snapshot, profile, { queue: "my-exceptions" }).items.map((item) => item.id)).toEqual(["work-03", "work-04", "work-08"]);
    expect([metrics.workItems.value, metrics.overdue.value, metrics.approvals.value, metrics.alerts.value]).toEqual([10, 2, 1, 3]);
  });

  it("reconciles sanction and utilisation to employer evidence rows", () => {
    const view = buildSanctionUtilisationView(snapshot);
    expect(view.rows.map((row) => row.id)).toEqual(["employer-northstar", "employer-pinnacle", "employer-harbour"]);
    expect(view.sanctionPaise).toBe(155_000_000);
    expect(view.utilisedPaise).toBe(102_900_000);
  });

  it("uses Indian aggregate notation without losing exact Money evidence", () => {
    expect(formatIndianAggregate(12_345_678_900)).toBe("₹12.35 Cr");
    expect(formatIndianAggregate(123_456_700)).toBe("₹12.35 Lakh");
  });

  it("keeps every approved queue visible and source-backed", () => {
    for (const profile of snapshot.profiles) {
      const queues = buildWorkbenchQueues(snapshot, profile);
      expect(queues.map((queue) => queue.label)).toEqual(["My Tasks", "My Approvals", "My Exceptions", "Team Queues", "Unassigned Work", "Notifications", "Escalations", "Delegations", "Recently Viewed"]);
      expect(queues.every((queue) => Array.isArray(queue.items))).toBe(true);
    }
    const operations = snapshot.profiles.find((profile) => profile.userId === "operations-demo")!;
    const queues = Object.fromEntries(buildWorkbenchQueues(snapshot, operations).map((queue) => [queue.label, queue.items.map((item) => item.id)]));
    expect(queues).toEqual({
      "My Tasks": ["work-01", "work-04"],
      "My Approvals": ["work-02"],
      "My Exceptions": ["work-03", "work-04", "work-08"],
      "Team Queues": ["work-01", "work-02", "work-03", "work-04", "work-05", "work-06", "work-07", "work-08", "work-09", "work-10"],
      "Unassigned Work": ["work-06"],
      Notifications: ["work-04"],
      Escalations: ["work-03", "work-08"],
      Delegations: ["work-07"],
      "Recently Viewed": ["work-01", "work-05", "work-10"],
    });
  });

  it("gates each requested row action using its real provenance", () => {
    const operations = snapshot.profiles.find((profile) => profile.userId === "operations-demo")!;
    const management = snapshot.profiles.find((profile) => profile.userId === "management-demo")!;
    const approval = snapshot.workItems.find((item) => item.id === "work-02")!;
    expect(getWorkItemAction(approval, operations)).toMatchObject({ action: "APPROVE", allowed: false });
    expect(getWorkItemAction(approval, management)).toMatchObject({ action: "APPROVE", allowed: true });
    expect(getWorkItemAction({ ...approval, initiatedBy: management.userId }, management)).toMatchObject({ allowed: false, requiresBreakGlass: true });
    expect(getWorkItemAction(snapshot.workItems.find((item) => item.id === "work-03")!, management)).toBeNull();
  });

  it("implements roving tab activation intent", () => {
    expect(nextTabIndex(0, "ArrowRight", 2)).toBe(1);
    expect(nextTabIndex(0, "ArrowLeft", 2)).toBe(1);
    expect(nextTabIndex(1, "Home", 9)).toBe(0);
    expect(nextTabIndex(1, "End", 9)).toBe(8);
    expect(nextTabIndex(1, "Enter", 9)).toBe(1);
  });
});
