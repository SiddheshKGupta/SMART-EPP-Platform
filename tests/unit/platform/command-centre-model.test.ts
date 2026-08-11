import { describe, expect, it } from "vitest";
import { createDefaultPlatformSnapshot } from "@/features/platform/store/PlatformProvider";
import { buildCommandCentreMetrics, formatIndianAggregate } from "@/features/platform/command-centre/CommandCentre";
import { buildWorkbenchQueues, getWorkbenchApprovalAccess } from "@/features/platform/workbench/Workbench";

describe("command centre models", () => {
  const snapshot = createDefaultPlatformSnapshot();

  it("reconciles operations and exposure metrics to snapshot evidence", () => {
    const metrics = buildCommandCentreMetrics(snapshot);
    expect(metrics.operations.workItems.value).toBe(snapshot.workItems.length);
    expect(metrics.operations.overdue.value).toBe(snapshot.workItems.filter((item) => item.state === "OVERDUE").length);
    expect(metrics.executive.sanction.valuePaise).toBe(snapshot.employers.reduce((sum, employer) => sum + employer.sanctionPaise, 0));
    expect(metrics.executive.utilised.valuePaise).toBe(snapshot.employers.reduce((sum, employer) => sum + employer.utilisedPaise, 0));
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
  });

  it("gates approval through IAM and prohibits routine self-approval", () => {
    const operations = snapshot.profiles.find((profile) => profile.userId === "operations-demo")!;
    const management = snapshot.profiles.find((profile) => profile.userId === "management-demo")!;
    expect(getWorkbenchApprovalAccess(operations, "another-maker").allowed).toBe(false);
    expect(getWorkbenchApprovalAccess(management, management.userId)).toMatchObject({ allowed: false, requiresBreakGlass: true });
  });
});
