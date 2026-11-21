// Server-only order pricing for the storefront (not a "use server" module).
import { computeTotals, type PricingTotals } from "@/shared/lib/pricing";
import { getStoreSettings } from "@/shared/store/settings";
import { evaluateCoupon } from "@/features/admin/coupons/server/core";
import type { CartView } from "@/features/storefront/cart/server/queries";

export type CheckoutQuote = PricingTotals & {
  currency: string;
  couponId: string | null;
  couponCode: string | null;
  couponError: string | null;
  freeDeliveryThreshold: number | null;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
};

/**
 * Prices a cart for checkout using LIVE product prices and store settings.
 * The only numbers that ever reach Paystack come from here.
 */
export async function quoteCart(
  cart: CartView,
  opts: { fulfilment: "delivery" | "pickup"; couponCode?: string | null },
): Promise<CheckoutQuote> {
  const settings = await getStoreSettings();
  const lines = cart.lines.filter((l) => !l.issue);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  let couponId: string | null = null;
  let couponCode: string | null = null;
  let couponError: string | null = null;
  let discountAmount = 0;
  if (opts.couponCode) {
    const result = await evaluateCoupon(opts.couponCode, subtotal);
    if (result.valid) {
      couponId = result.couponId;
      couponCode = result.code;
      discountAmount = result.discountAmount;
    } else {
      couponError = result.error;
    }
  }

  const qualifiesForFree =
    settings.freeDeliveryThreshold !== null &&
    subtotal - discountAmount >= settings.freeDeliveryThreshold;
  const deliveryFee =
    opts.fulfilment === "delivery" && !qualifiesForFree ? settings.deliveryFee : 0;

  const totals = computeTotals({
    lines,
    discountAmount,
    deliveryFee,
    taxRateBps: settings.taxRateBps,
    taxInclusive: settings.taxInclusive,
  });

  return {
    ...totals,
    currency: settings.currency,
    couponId,
    couponCode,
    couponError,
    freeDeliveryThreshold: settings.freeDeliveryThreshold,
    deliveryEnabled: settings.deliveryEnabled,
    pickupEnabled: settings.pickupEnabled,
  };
}
