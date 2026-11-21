"use server";

import { eq } from "drizzle-orm";

import { db } from "@/shared/db";
import { sale, auditLog } from "@/shared/db/schema";
import { requireCan } from "@/shared/authz/can";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { computeTotals } from "@/shared/lib/pricing";
import { revalidateCatalog, revalidateOrders } from "@/shared/lib/revalidate";
import { getStoreSettings } from "@/shared/store/settings";
import { InsufficientStockError } from "@/features/admin/inventory/server/stock";
import { insertSale, releaseSaleStock } from "./core";
import {
  createSaleSchema,
  saleStatusSchema,
  updateSaleSchema,
  type CreateSaleInput,
  type PaymentStatus,
  type SaleStatus,
  type UpdateSaleInput,
} from "./schema";

export type { ActionResult };

/** Walk-in / POS sale recorded by staff. Stock is decremented immediately. */
export async function createSale(
  input: CreateSaleInput,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCan("orders.manage");
  if (!auth.ok) return fail(auth.error);

  const parsed = createSaleSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const d = parsed.data;

  const settings = await getStoreSettings();
  const totals = computeTotals({
    lines: d.items,
    discountAmount: d.discountAmount,
    taxRateBps: settings.taxRateBps,
    taxInclusive: settings.taxInclusive,
  });

  try {
    const created = await db.transaction((tx) =>
      insertSale(tx, {
        channel: "walk_in",
        fulfilment: "pickup",
        status: d.paymentStatus === "paid" ? "completed" : "pending",
        customerId: d.customerId || null,
        customerName: d.customerName,
        customerPhone: d.customerPhone || null,
        saleDate: new Date(d.saleDate),
        ...totals,
        paymentStatus: d.paymentStatus,
        paymentMethod: d.paymentMethod ?? null,
        balance: d.balance,
        notes: d.notes || null,
        items: d.items,
        commitStock: true,
        actorUid: auth.uid,
      }),
    );
    revalidateOrders();
    revalidateCatalog();
    return ok({ id: created.id });
  } catch (err) {
    if (err instanceof InsufficientStockError) return fail(err.message);
    console.error("[createSale]", err);
    return fail("Could not record the sale. Please try again.");
  }
}

export async function updateSale(saleId: string, input: UpdateSaleInput): Promise<ActionResult> {
  const auth = await requireCan("orders.manage");
  if (!auth.ok) return fail(auth.error);

  const existing = await db.query.sale.findFirst({
    where: eq(sale.id, saleId),
    with: { items: true },
  });
  if (!existing) return fail("Sale not found.");
  if (existing.status === "cancelled" || existing.status === "refunded") {
    return fail("This sale is closed and can't be edited.");
  }

  const parsed = updateSaleSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const d = parsed.data;

  const settings = await getStoreSettings();
  const totals = computeTotals({
    lines: existing.items,
    discountAmount: d.discountAmount,
    deliveryFee: existing.deliveryFee,
    taxRateBps: settings.taxRateBps,
    taxInclusive: settings.taxInclusive,
  });

  await db
    .update(sale)
    .set({
      customerId: d.customerId || null,
      customerName: d.customerName,
      saleDate: new Date(d.saleDate),
      notes: d.notes || null,
      ...totals,
    })
    .where(eq(sale.id, saleId));

  revalidateOrders();
  return ok();
}

export async function updateSalePaymentInfo(
  saleId: string,
  paymentStatus: Exclude<PaymentStatus, "cancelled" | "refunded">,
  balance: number,
): Promise<ActionResult> {
  const auth = await requireCan("orders.manage");
  if (!auth.ok) return fail(auth.error);

  const existing = await db.query.sale.findFirst({ where: eq(sale.id, saleId) });
  if (!existing) return fail("Sale not found.");
  if (existing.paymentStatus === "cancelled" || existing.paymentStatus === "refunded") {
    return fail("This sale is closed.");
  }
  if (!Number.isInteger(balance) || balance < 0) return fail("Invalid balance.");

  const paid = paymentStatus === "paid";
  await db
    .update(sale)
    .set({
      paymentStatus,
      balance: paid ? 0 : Math.min(balance, existing.totalAmount),
      paidAt: paid ? (existing.paidAt ?? new Date()) : null,
    })
    .where(eq(sale.id, saleId));

  revalidateOrders();
  return ok();
}

/** Fulfilment status transitions (processing → ready/shipped → completed). */
export async function updateSaleStatus(saleId: string, status: SaleStatus): Promise<ActionResult> {
  const auth = await requireCan("orders.manage");
  if (!auth.ok) return fail(auth.error);

  const parsed = saleStatusSchema.safeParse(status);
  if (!parsed.success) return fail("Invalid status.");
  if (parsed.data === "cancelled" || parsed.data === "refunded") {
    return fail("Use Cancel order to cancel.");
  }

  const existing = await db.query.sale.findFirst({ where: eq(sale.id, saleId) });
  if (!existing) return fail("Sale not found.");
  if (existing.status === "cancelled" || existing.status === "refunded") {
    return fail("This order is closed.");
  }

  await db.update(sale).set({ status: parsed.data }).where(eq(sale.id, saleId));
  await db.insert(auditLog).values({
    actorUid: auth.uid,
    action: "sale.status",
    entityType: "sale",
    entityId: saleId,
    metadata: { from: existing.status, to: parsed.data },
  });

  revalidateOrders();
  return ok();
}

export async function cancelSale(saleId: string): Promise<ActionResult> {
  const auth = await requireCan("orders.manage");
  if (!auth.ok) return fail(auth.error);

  const existing = await db.query.sale.findFirst({ where: eq(sale.id, saleId) });
  if (!existing) return fail("Sale not found.");
  if (existing.status === "cancelled") return fail("This sale is already cancelled.");

  await db.transaction(async (tx) => {
    await releaseSaleStock(tx, saleId, auth.uid);
    await tx
      .update(sale)
      .set({
        status: "cancelled",
        // A paid order needs a refund recorded separately; keep the payment trail.
        paymentStatus: existing.paymentStatus === "paid" ? "paid" : "cancelled",
        balance: 0,
      })
      .where(eq(sale.id, saleId));
    await tx.insert(auditLog).values({
      actorUid: auth.uid,
      action: "sale.cancel",
      entityType: "sale",
      entityId: saleId,
      metadata: { saleNumber: existing.saleNumber },
    });
  });

  revalidateOrders();
  revalidateCatalog();
  return ok();
}
