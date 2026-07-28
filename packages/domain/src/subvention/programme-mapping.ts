import { dateIsWithinInclusive } from "./dates";
import { issue, type DomainIssue } from "./issues";
import type {
  CalculationBasis,
  EligibilityRuleSnapshot,
  EmployerProgrammeMappingVersion,
  PurchaseTransaction,
  SchemeVersion,
} from "./types";

export interface OemRuleDefaults {
  oemId: string;
  calculationBasis?: CalculationBasis;
  rateBps?: number;
  flatAmountPaise?: number;
  claimTimelineDays?: number;
  settlementCounterpartyType?: "OEM" | "DISTRIBUTOR" | "RESELLER";
}

export type MappingResolution =
  | { status: "RESOLVED"; mapping: EmployerProgrammeMappingVersion }
  | { status: "MISSING" | "AMBIGUOUS"; issues: DomainIssue[] };

function mappingIssue(
  code: "PROGRAMME_MAPPING_MISSING" | "PROGRAMME_MAPPING_AMBIGUOUS",
  transaction: PurchaseTransaction,
): DomainIssue {
  const ambiguous = code === "PROGRAMME_MAPPING_AMBIGUOUS";

  return issue({
    code,
    severity: "ERROR",
    entityType: "PurchaseTransaction",
    entityId: transaction.id,
    field: "programmeId",
    message: ambiguous
      ? "More than one approved programme mapping matches this transaction."
      : "No approved programme mapping matches this transaction.",
    recoveryAction: ambiguous
      ? "Correct overlapping mapping validity before evaluating eligibility."
      : "Create and approve a matching programme mapping before evaluating eligibility.",
  });
}

export function resolveProgrammeMapping(
  transaction: PurchaseTransaction,
  mappings: EmployerProgrammeMappingVersion[],
): MappingResolution {
  const matches = mappings.filter(
    (mapping) =>
      mapping.workflowStatus === "APPROVED" &&
      mapping.employerId === transaction.employerId &&
      mapping.programmeId === transaction.programmeId &&
      mapping.oemId === transaction.oemId &&
      dateIsWithinInclusive(
        transaction.invoiceDate,
        mapping.effectiveFrom,
        mapping.effectiveTo,
      ),
  );

  if (matches.length === 1) {
    return { status: "RESOLVED", mapping: matches[0]! };
  }

  return {
    status: matches.length === 0 ? "MISSING" : "AMBIGUOUS",
    issues: [
      mappingIssue(
        matches.length === 0
          ? "PROGRAMME_MAPPING_MISSING"
          : "PROGRAMME_MAPPING_AMBIGUOUS",
        transaction,
      ),
    ],
  };
}

function requireValue<T>(value: T | undefined, field: string): T {
  if (value === undefined) {
    throw new Error(`No effective ${field} is configured`);
  }
  return value;
}

function appendSource(
  sources: string[],
  source: string,
  used: boolean,
): void {
  if (used) sources.push(source);
}

export function resolveEffectiveRules(
  mapping: EmployerProgrammeMappingVersion,
  scheme: SchemeVersion,
  oemDefaults?: OemRuleDefaults,
): EligibilityRuleSnapshot {
  if (mapping.workflowStatus !== "APPROVED") {
    throw new Error("Employer programme mapping must be approved");
  }
  if (mapping.schemeVersionId !== scheme.id) {
    throw new Error("Scheme version does not match the programme mapping");
  }
  if (scheme.workflowStatus !== "APPROVED") {
    throw new Error("Mapped scheme version must be approved");
  }
  if (scheme.oemId !== mapping.oemId) {
    throw new Error("Mapped scheme OEM does not match the programme mapping");
  }
  if (oemDefaults && oemDefaults.oemId !== mapping.oemId) {
    throw new Error("OEM defaults do not match the programme mapping");
  }

  const overrides = mapping.overrides;
  if (overrides && !overrides.approvalReference.trim()) {
    throw new Error("Programme override requires an approval reference");
  }

  const calculationBasis = requireValue(
    overrides?.calculationBasis ??
      scheme.calculationBasis ??
      oemDefaults?.calculationBasis,
    "calculation basis",
  );
  const rateBps = overrides?.rateBps ?? scheme.rateBps ?? oemDefaults?.rateBps;
  const flatAmountPaise =
    overrides?.flatAmountPaise ??
    scheme.flatAmountPaise ??
    oemDefaults?.flatAmountPaise;
  const claimTimelineDays = requireValue(
    overrides?.claimTimelineDays ??
      scheme.claimTimelineDays ??
      oemDefaults?.claimTimelineDays,
    "claim timeline days",
  );
  const settlementCounterpartyType = requireValue(
    scheme.settlementCounterpartyType ?? oemDefaults?.settlementCounterpartyType,
    "settlement counterparty type",
  );

  const precedenceSources: string[] = [];
  appendSource(
    precedenceSources,
    `EmployerProgrammeOverride:${mapping.id}:${overrides?.approvalReference}`,
    overrides !== undefined,
  );
  appendSource(
    precedenceSources,
    `SchemeVersion:${scheme.id}`,
    overrides?.calculationBasis === undefined ||
      overrides?.rateBps === undefined ||
      overrides?.flatAmountPaise === undefined ||
      overrides?.claimTimelineDays === undefined ||
      overrides?.eligibleProductIds === undefined,
  );
  appendSource(
    precedenceSources,
    `OemDefault:${oemDefaults?.oemId}`,
    oemDefaults !== undefined &&
      (scheme.calculationBasis === undefined ||
        scheme.rateBps === undefined ||
        scheme.flatAmountPaise === undefined ||
        scheme.claimTimelineDays === undefined ||
        scheme.settlementCounterpartyType === undefined),
  );

  return {
    employerProgrammeMappingVersionId: mapping.id,
    schemeVersionId: scheme.id,
    calculationBasis,
    rateBps,
    flatAmountPaise,
    claimTimelineDays,
    eligibleProductIds: overrides?.eligibleProductIds ?? scheme.eligibleProductIds,
    settlementCounterpartyType,
    precedenceSources,
  };
}
