import { and, asc, desc, eq, inArray, isNull, notInArray } from "drizzle-orm";

import { db } from "@/shared/db";
import { product, category, sale, saleItem } from "@/shared/db/schema";

const productWith = {
  images: true,
  productCategories: { with: { category: true } },
} as const;

// ─── Admin ───────────────────────────────────────────────────────────────

export async function listProducts() {
  return db.query.product.findMany({
    where: isNull(product.deletedAt),
    orderBy: [desc(product.createdAt)],
    with: productWith,
  });
}

export async function getProductById(productId: string) {
  return db.query.product.findFirst({
    where: and(eq(product.id, productId), isNull(product.deletedAt)),
    with: {
      ...productWith,
      fitments: { with: { make: true, model: true } },
      inventoryLogs: {
        orderBy: (l, { desc }) => [desc(l.createdAt)],
        limit: 20,
      },
    },
  });
}

/** Makes with their models, for the fitment editor. */
export async function listVehicleOptions() {
  const makes = await db.query.vehicleMake.findMany({
    orderBy: (m, { asc }) => [asc(m.name)],
    columns: { id: true, name: true },
    with: { models: { columns: { id: true, name: true }, orderBy: (m, { asc }) => [asc(m.name)] } },
  });
  return makes;
}

export async function listCategories() {
  return db.query.category.findMany({
    orderBy: [asc(category.sortOrder), asc(category.name)],
  });
}

export async function listProductOptions() {
  return db.query.product.findMany({
    where: isNull(product.deletedAt),
    orderBy: [asc(product.name)],
    columns: {
      id: true,
      name: true,
      sku: true,
      code: true,
      quantity: true,
      costPrice: true,
      sellingPrice: true,
    },
  });
}

// ─── Storefront (active, non-deleted only) ───────────────────────────────

const activeWhere = and(eq(product.isActive, true), isNull(product.deletedAt));

export async function getBestSellingProducts(limit = 10) {
  const rows = await db
    .select({ productId: saleItem.productId, quantity: saleItem.quantity })
    .from(saleItem)
    .innerJoin(sale, eq(saleItem.saleId, sale.id))
    .where(notInArray(sale.paymentStatus, ["cancelled", "refunded"]));

  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!row.productId) continue;
    totals.set(row.productId, (totals.get(row.productId) ?? 0) + row.quantity);
  }

  const rankedIds = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  if (rankedIds.length === 0) return [];

  const products = await db.query.product.findMany({
    where: and(inArray(product.id, rankedIds), activeWhere),
    with: productWith,
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return rankedIds.map((id) => byId.get(id)).filter((p) => p !== undefined);
}
