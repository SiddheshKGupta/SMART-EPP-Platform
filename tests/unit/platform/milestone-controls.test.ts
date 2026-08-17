import { describe, expect, it } from "vitest";
import {
  projectPlatformSnapshotForProfile,
  type AccessProfile,
} from "@smart-epp/domain";
import { formatExactInr } from "@/components/shared/Money";
import { createPlatformDemoSeed } from "@/features/platform/data/seed";
import {
  executeWorkItemForProfile,
  simulateIntegrationSnapshot,
} from "@/features/platform/store/PlatformProvider";

const reason = "Reviewed the connected evidence and completed the controlled action.";

describe("milestone platform controls", () => {
  it("rechecks IAM at the command boundary and records explicit allowed and denied outcomes", () => {
    const snapshot = createPlatformDemoSeed();
    const operations = snapshot.profiles.find((profile) => profile.userId === "ops-lead")!;

    const allowed = executeWorkItemForProfile(snapshot, operations, "work-01", reason);
    expect(allowed.outcome).toBe("COMPLETED");
    expect(allowed.snapshot.workItems.find((item) => item.id === "work-01")).toMatchObject({
      completedBy: operations.userId,
      completedAt: snapshot.generatedAt,
    });
    expect(allowed.snapshot.auditEvents.at(-1)).toMatchObject({
      actorId: operations.userId,
      action: "WORK_ITEM_EDIT",
      reason,
      outcome: "SUCCESS",
    });

    const selfApproval = {
      ...snapshot,
      workItems: snapshot.workItems.map((item) =>
        item.id === "work-02" ? { ...item, initiatedBy: operations.userId } : item,
      ),
    };
    const denied = executeWorkItemForProfile(selfApproval, operations, "work-02", reason);
    expect(denied.outcome).toBe("DENIED");
    expect(denied.snapshot.workItems.find((item) => item.id === "work-02")?.completedAt).toBeUndefined();
    expect(denied.snapshot.auditEvents.at(-1)).toMatchObject({
      actorId: operations.userId,
      action: "WORK_ITEM_APPROVE",
      outcome: "DENIED",
    });

    const management: AccessProfile = {
      ...operations,
      userId: "management-self-approver",
      isManagement: true,
      grants: [{ module: "ALL", actions: ["APPROVE"] }],
    };
    const managementSelfApproval = {
      ...snapshot,
      workItems: snapshot.workItems.map((item) =>
        item.id === "work-02" ? { ...item, initiatedBy: management.userId } : item,
      ),
    };
    expect(executeWorkItemForProfile(managementSelfApproval, management, "work-02", reason).outcome).toBe("DENIED");
    const breakGlassReason = "Urgent continuity approval with control-owner notification.";
    const breakGlass = executeWorkItemForProfile(managementSelfApproval, management, "work-02", reason, breakGlassReason);
    expect(breakGlass.outcome).toBe("COMPLETED");
    expect(breakGlass.snapshot.auditEvents.at(-1)).toMatchObject({
      actorId: management.userId,
      outcome: "SUCCESS",
      reason: breakGlassReason,
    });
  });

  it("filters employer-linked records and masks sensitive employee fields before projection", () => {
    const snapshot = createPlatformDemoSeed();
    const restricted: AccessProfile = {
      ...snapshot.profiles[0]!,
      dataScopes: ["EMPLOYER:employer-northstar"],
      maskedFields: ["employee.pan", "employee.bankAccount"],
    };

    const projected = projectPlatformSnapshotForProfile(snapshot, restricted);
    expect(projected.employers.map((employer) => employer.id)).toEqual(["employer-northstar"]);
    expect(projected.employees).toHaveLength(4);
    expect(projected.employees.every((employee) => employee.employerId === "employer-northstar")).toBe(true);
    expect(projected.employees[0]).toMatchObject({ pan: "REDACTED", bankAccount: "REDACTED" });
    expect(projected.applications.every((application) => projected.employees.some((employee) => employee.id === application.employeeId))).toBe(true);
  });

  it("allocates a unique deterministic audit identity for repeated identical simulations", () => {
    const snapshot = createPlatformDemoSeed();
    const first = simulateIntegrationSnapshot(snapshot, "integration-tally", "PARTIAL", "platform-admin");
    const second = simulateIntegrationSnapshot(first, "integration-tally", "PARTIAL", "platform-admin");
    const [firstEvent, secondEvent] = second.auditEvents.slice(-2);

    expect(firstEvent?.id).toBe("audit-event-0004");
    expect(secondEvent?.id).toBe("audit-event-0005");
    expect(first.auditEvents).toHaveLength(4);
    expect(new Set(second.auditEvents.map((event) => event.id)).size).toBe(second.auditEvents.length);
  });

  it("seeds returned, duplicated and mismatched scenarios separately from lifecycle and recovery state", () => {
    const snapshot = createPlatformDemoSeed();
    const exceptions = snapshot.exceptions;
    expect(exceptions.map((item) => item.scenario)).toEqual(["RETURNED", "DUPLICATED", "MISMATCHED"]);
    expect(exceptions.map((item) => item.recoveryState)).toEqual(["OPEN", "IN_PROGRESS", "RECOVERED"]);
    expect(exceptions.map((item) => item.operatingState)).toEqual(["REJECTED", "PENDING", "RECONCILED"]);
    expect(exceptions.every((item) => snapshot.workItems.some((workItem) => workItem.id === item.workItemId && workItem.employerId === item.employerId))).toBe(true);
    expect(exceptions.every((item) => {
      if (item.sourceRecordType === "Application") return snapshot.applications.some((record) => record.id === item.sourceRecordId);
      if (item.sourceRecordType === "Employee") return snapshot.employees.some((record) => record.id === item.sourceRecordId);
      return snapshot.integrations.some((record) => record.id === item.sourceRecordId);
    })).toBe(true);
  });

  it("formats the application reservation as exact labelled INR", () => {
    expect(formatExactInr(12_490_000)).toBe("₹1,24,900.00");
  });
});
