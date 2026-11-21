// Server-only coupon logic (NOT a "use server" module — not network-callable).
import { and, eq, isNull, or, sql, lt, isNull as isNullCol } from "drizzle-orm";

import { db, type DbOrTx } from "@/shared/db";
import { coupon } from "@/shared/db/schema";

export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export type CouponValidationResult =
  | { valid: true; couponId: string; code: string; discountAmount: number }
  | { valid: false; error: string };

/**
 * Validates a code against an order subtotal. All constraints (active, date
 * window, redemption cap, minimum order) are enforced here; the storefront
 * only ever displays the result, and checkout re-runs this server-side.
 */
export async function evaluateCoupon(
  code: string,
  subtotal: number,
  tx: DbOrTx = db,
): Promise<CouponValidationResult> {
  const normalized = normalizeCode(code);
  if (!normalized) return { valid: false, error: "Enter a coupon code." };

  const record = await tx.query.coupon.findFirst({
    where: and(eq(coupon.code, normalized), isNull(coupon.deletedAt)),
  });

  if (!record || !record.isActive) return { valid: false, error: "That coupon code isn't valid." };

  const now = new Date();
  if (record.startsAt && record.startsAt > now) {
    return { valid: false, error: "That coupon isn't active yet." };
  }
  if (record.expiresAt && record.expiresAt < now) {
    return { valid: false, error: "That coupon has expired." };
  }
  if (record.maxRedemptions !== null && record.redemptionCount >= record.maxRedemptions) {
    return { valid: false, error: "That coupon has reached its redemption limit." };
  }
  if (subtotal < record.minOrderAmount) {
    return { valid: false, error: "Your order doesn't meet this coupon's minimum amount." };
  }

  const discountAmount =
    record.discountType === "percentage"
      ? Math.round((subtotal * Math.min(record.discountValue, 100)) / 100)
      : Math.min(record.discountValue, subtotal);

  return { valid: true, couponId: record.id, code: record.code, discountAmount };
}

/**
 * Atomically consumes one redemption, respecting maxRedemptions even under
 * concurrency. Returns false if the cap was reached in the meantime.
 */
export async function redeemCoupon(tx: DbOrTx, couponId: string): Promise<boolean> {
  const [row] = await tx
    .update(coupon)
    .set({ redemptionCount: sql`${coupon.redemptionCount} + 1` })
    .where(
      and(
        eq(coupon.id, couponId),
        or(isNullCol(coupon.maxRedemptions), lt(coupon.redemptionCount, coupon.maxRedemptions)),
      ),
    )
    .returning({ id: coupon.id });
  return !!row;
}
