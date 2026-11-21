// Server-only sale primitives. NOT a "use server" module: nothing here is
// callable from the browser. Callers (admin actions, checkout, work orders)
// do their own authorization first.
import { eq, inArray, sql } from "drizzle-orm";

import type { DbOrTx } from "@/shared/db";
import { product, sale, saleItem } from "@/shared/db/schema";
import { documentNumber, NUMBER_PREFIX } from "@/shared/lib/numbers";
import { applyStockChange } from "@/features/admin/inventory/server/stock";

type SaleInsert = typeof sale.$inferInsert;

export type SaleLine = {
  productId?: string | null;
  productName: string;
  productCode?: string | null;
  productSku: string;
  quantity: number;
  unitPrice: number;
};

export type NewSale = {
  channel: NonNullable<SaleInsert["channel"]>;
  fulfilment: NonNullable<SaleInsert["fulfilment"]>;
  status?: SaleInsert["status"];
  customerId?: string | null;
  buyerUid?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  saleDate?: Date;
  paystackReference?: string | null;
  couponId?: string | null;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: NonNullable<SaleInsert["paymentStatus"]>;
  paymentMethod?: SaleInsert["paymentMethod"];
  balance?: number;
  notes?: string | null;
  items: SaleLine[];
  /** Decrement stock now (walk-in/workshop) vs. on payment (online). */
  commitStock: boolean;
  actorUid?: string | null;
};

export async function insertSale(
  tx: DbOrTx,
  s: NewSale,
): Promise<{ id: string; saleNumber: string; accessToken: string }> {
  // Snapshot unit cost for accurate margin reporting.
  const productIds = s.items.map((i) => i.productId).filter((id): id is string => !!id);
  const costs = productIds.length
    ? await tx
        .select({ id: product.id, costPrice: product.costPrice })
        .from(product)
        .where(inArray(product.id, productIds))
    : [];
  const costById = new Map(costs.map((c) => [c.id, c.costPrice]));

  const paid = s.paymentStatus === "paid";
  const [created] = await tx
    .insert(sale)
    .values({
      saleNumber: documentNumber(NUMBER_PREFIX.sale),
      channel: s.channel,
      fulfilment: s.fulfilment,
      status: s.status ?? (paid ? "processing" : "pending"),
      customerId: s.customerId ?? null,
      buyerUid: s.buyerUid ?? null,
      customerName: s.customerName,
      customerEmail: s.customerEmail ?? null,
      customerPhone: s.customerPhone ?? null,
      deliveryAddress: s.deliveryAddress ?? null,
      deliveryCity: s.deliveryCity ?? null,
      saleDate: s.saleDate ?? new Date(),
      paystackReference: s.paystackReference ?? null,
      couponId: s.couponId ?? null,
      subtotal: s.subtotal,
      discountAmount: s.discountAmount,
      deliveryFee: s.deliveryFee,
      taxAmount: s.taxAmount,
      totalAmount: s.totalAmount,
      balance: paid ? 0 : (s.balance ?? s.totalAmount),
      paymentStatus: s.paymentStatus,
      paymentMethod: s.paymentMethod ?? null,
      paidAt: paid ? new Date() : null,
      notes: s.notes ?? null,
    })
    .returning({ id: sale.id, saleNumber: sale.saleNumber, accessToken: sale.accessToken });

  await tx.insert(saleItem).values(
    s.items.map((item) => ({
      saleId: created.id,
      productId: item.productId || null,
      productName: item.productName,
      productCode: item.productCode || null,
      productSku: item.productSku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitCost: item.productId ? (costById.get(item.productId) ?? 0) : 0,
      subtotal: item.quantity * item.unitPrice,
    })),
  );

  if (s.commitStock) await commitSaleStock(tx, created.id, s.actorUid ?? null);
  return created;
}

/**
 * Decrements stock for every product line of a sale, exactly once
 * (guarded by sale.stockCommittedAt). Throws InsufficientStockError —
 * run inside a transaction so a failure rolls everything back.
 */
export async function commitSaleStock(
  tx: DbOrTx,
  saleId: string,
  actorUid: string | null,
): Promise<boolean> {
  // Claim the commit atomically so concurrent webhook + redirect can't both run it.
  const [claimed] = await tx
    .update(sale)
    .set({ stockCommittedAt: new Date() })
    .where(sql`${sale.id} = ${saleId} AND ${sale.stockCommittedAt} IS NULL`)
    .returning({ saleNumber: sale.saleNumber });
  if (!claimed) return false;

  const items = await tx.query.saleItem.findMany({ where: eq(saleItem.saleId, saleId) });
  for (const item of items) {
    if (!item.productId) continue;
    await applyStockChange(tx, {
      productId: item.productId,
      delta: -item.quantity,
      reason: "sale",
      note: `Sold via ${claimed.saleNumber}`,
      referenceType: "sale",
      referenceId: saleId,
      actorUid,
    });
  }
  return true;
}

/** Returns stock for a sale whose stock was committed (cancel / refund). */
export async function releaseSaleStock(
  tx: DbOrTx,
  saleId: string,
  actorUid: string | null,
): Promise<void> {
  const [released] = await tx
    .update(sale)
    .set({ stockCommittedAt: null })
    .where(sql`${sale.id} = ${saleId} AND ${sale.stockCommittedAt} IS NOT NULL`)
    .returning({ saleNumber: sale.saleNumber });
  if (!released) return;

  const items = await tx.query.saleItem.findMany({ where: eq(saleItem.saleId, saleId) });
  for (const item of items) {
    if (!item.productId) continue;
    await applyStockChange(tx, {
      productId: item.productId,
      delta: item.quantity,
      reason: "sale_cancelled",
      note: `${released.saleNumber} cancelled — stock restored`,
      referenceType: "sale",
      referenceId: saleId,
      actorUid,
    });
  }
}
