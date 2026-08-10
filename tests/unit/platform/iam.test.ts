import { describe, expect, it } from "vitest";
import {
  assertApprovalSeparation,
  evaluateAccess,
  type AccessProfile,
} from "@smart-epp/domain";

const baseProfile: AccessProfile = {
  userId: "user-ops-01",
  roleKeys: ["OPERATIONS"],
  grants: [],
  dataScopes: ["ALL_EMPLOYERS"],
  maskedFields: ["employee.pan", "employee.bankAccount"],
  isAdmin: false,
  isManagement: false,
};

describe("platform IAM", () => {
  it("allows module reads but denies mutation without an explicit grant", () => {
    expect(
      evaluateAccess({ profile: baseProfile, module: "EMPLOYEES", action: "READ" }),
    ).toMatchObject({
      allowed: true,
      requiresBreakGlass: false,
      maskedFields: baseProfile.maskedFields,
    });
    expect(
      evaluateAccess({ profile: baseProfile, module: "EMPLOYEES", action: "EDIT" }),
    ).toMatchObject({ allowed: false, requiresBreakGlass: false });
  });

  it("allows a matching module grant for a mutation", () => {
    const decision = evaluateAccess({
      profile: {
        ...baseProfile,
        grants: [{ module: "EMPLOYEES", actions: ["EDIT"] }],
      },
      module: "EMPLOYEES",
      action: "EDIT",
    });

    expect(decision.allowed).toBe(true);
  });

  it("requires break-glass when management approves its own action", () => {
    const decision = evaluateAccess({
      profile: {
        ...baseProfile,
        isManagement: true,
        grants: [{ module: "ALL", actions: ["APPROVE"] }],
      },
      module: "APPLICATIONS_ELIGIBILITY",
      action: "APPROVE",
      initiatedBy: "user-ops-01",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.requiresBreakGlass).toBe(true);
  });

  it("denies a regular user from approving their own action even with a grant", () => {
    const decision = evaluateAccess({
      profile: {
        ...baseProfile,
        grants: [{ module: "ALL", actions: ["APPROVE"] }],
      },
      module: "APPLICATIONS_ELIGIBILITY",
      action: "APPROVE",
      initiatedBy: baseProfile.userId,
    });

    expect(decision).toMatchObject({
      allowed: false,
      requiresBreakGlass: false,
      reason: expect.stringMatching(/separation/i),
    });
  });

  it("allows an admin self-approval only with a trimmed break-glass reason of at least 20 characters", () => {
    const profile: AccessProfile = {
      ...baseProfile,
      isAdmin: true,
      grants: [{ module: "ALL", actions: ["APPROVE"] }],
    };
    const input = {
      profile,
      module: "APPLICATIONS_ELIGIBILITY" as const,
      action: "APPROVE" as const,
      initiatedBy: profile.userId,
    };

    expect(
      evaluateAccess({ ...input, breakGlassReason: "  just nineteen chars " }),
    ).toMatchObject({ allowed: false, requiresBreakGlass: true });
    expect(
      evaluateAccess({
        ...input,
        breakGlassReason: "  twenty characters!!!  ",
      }),
    ).toMatchObject({ allowed: true, requiresBreakGlass: true });
  });

  it("allows a granted non-self approval without break-glass", () => {
    const decision = evaluateAccess({
      profile: {
        ...baseProfile,
        grants: [{ module: "ALL", actions: ["APPROVE"] }],
      },
      module: "APPLICATIONS_ELIGIBILITY",
      action: "APPROVE",
      initiatedBy: "user-maker-02",
    });

    expect(decision).toMatchObject({
      allowed: true,
      requiresBreakGlass: false,
    });
  });

  it("asserts approval separation when a self-approval lacks a valid break-glass reason", () => {
    expect(() =>
      assertApprovalSeparation({
        profile: { ...baseProfile, isManagement: true },
        action: "APPROVE",
        initiatedBy: baseProfile.userId,
      }),
    ).toThrow(/break-glass/i);
  });
});
