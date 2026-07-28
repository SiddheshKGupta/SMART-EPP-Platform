import type { CalculationInput } from "./types";

export function calculateExpectedAmountPaise(input: CalculationInput) {
  if (input.calculationBasis === "FLAT_AMOUNT") {
    if (!input.flatAmountPaise || input.flatAmountPaise <= 0) {
      throw new Error("Positive flat amount required");
    }
    return input.flatAmountPaise;
  }

  if (!input.rateBps || input.rateBps <= 0 || input.rateBps > 10_000) {
    throw new Error("Rate must be between 1 and 10000 basis points");
  }

  const basis =
    input.calculationBasis === "INVOICE_VALUE"
      ? input.invoiceValuePaise
      : input.baseValuePaise;
  return Math.round((basis * input.rateBps) / 10_000);
}
