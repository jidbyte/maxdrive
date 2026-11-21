import { and, eq, gte, sql } from "drizzle-orm";

import type { DbOrTx } from "@/shared/db";
import { inventoryLog, product } from "@/shared/db/schema";

export type StockReason = (typeof inventoryLog.$inferInsert)["reason"];

export type StockChange = {
  productId: string;
  /** Positive = stock in, negative = stock out. */
  delta: number;
  reason: StockReason;
  actorUid?: string | null;
  note?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
};

export class InsufficientStockError extends Error {
  constructor(public productId: string) {
    super("Not enough stock for one or more items.");
  }
}

/**
 * The ONLY way stock should change. Applies the delta atomically in a single
 * UPDATE guarded by `quantity + delta >= 0` (so concurrent checkouts can't
 * oversell) and records an inventory_log row with the resulting balance.
 *
 * Pass a transaction handle when the change is part of a larger unit of
 * work (checkout, purchase receipt, work order) so everything commits or
 * rolls back together. Throws InsufficientStockError on underflow.
 */
export async function applyStockChange(tx: DbOrTx, change: StockChange): Promise<number> {
  if (change.delta === 0) {
    const row = await tx.query.product.findFirst({
      where: eq(product.id, change.productId),
      columns: { quantity: true },
    });
    return row?.quantity ?? 0;
  }

  const [updated] = await tx
    .update(product)
    .set({ quantity: sql`${product.quantity} + ${change.delta}` })
    .where(
      and(
        eq(product.id, change.productId),
        gte(sql`${product.quantity} + ${change.delta}`, 0),
      ),
    )
    .returning({ quantity: product.quantity });

  if (!updated) throw new InsufficientStockError(change.productId);

  await tx.insert(inventoryLog).values({
    productId: change.productId,
    delta: change.delta,
    balanceAfter: updated.quantity,
    reason: change.reason,
    note: change.note ?? null,
    referenceType: change.referenceType ?? null,
    referenceId: change.referenceId ?? null,
    actorUid: change.actorUid ?? null,
  });

  return updated.quantity;
}
