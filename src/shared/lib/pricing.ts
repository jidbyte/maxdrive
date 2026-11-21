export type PricingLine = { quantity: number; unitPrice: number };

export type PricingInput = {
  lines: PricingLine[];
  discountAmount?: number;
  deliveryFee?: number;
  /** Basis points: 1250 = 12.5% */
  taxRateBps?: number;
  /** true = listed prices already include tax (tax is informational). */
  taxInclusive?: boolean;
};

export type PricingTotals = {
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  taxAmount: number;
  totalAmount: number;
};

/**
 * Single source of truth for order maths (whole currency units). Used by
 * the storefront preview AND re-run on the server at checkout — the
 * client's numbers are never trusted.
 */
export function computeTotals(input: PricingInput): PricingTotals {
  const subtotal = input.lines.reduce(
    (sum, l) => sum + Math.max(0, l.quantity) * Math.max(0, l.unitPrice),
    0,
  );
  const discountAmount = Math.min(Math.max(0, input.discountAmount ?? 0), subtotal);
  const deliveryFee = Math.max(0, input.deliveryFee ?? 0);
  const taxable = subtotal - discountAmount;
  const rate = Math.max(0, input.taxRateBps ?? 0) / 10_000;

  const taxAmount = input.taxInclusive
    ? Math.round(taxable - taxable / (1 + rate))
    : Math.round(taxable * rate);

  const totalAmount = taxable + deliveryFee + (input.taxInclusive ? 0 : taxAmount);
  return { subtotal, discountAmount, deliveryFee, taxAmount, totalAmount };
}
