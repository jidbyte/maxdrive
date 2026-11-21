"use server";

import { eq, sql } from "drizzle-orm";

import { db, type DbOrTx } from "@/shared/db";
import { purchase, purchaseItem, auditLog } from "@/shared/db/schema";
import { requireCan } from "@/shared/authz/can";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { documentNumber, NUMBER_PREFIX } from "@/shared/lib/numbers";
import { revalidatePurchases } from "@/shared/lib/revalidate";
import { applyStockChange } from "@/features/admin/inventory/server/stock";
import {
  createPurchaseSchema,
  PAYMENT_STATUSES,
  PURCHASE_STATUSES,
  type CreatePurchaseInput,
  type PaymentStatus,
  type PurchaseStatus,
} from "./schema";

export type { ActionResult };

function computeTotal(items: CreatePurchaseInput["items"], shipping: number, discount: number) {
  const itemsTotal = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  return Math.max(0, itemsTotal + shipping - discount);
}

async function insertItems(tx: DbOrTx, purchaseId: string, items: CreatePurchaseInput["items"]) {
  await tx.insert(purchaseItem).values(
    items.map((item) => ({
      purchaseId,
      productId: item.productId || null,
      productName: item.productName,
      productCode: item.productCode || null,
      productSku: item.productSku,
      quantity: item.quantity,
      unitCost: item.unitCost,
      subtotal: item.quantity * item.unitCost,
    })),
  );
}

export async function createPurchase(
  input: CreatePurchaseInput,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCan("purchases.manage");
  if (!auth.ok) return fail(auth.error);

  const parsed = createPurchaseSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const d = parsed.data;

  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(purchase)
      .values({
        purchaseNumber: documentNumber(NUMBER_PREFIX.purchase),
        supplierId: d.supplierId || null,
        supplierName: d.supplierName,
        purchaseDate: new Date(d.purchaseDate),
        eta: d.eta ? new Date(d.eta) : null,
        shippingCost: d.shippingCost,
        discountAmount: d.discountAmount,
        totalAmount: computeTotal(d.items, d.shippingCost, d.discountAmount),
        paymentStatus: "pending",
        purchaseStatus: "draft",
      })
      .returning({ id: purchase.id });
    await insertItems(tx, created.id, d.items);
    return created.id;
  });

  revalidatePurchases();
  return ok({ id });
}

export async function updatePurchase(
  purchaseId: string,
  input: CreatePurchaseInput,
): Promise<ActionResult> {
  const auth = await requireCan("purchases.manage");
  if (!auth.ok) return fail(auth.error);

  const existing = await db.query.purchase.findFirst({ where: eq(purchase.id, purchaseId) });
  if (!existing) return fail("Purchase order not found.");
  if (existing.purchaseStatus !== "draft") return fail("Only draft purchase orders can be edited.");

  const parsed = createPurchaseSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const d = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(purchase)
      .set({
        supplierId: d.supplierId || null,
        supplierName: d.supplierName,
        purchaseDate: new Date(d.purchaseDate),
        eta: d.eta ? new Date(d.eta) : null,
        shippingCost: d.shippingCost,
        discountAmount: d.discountAmount,
        totalAmount: computeTotal(d.items, d.shippingCost, d.discountAmount),
      })
      .where(eq(purchase.id, purchaseId));
    await tx.delete(purchaseItem).where(eq(purchaseItem.purchaseId, purchaseId));
    await insertItems(tx, purchaseId, d.items);
  });

  revalidatePurchases();
  return ok();
}

export async function updatePurchaseStatus(
  purchaseId: string,
  nextStatus: PurchaseStatus,
): Promise<ActionResult> {
  const auth = await requireCan("purchases.manage");
  if (!auth.ok) return fail(auth.error);
  if (!PURCHASE_STATUSES.includes(nextStatus)) return fail("Invalid status.");

  const existing = await db.query.purchase.findFirst({
    where: eq(purchase.id, purchaseId),
    with: { items: true },
  });
  if (!existing) return fail("Purchase order not found.");
  if (existing.purchaseStatus === "received" || existing.purchaseStatus === "cancelled") {
    return fail(`This order is already ${existing.purchaseStatus} and can't be changed.`);
  }

  await db.transaction(async (tx) => {
    if (nextStatus === "received") {
      // Claim the transition atomically so a double-click can't credit stock twice.
      const [claimed] = await tx
        .update(purchase)
        .set({ purchaseStatus: "received", deliveryDate: new Date() })
        .where(
          sql`${purchase.id} = ${purchaseId} AND ${purchase.purchaseStatus} NOT IN ('received','cancelled')`,
        )
        .returning({ id: purchase.id });
      if (!claimed) return;

      for (const item of existing.items) {
        if (!item.productId) continue;
        await applyStockChange(tx, {
          productId: item.productId,
          delta: item.quantity,
          reason: "purchase_received",
          note: `Received ${existing.purchaseNumber}`,
          referenceType: "purchase",
          referenceId: purchaseId,
          actorUid: auth.uid,
        });
      }
    } else {
      await tx
        .update(purchase)
        .set({ purchaseStatus: nextStatus })
        .where(eq(purchase.id, purchaseId));
    }
    await tx.insert(auditLog).values({
      actorUid: auth.uid,
      action: "purchase.status",
      entityType: "purchase",
      entityId: purchaseId,
      metadata: { from: existing.purchaseStatus, to: nextStatus },
    });
  });

  revalidatePurchases();
  return ok();
}

export async function updatePurchasePaymentStatus(
  purchaseId: string,
  nextStatus: PaymentStatus,
): Promise<ActionResult> {
  const auth = await requireCan("purchases.manage");
  if (!auth.ok) return fail(auth.error);
  if (!PAYMENT_STATUSES.includes(nextStatus)) return fail("Invalid status.");

  const existing = await db.query.purchase.findFirst({
    where: eq(purchase.id, purchaseId),
    columns: { id: true },
  });
  if (!existing) return fail("Purchase order not found.");

  await db.update(purchase).set({ paymentStatus: nextStatus }).where(eq(purchase.id, purchaseId));
  revalidatePurchases();
  return ok();
}
