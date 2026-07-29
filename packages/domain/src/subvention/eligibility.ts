import { addDaysIso, dateIsWithinInclusive } from "./dates";
import { calculateExpectedAmountPaise } from "./money";
import {
  type OemRuleDefaults,
  resolveEffectiveRules,
  resolveProgrammeMapping,
} from "./programme-mapping";
import { purchaseTransactionInputSchema } from "./schemas";
import type {
  Actor,
  EligibilityDecision,
  EligibilityRuleSnapshot,
  EligibilityStatus,
  EmployerProgrammeMappingVersion,
  PurchaseTransaction,
  RuleResult,
  SchemeVersion,
} from "./types";

export interface EvaluateEligibilityInput {
  transaction: PurchaseTransaction;
  schemes: SchemeVersion[];
  mappings: EmployerProgrammeMappingVersion[];
  oemDefaults?: OemRuleDefaults;
  duplicateDeviceIdentifiers: ReadonlySet<string>;
  duplicateLeaseIds: ReadonlySet<string>;
  existingClaimedDeviceIdentifiers: ReadonlySet<string>;
  existingClaimedLeaseIds: ReadonlySet<string>;
  evaluationDate: string;
  evaluatedAt: string;
  actor: Actor;
  decisionId: string;
  version: number;
  previousDecision?: EligibilityDecision;
}

function passed(code: string, label: string, reason: string): RuleResult {
  return { code, label, outcome: "PASS", reason };
}

function failed(code: string, label: string, reason: string): RuleResult {
  return { code, label, outcome: "FAIL", reason };
}

function reviewed(code: string, label: string, reason: string): RuleResult {
  return { code, label, outcome: "REVIEW", reason };
}

function statusFor(ruleResults: RuleResult[]): EligibilityStatus {
  if (ruleResults.some((rule) => rule.outcome === "FAIL")) {
    return "INELIGIBLE";
  }
  if (ruleResults.some((rule) => rule.outcome === "REVIEW")) {
    return "EXCEPTION_REVIEW";
  }
  return "ELIGIBLE";
}

function transactionValidationFailure(
  transaction: PurchaseTransaction,
): RuleResult | undefined {
  const parsed = purchaseTransactionInputSchema.safeParse(transaction);
  const financialFields = new Set([
    "invoiceValuePaise",
    "baseValuePaise",
    "gstAmountPaise",
  ]);
  const hasInvalidRequiredField =
    !transaction.id.trim() ||
    !transaction.importedAt.trim() ||
    (!parsed.success &&
      parsed.error.issues.some(
        (validationIssue) =>
          !financialFields.has(String(validationIssue.path[0])),
      ));

  if (hasInvalidRequiredField) {
    return failed(
      "TRANSACTION_FIELDS_INVALID",
      "Transaction fields",
      "One or more required transaction fields are invalid.",
    );
  }

  const financialValues = [
    transaction.invoiceValuePaise,
    transaction.baseValuePaise,
    transaction.gstAmountPaise,
  ];
  if (
    financialValues.some(
      (value) => !Number.isSafeInteger(value) || value <= 0,
    )
  ) {
    return failed(
      "TRANSACTION_FINANCIALS_INVALID",
      "Transaction financials",
      "Invoice, base, and GST values must be positive safe-integer paise.",
    );
  }

  return undefined;
}

function isValidDateOnly(value: string): boolean {
  try {
    return dateIsWithinInclusive(value, value, value);
  } catch {
    return false;
  }
}

function assertDecisionChain(input: EvaluateEligibilityInput): void {
  const previous = input.previousDecision;
  if (!previous) {
    if (input.version !== 1) {
      throw new Error("Initial eligibility decision version must be 1");
    }
    return;
  }

  if (previous.transactionId !== input.transaction.id) {
    throw new Error(
      "Previous eligibility decision must reference the same transaction",
    );
  }
  if (input.version !== previous.version + 1) {
    throw new Error(
      "Eligibility decision version must increment previous version by exactly 1",
    );
  }
  if (input.decisionId === previous.id) {
    throw new Error(
      "Eligibility decision ID must differ from the previous decision ID",
    );
  }
}

function leaseStatusResult(
  status: PurchaseTransaction["leaseStatus"],
): RuleResult {
  if (status === "ACTIVE") {
    return passed("LEASE_STATUS_ACTIVE", "Lease status", "The lease is active.");
  }

  return failed(
    status,
    "Lease status",
    `${status[0]}${status.slice(1).toLowerCase()} transactions are not eligible.`,
  );
}

