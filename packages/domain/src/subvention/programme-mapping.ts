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

interface ResolvedValue<T> {
  value: T | undefined;
  source?: string;
}

function resolveValue<T>(
  programmeValue: T | undefined,
  schemeValue: T | undefined,
  oemValue: T | undefined,
  programmeSource: string | undefined,
  schemeSource: string,
  oemSource: string | undefined,
): ResolvedValue<T> {
  if (programmeValue !== undefined) {
    return { value: programmeValue, source: programmeSource };
  }
  if (schemeValue !== undefined) {
    return { value: schemeValue, source: schemeSource };
  }
  if (oemValue !== undefined) {
    return { value: oemValue, source: oemSource };
  }
  return { value: undefined };
}

function collectPrecedenceSources(
  resolvedValues: ResolvedValue<unknown>[],
  programmeSource: string | undefined,
  schemeSource: string,
  oemSource: string | undefined,
): string[] {
  const usedSources = new Set(
    resolvedValues.flatMap((resolved) =>
      resolved.source === undefined ? [] : [resolved.source],
    ),
  );

  return [programmeSource, schemeSource, oemSource].flatMap((source) =>
    source !== undefined && usedSources.has(source) ? [source] : [],
  );
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

  const programmeSource = overrides
    ? `EmployerProgrammeOverride:${mapping.id}:${overrides.approvalReference}`
    : undefined;
  const schemeSource = `SchemeVersion:${scheme.id}`;
  const oemSource = oemDefaults ? `OemDefault:${oemDefaults.oemId}` : undefined;

  const calculationBasis = resolveValue(
    overrides?.calculationBasis,
    scheme.calculationBasis,
    oemDefaults?.calculationBasis,
    programmeSource,
    schemeSource,
    oemSource,
  );
  const rateBps = resolveValue(
    overrides?.rateBps,
    scheme.rateBps,
    oemDefaults?.rateBps,
    programmeSource,
    schemeSource,
    oemSource,
  );
  const flatAmountPaise = resolveValue(
    overrides?.flatAmountPaise,
    scheme.flatAmountPaise,
    oemDefaults?.flatAmountPaise,
    programmeSource,
    schemeSource,
    oemSource,
  );
  const claimTimelineDays = resolveValue(
    overrides?.claimTimelineDays,
    scheme.claimTimelineDays,
    oemDefaults?.claimTimelineDays,
    programmeSource,
    schemeSource,
    oemSource,
  );
  const eligibleProductIds = resolveValue(
    overrides?.eligibleProductIds,
    scheme.eligibleProductIds,
    undefined,
    programmeSource,
    schemeSource,
    undefined,
  );
  const settlementCounterpartyType = resolveValue(
    undefined,
    scheme.settlementCounterpartyType,
    oemDefaults?.settlementCounterpartyType,
    undefined,
    schemeSource,
    oemSource,
  );
  const resolvedCalculationBasis = requireValue(
    calculationBasis.value,
    "calculation basis",
  );
  const resolvedRateBps =
    resolvedCalculationBasis === "FLAT_AMOUNT"
      ? undefined
      : requireValue(rateBps.value, "rate basis points");
  const resolvedFlatAmountPaise =
    resolvedCalculationBasis === "FLAT_AMOUNT"
      ? requireValue(flatAmountPaise.value, "flat amount")
      : undefined;

  return {
    employerProgrammeMappingVersionId: mapping.id,
    schemeVersionId: scheme.id,
    calculationBasis: resolvedCalculationBasis,
    rateBps: resolvedRateBps,
    flatAmountPaise: resolvedFlatAmountPaise,
    claimTimelineDays: requireValue(
      claimTimelineDays.value,
      "claim timeline days",
    ),
    eligibleProductIds: [...requireValue(eligibleProductIds.value, "eligible product ids")],
    settlementCounterpartyType: requireValue(
      settlementCounterpartyType.value,
      "settlement counterparty type",
    ),
    precedenceSources: collectPrecedenceSources(
      [
        calculationBasis,
        resolvedCalculationBasis === "FLAT_AMOUNT" ? flatAmountPaise : rateBps,
        claimTimelineDays,
        eligibleProductIds,
        settlementCounterpartyType,
      ],
      programmeSource,
      schemeSource,
      oemSource,
    ),
  };
}
