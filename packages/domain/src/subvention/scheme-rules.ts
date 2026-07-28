import { intervalsOverlapInclusive } from "./dates";
import { issue, type DomainIssue } from "./issues";
import type { SchemeVersion } from "./types";

function sharesEligibleProduct(
  candidate: SchemeVersion,
  existing: SchemeVersion,
) {
  const existingProducts = new Set(existing.eligibleProductIds);
  return candidate.eligibleProductIds.some((productId) =>
    existingProducts.has(productId),
  );
}

export function validateSchemeOverlap(
  candidate: SchemeVersion,
  existing: SchemeVersion[],
): DomainIssue[] {
  return existing.flatMap((version) => {
    const overlapsApprovedVersion =
      version.id !== candidate.id &&
      version.workflowStatus === "APPROVED" &&
      version.oemId === candidate.oemId &&
      version.priority === candidate.priority &&
      sharesEligibleProduct(candidate, version) &&
      intervalsOverlapInclusive(
        candidate.effectiveFrom,
        candidate.effectiveTo,
        version.effectiveFrom,
        version.effectiveTo,
      );

    return overlapsApprovedVersion
      ? [
          issue({
            code: "SCHEME_OVERLAP",
            severity: "ERROR",
            entityType: "SchemeVersion",
            entityId: candidate.id,
            field: "effectiveFrom",
            message: "Approved scheme versions overlap with equal priority.",
            recoveryAction: "Change validity, product coverage, or priority.",
          }),
        ]
      : [];
  });
}