export function evaluateEligibility(
  input: EvaluateEligibilityInput,
): EligibilityDecision {
  assertDecisionChain(input);
  const { transaction } = input;
  const transactionFailure = transactionValidationFailure(transaction);
  if (transactionFailure) {
    return {
      id: input.decisionId,
      transactionId: transaction.id,
      version: input.version,
      status: "INELIGIBLE",
      expectedAmountPaise: 0,
      filingDeadline: "",
      evaluatedAt: input.evaluatedAt,
      evaluatedBy: input.actor.userId,
      previousDecisionId: input.previousDecision?.id,
      ruleResults: [transactionFailure],
    };
  }
  const duplicateDeviceIdentifier = input.duplicateDeviceIdentifiers.has(
    transaction.deviceIdentifier,
  );
  const duplicateLease = input.duplicateLeaseIds.has(transaction.leaseId);
  const claimedDeviceIdentifier =
    input.existingClaimedDeviceIdentifiers.has(transaction.deviceIdentifier);
  const claimedLease = input.existingClaimedLeaseIds.has(transaction.leaseId);
  const preMappingResults: RuleResult[] = [
    passed(
      "TRANSACTION_FIELDS_VALID",
      "Transaction fields",
      "Required transaction fields and financial values are valid.",
    ),
    leaseStatusResult(transaction.leaseStatus),
    duplicateDeviceIdentifier
      ? failed(
          "DUPLICATE_DEVICE_IDENTIFIER",
          "Device identifier uniqueness",
          "The IMEI or serial is duplicated in the purchase repository.",
        )
      : passed(
          "DEVICE_IDENTIFIER_UNIQUE",
          "Device identifier uniqueness",
          "The IMEI or serial is not duplicated.",
        ),
    duplicateLease
      ? failed(
          "DUPLICATE_LEASE",
          "Lease uniqueness",
          "The lease is duplicated in the purchase repository.",
        )
      : passed(
          "LEASE_UNIQUE",
          "Lease uniqueness",
          "The lease is not duplicated.",
        ),
    claimedDeviceIdentifier
      ? failed(
          "ALREADY_CLAIMED_DEVICE_IDENTIFIER",
          "Prior device claim",
          "The IMEI or serial has already been claimed.",
        )
      : passed(
          "DEVICE_IDENTIFIER_NOT_CLAIMED",
          "Prior device claim",
          "The IMEI or serial has not already been claimed.",
        ),
    claimedLease
      ? failed(
          "ALREADY_CLAIMED_LEASE",
          "Prior lease claim",
          "The lease has already been claimed.",
        )
      : passed(
          "LEASE_NOT_CLAIMED",
          "Prior lease claim",
          "The lease has not already been claimed.",
        ),
  ];
  const mappingResolution = resolveProgrammeMapping(
    transaction,
    input.mappings,
  );
  if (mappingResolution.status !== "RESOLVED") {
    const ambiguous = mappingResolution.status === "AMBIGUOUS";
    const ruleResults = [
      ...preMappingResults,
      reviewed(
        ambiguous
          ? "PROGRAMME_MAPPING_AMBIGUOUS"
          : "PROGRAMME_MAPPING_MISSING",
        "Programme mapping",
        ambiguous
          ? "More than one approved programme mapping applies."
          : "No approved programme mapping applies.",
      ),
    ];
    return {
      id: input.decisionId,
      transactionId: transaction.id,
      version: input.version,
      status: statusFor(ruleResults),
      expectedAmountPaise: 0,
      filingDeadline: "",
      evaluatedAt: input.evaluatedAt,
      evaluatedBy: input.actor.userId,
      previousDecisionId: input.previousDecision?.id,
      ruleResults,
    };
  }

  const mapping = mappingResolution.mapping;
  const beforeProgrammeLaunch = transaction.invoiceDate < mapping.launchDate;
  const mappingResults: RuleResult[] = [
    ...preMappingResults,
    {
      ...passed(
      "PROGRAMME_MAPPING_RESOLVED",
      "Programme mapping resolved",
      "Exactly one approved programme mapping applies.",
      ),
      sourceEntityType: "EmployerProgrammeMappingVersion",
      sourceEntityId: mapping.id,
    },
    beforeProgrammeLaunch
      ? failed(
          "BEFORE_PROGRAMME_LAUNCH",
          "Programme launch",
          "The transaction predates programme launch.",
        )
      : passed(
          "PROGRAMME_LAUNCHED",
          "Programme launch",
          "The invoice date is on or after programme launch.",
        ),
  ];
  const scheme = input.schemes.find(
    (candidate) => candidate.id === mapping.schemeVersionId,
  );
  if (!scheme || scheme.workflowStatus !== "APPROVED") {
    const ruleResults = [
      ...mappingResults,
      reviewed(
        "SCHEME_NOT_APPROVED",
        "Scheme approval",
        "The explicitly mapped scheme version is missing or not approved.",
      ),
    ];
    return {
      id: input.decisionId,
      transactionId: transaction.id,
      version: input.version,
      status: statusFor(ruleResults),
      expectedAmountPaise: 0,
      filingDeadline: "",
      evaluatedAt: input.evaluatedAt,
      evaluatedBy: input.actor.userId,
      previousDecisionId: input.previousDecision?.id,
      ruleResults,
    };
  }
  const schemeResults: RuleResult[] = [
    ...mappingResults,
    {
      ...passed(
      "SCHEME_APPROVED",
      "Scheme approval",
      "The mapped scheme version is approved.",
      ),
      sourceEntityType: "SchemeVersion",
      sourceEntityId: scheme.id,
    },
  ];
  if (
    !dateIsWithinInclusive(
      transaction.invoiceDate,
      scheme.effectiveFrom,
      scheme.effectiveTo,
    )
  ) {
    const ruleResults = [
      ...schemeResults,
      reviewed(
        "SCHEME_OUTSIDE_VALIDITY",
        "Scheme validity",
        "The mapped scheme does not cover the invoice date.",
      ),
    ];
    return {
      id: input.decisionId,
      transactionId: transaction.id,
      version: input.version,
      status: statusFor(ruleResults),
      expectedAmountPaise: 0,
      filingDeadline: "",
      evaluatedAt: input.evaluatedAt,
      evaluatedBy: input.actor.userId,
      previousDecisionId: input.previousDecision?.id,
      ruleResults,
    };
  }

  const validatedSchemeResults: RuleResult[] = [
    ...schemeResults,
    {
      ...passed(
      "SCHEME_WITHIN_VALIDITY",
      "Scheme effective",
      "The scheme covers the invoice date.",
      ),
      sourceEntityType: "SchemeVersion",
      sourceEntityId: scheme.id,
    },
  ];
  let ruleSnapshot: EligibilityRuleSnapshot;
  try {
    ruleSnapshot = resolveEffectiveRules(mapping, scheme, input.oemDefaults);
  } catch {
    const ruleResults = [
      ...validatedSchemeResults,
      reviewed(
        "RULE_CONFIGURATION_MISSING",
        "Rule values",
        "Required effective rule configuration could not be resolved.",
      ),
    ];
    return {
      id: input.decisionId,
      transactionId: transaction.id,
      version: input.version,
      status: statusFor(ruleResults),
      expectedAmountPaise: 0,
      filingDeadline: "",
      evaluatedAt: input.evaluatedAt,
      evaluatedBy: input.actor.userId,
      previousDecisionId: input.previousDecision?.id,
      ruleResults,
    };
  }
  const productEligible = ruleSnapshot.eligibleProductIds.includes(
    transaction.productId,
  );
  const expectedAmountPaise = calculateExpectedAmountPaise({
    calculationBasis: ruleSnapshot.calculationBasis,
    invoiceValuePaise: transaction.invoiceValuePaise,
    baseValuePaise: transaction.baseValuePaise,
    rateBps: ruleSnapshot.rateBps,
    flatAmountPaise: ruleSnapshot.flatAmountPaise,
  });
  const filingDeadline = addDaysIso(
    transaction.invoiceDate,
    ruleSnapshot.claimTimelineDays,
  );
  const evaluationDateValid = isValidDateOnly(input.evaluationDate);
  const filingTimelineExpired =
    evaluationDateValid && input.evaluationDate > filingDeadline;
  const filingTimelineResult = !evaluationDateValid
    ? reviewed(
        "EVALUATION_DATE_INVALID",
        "Evaluation date",
        "The evaluation date must be a valid YYYY-MM-DD calendar date.",
      )
    : filingTimelineExpired
      ? reviewed(
          "FILING_TIMELINE_EXPIRED",
          "Filing timeline",
          "The filing deadline has passed and requires authorised review.",
        )
      : passed(
          "FILING_TIMELINE_CURRENT",
          "Filing timeline",
          "The filing deadline has not passed.",
        );
  const ruleResults: RuleResult[] = [
    ...validatedSchemeResults,
    productEligible
      ? passed(
          "PRODUCT_ELIGIBLE",
          "Product eligibility",
          "The product is covered by the effective rules.",
        )
      : failed(
          "PRODUCT_NOT_ELIGIBLE",
          "Product eligibility",
          "The product is not covered by the effective rules.",
        ),
    passed(
      "RULE_VALUES_RESOLVED",
      "Rule values",
      "All required rule values resolved from approved configuration.",
    ),
    passed(
      "EXPECTED_AMOUNT_CALCULATED",
      "Expected subvention",
      "The expected amount was calculated in integer paise.",
    ),
    passed(
      "FILING_DEADLINE_CALCULATED",
      "Filing deadline",
      "The filing deadline was calculated from the configured timeline.",
    ),
    filingTimelineResult,
  ];

  return {
    id: input.decisionId,
    transactionId: transaction.id,
    version: input.version,
    status: statusFor(ruleResults),
    expectedAmountPaise,
    filingDeadline,
    evaluatedAt: input.evaluatedAt,
    evaluatedBy: input.actor.userId,
    previousDecisionId: input.previousDecision?.id,
    ruleSnapshot: {
      ...ruleSnapshot,
      eligibleProductIds: [...ruleSnapshot.eligibleProductIds],
      precedenceSources: [...ruleSnapshot.precedenceSources],
    },
    ruleResults,
  };
}
