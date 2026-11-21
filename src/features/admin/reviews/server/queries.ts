import { and, desc, eq, inArray, isNull, notInArray } from "drizzle-orm";

import { db } from "@/shared/db";
import { review, saleItem, sale, product } from "@/shared/db/schema";

const visible = and(isNull(review.deletedAt), eq(review.status, "published"));

export async function getReviewsForProduct(productId: string) {
  return db.query.review.findMany({
    where: and(eq(review.productId, productId), visible),
    orderBy: [desc(review.createdAt)],
  });
}

export async function getReviewSummaryForProduct(productId: string) {
  const rows = await db.query.review.findMany({
    where: and(eq(review.productId, productId), visible),
    columns: { rating: true },
  });
  if (rows.length === 0) return { averageRating: 0, reviewCount: 0 };
  return {
    averageRating: rows.reduce((sum, r) => sum + r.rating, 0) / rows.length,
    reviewCount: rows.length,
  };
}

export async function getReviewSummariesForProducts(
  productIds: string[],
): Promise<Map<string, { averageRating: number; reviewCount: number }>> {
  if (productIds.length === 0) return new Map();
  const rows = await db.query.review.findMany({
    where: and(inArray(review.productId, productIds), visible),
    columns: { productId: true, rating: true },
  });

  const byProduct = new Map<string, number[]>();
  for (const r of rows) {
    const list = byProduct.get(r.productId) ?? [];
    list.push(r.rating);
    byProduct.set(r.productId, list);
  }
  const out = new Map<string, { averageRating: number; reviewCount: number }>();
  for (const [id, ratings] of byProduct) {
    out.set(id, {
      averageRating: ratings.reduce((s, r) => s + r, 0) / ratings.length,
      reviewCount: ratings.length,
    });
  }
  return out;
}

export async function getReviewByBuyerForProduct(productId: string, buyerUid: string) {
  return db.query.review.findFirst({
    where: and(eq(review.productId, productId), eq(review.buyerUid, buyerUid)),
  });
}

export async function getReviewsByBuyerForProducts(buyerUid: string, productIds: string[]) {
  if (productIds.length === 0) return new Map<string, typeof review.$inferSelect>();
  const rows = await db.query.review.findMany({
    where: and(eq(review.buyerUid, buyerUid), inArray(review.productId, productIds)),
  });
  return new Map(rows.map((r) => [r.productId, r]));
}

/**
 * Verified purchase: the signed-in buyer has a non-cancelled order containing
 * this product. Returns the most recent qualifying sale_item id, or null.
 */
export async function getEligibleSaleItemForReview(
  productId: string,
  buyerUid: string,
): Promise<string | null> {
  const rows = await db
    .select({ saleItemId: saleItem.id })
    .from(saleItem)
    .innerJoin(sale, eq(saleItem.saleId, sale.id))
    .where(
      and(
        eq(sale.buyerUid, buyerUid),
        eq(saleItem.productId, productId),
        notInArray(sale.status, ["cancelled", "refunded"]),
        eq(sale.paymentStatus, "paid"),
      ),
    )
    .orderBy(desc(sale.saleDate))
    .limit(1);
  return rows[0]?.saleItemId ?? null;
}

/** Admin moderation view. */
export async function listReviews() {
  return db
    .select({
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      buyerName: review.buyerName,
      status: review.status,
      createdAt: review.createdAt,
      productId: review.productId,
      productName: product.name,
      productSlug: product.slug,
    })
    .from(review)
    .innerJoin(product, eq(review.productId, product.id))
    .where(isNull(review.deletedAt))
    .orderBy(desc(review.createdAt));
}
