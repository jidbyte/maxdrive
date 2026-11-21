import { and, asc, desc, eq, ilike, isNull, lte, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/shared/db";
import { appUser, image, inventoryLog, product } from "@/shared/db/schema";
import type { StockReason } from "./stock";

export type StockFilter = "all" | "low" | "out";

const notDeleted = isNull(product.deletedAt);

export async function getInventorySummary() {
  const [row] = await db
    .select({
      skus: sql<number>`count(*)::int`,
      units: sql<number>`coalesce(sum(${product.quantity}), 0)::int`,
      costValue: sql<number>`coalesce(sum(${product.quantity} * ${product.costPrice}), 0)::bigint`,
      retailValue: sql<number>`coalesce(sum(${product.quantity} * ${product.sellingPrice}), 0)::bigint`,
      low: sql<number>`count(*) filter (where ${product.quantity} > 0 and ${product.quantity} <= ${product.restockLevel})::int`,
      out: sql<number>`count(*) filter (where ${product.quantity} <= 0)::int`,
    })
    .from(product)
    .where(notDeleted);
  return {
    skus: Number(row.skus),
    units: Number(row.units),
    costValue: Number(row.costValue),
    retailValue: Number(row.retailValue),
    low: Number(row.low),
    out: Number(row.out),
  };
}

export async function listStock(opts: { q?: string; filter?: StockFilter; limit?: number }) {
  const where: SQL[] = [notDeleted];
  const q = opts.q?.trim();
  if (q) {
    const t = `%${q}%`;
    where.push(or(ilike(product.name, t), ilike(product.sku, t), ilike(product.partNumber, t), ilike(product.brand, t))!);
  }
  if (opts.filter === "out") where.push(lte(product.quantity, 0));
  if (opts.filter === "low") {
    where.push(sql`${product.quantity} > 0 and ${product.quantity} <= ${product.restockLevel}`);
  }

  const rows = await db
    .select({
      id: product.id,
      name: product.name,
      sku: product.sku,
      partNumber: product.partNumber,
      brand: product.brand,
      quantity: product.quantity,
      restockLevel: product.restockLevel,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      isActive: product.isActive,
      imageUrl: sql<string | null>`(select ${image.url} from ${image} where ${image.productId} = ${product.id} order by ${image.isPrimary} desc limit 1)`,
    })
    .from(product)
    .where(and(...where))
    // Most urgent first: out of stock, then lowest stock relative to reorder level.
    .orderBy(
      asc(sql`case when ${product.quantity} <= 0 then 0 when ${product.quantity} <= ${product.restockLevel} then 1 else 2 end`),
      asc(product.quantity),
      asc(product.name),
    )
    .limit(opts.limit ?? 500);
  return rows;
}

export async function listMovements(opts: { productId?: string; reason?: StockReason; limit?: number }) {
  const where: SQL[] = [];
  if (opts.productId) where.push(eq(inventoryLog.productId, opts.productId));
  if (opts.reason) where.push(eq(inventoryLog.reason, opts.reason));

  return db
    .select({
      id: inventoryLog.id,
      createdAt: inventoryLog.createdAt,
      delta: inventoryLog.delta,
      balanceAfter: inventoryLog.balanceAfter,
      reason: inventoryLog.reason,
      note: inventoryLog.note,
      referenceType: inventoryLog.referenceType,
      referenceId: inventoryLog.referenceId,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      actorName: appUser.name,
      actorEmail: appUser.email,
    })
    .from(inventoryLog)
    .innerJoin(product, eq(product.id, inventoryLog.productId))
    .leftJoin(appUser, eq(appUser.authUid, inventoryLog.actorUid))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(inventoryLog.createdAt))
    .limit(opts.limit ?? 200);
}
