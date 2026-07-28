import type { CalculationInput } from "./types";

function assertNonNegativeSafeIntegerPaise(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Paise amounts must be non-negative safe integers");
  }
}

export function calculateExpectedAmountPaise(input: CalculationInput) {
  assertNonNegativeSafeIntegerPaise(input.invoiceValuePaise);
  assertNonNegativeSafeIntegerPaise(input.baseValuePaise);

  if (input.calculationBasis === "FLAT_AMOUNT") {
    if (
      !Number.isSafeInteger(input.flatAmountPaise) ||
      input.flatAmountPaise <= 0
    ) {
      throw new Error("Positive flat amount required");
    }
    return input.flatAmountPaise;
  }

  if (
    !Number.isSafeInteger(input.rateBps) ||
    input.rateBps <= 0 ||
    input.rateBps > 10_000
  ) {
    throw new Error("Rate must be between 1 and 10000 basis points");
  }

  const basis =
    input.calculationBasis === "INVOICE_VALUE"
      ? input.invoiceValuePaise
      : input.baseValuePaise;
  return Math.round((basis * input.rateBps) / 10_000);
}
