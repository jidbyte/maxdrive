"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/shared/db";
import { product, review } from "@/shared/db/schema";
import { requireUser } from "@/shared/authz/can";
import { getStaffContext } from "@/shared/authz/session";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { getEligibleSaleItemForReview, getReviewByBuyerForProduct } from "./queries";
import { reviewSchema, type ReviewInput } from "./schema";

export type { ActionResult };

async function revalidateProduct(productId: string) {
  const p = await db.query.product.findFirst({
    where: eq(product.id, productId),
    columns: { slug: true },
  });
  if (p) revalidatePath(`/shop/p/${p.slug}`);
  revalidatePath("/admin/reviews");
  revalidatePath("/account/orders");
}

export async function upsertReview(productId: string, input: ReviewInput): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth.ok) return fail("Sign in to leave a review.");

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const { rating, title, body } = parsed.data;

  const existing = await getReviewByBuyerForProduct(productId, auth.uid);
  if (existing) {
    await db
      .update(review)
      .set({ rating, title: title || null, body, deletedAt: null })
      .where(eq(review.id, existing.id));
  } else {
    const saleItemId = await getEligibleSaleItemForReview(productId, auth.uid);
    if (!saleItemId) return fail("You can only review products you've purchased.");

    await db.insert(review).values({
      productId,
      saleItemId,
      buyerUid: auth.uid,
      buyerName: auth.user.name?.split(" ")[0] || "Verified buyer",
      rating,
      title: title || null,
      body,
    });
  }

  await revalidateProduct(productId);
  return ok();
}

/** Author can delete their own review; staff with reviews.moderate can remove any. */
export async function deleteReview(reviewId: string): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth.ok) return fail(auth.error);

  const existing = await db.query.review.findFirst({ where: eq(review.id, reviewId) });
  if (!existing) return fail("Review not found.");

  if (existing.buyerUid !== auth.uid) {
    const staff = await getStaffContext();
    if (!staff?.permissions.has("reviews.moderate")) return fail("You can't remove this review.");
  }

  await db.update(review).set({ deletedAt: new Date() }).where(eq(review.id, reviewId));
  await revalidateProduct(existing.productId);
  return ok();
}

/** Staff: hide/unhide without deleting. */
export async function setReviewVisibility(
  reviewId: string,
  visible: boolean,
): Promise<ActionResult> {
  const staff = await getStaffContext();
  if (!staff?.permissions.has("reviews.moderate")) {
    return fail("You don't have permission to do that.");
  }
  const [row] = await db
    .update(review)
    .set({ status: visible ? "published" : "hidden" })
    .where(eq(review.id, reviewId))
    .returning({ productId: review.productId });
  if (!row) return fail("Review not found.");
  await revalidateProduct(row.productId);
  return ok();
}
