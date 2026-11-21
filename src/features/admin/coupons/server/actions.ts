"use server";

import { and, desc, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/shared/db";
import { coupon } from "@/shared/db/schema";
import { requireCan } from "@/shared/authz/can";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { revalidateFinance } from "@/shared/lib/revalidate";
import { evaluateCoupon, normalizeCode, type CouponValidationResult } from "./core";
import { couponSchema, type CouponInput } from "./schema";

export type { ActionResult, CouponValidationResult };

function values(d: CouponInput, code: string) {
  return {
    code,
    discountType: d.discountType,
    discountValue: d.discountValue,
    minOrderAmount: d.minOrderAmount,
    maxRedemptions: d.maxRedemptions ?? null,
    startsAt: d.startsAt ? new Date(d.startsAt) : null,
    expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
    isActive: d.isActive,
  };
}

export async function listCoupons() {
  const auth = await requireCan("finance.view");
  if (!auth.ok) return [];
  return db.query.coupon.findMany({
    where: isNull(coupon.deletedAt),
    orderBy: [desc(coupon.createdAt)],
  });
}

export async function createCoupon(input: CouponInput): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCan("finance.manage");
  if (!auth.ok) return fail(auth.error);

  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const code = normalizeCode(parsed.data.code);

  const taken = await db.query.coupon.findFirst({
    where: eq(coupon.code, code),
    columns: { id: true },
  });
  if (taken) return fail("A coupon with that code already exists.");

  const [created] = await db
    .insert(coupon)
    .values(values(parsed.data, code))
    .returning({ id: coupon.id });

  revalidateFinance();
  return ok({ id: created.id });
}

export async function updateCoupon(couponId: string, input: CouponInput): Promise<ActionResult> {
  const auth = await requireCan("finance.manage");
  if (!auth.ok) return fail(auth.error);

  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const code = normalizeCode(parsed.data.code);

  const taken = await db.query.coupon.findFirst({
    where: and(eq(coupon.code, code), ne(coupon.id, couponId)),
    columns: { id: true },
  });
  if (taken) return fail("A coupon with that code already exists.");

  const [updated] = await db
    .update(coupon)
    .set(values(parsed.data, code))
    .where(eq(coupon.id, couponId))
    .returning({ id: coupon.id });
  if (!updated) return fail("Coupon not found.");

  revalidateFinance();
  return ok();
}

export async function deleteCoupon(couponId: string): Promise<ActionResult> {
  const auth = await requireCan("finance.manage");
  if (!auth.ok) return fail(auth.error);

  // Free the (globally unique) code for reuse by renaming the deleted row.
  const existing = await db.query.coupon.findFirst({ where: eq(coupon.id, couponId) });
  if (!existing) return fail("Coupon not found.");
  await db
    .update(coupon)
    .set({
      deletedAt: new Date(),
      isActive: false,
      code: `${existing.code}~deleted~${couponId.slice(0, 8)}`,
    })
    .where(eq(coupon.id, couponId));

  revalidateFinance();
  return ok();
}

/** Public (storefront) — preview a code's discount. Checkout re-validates. */
export async function checkCoupon(
  code: string,
  subtotal: number,
): Promise<CouponValidationResult> {
  if (typeof code !== "string" || code.length > 40) {
    return { valid: false, error: "That coupon code isn't valid." };
  }
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return { valid: false, error: "Invalid order amount." };
  }
  return evaluateCoupon(code, Math.round(subtotal));
}
