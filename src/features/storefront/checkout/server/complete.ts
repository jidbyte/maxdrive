// Server-only (not a "use server" module). Called by the Paystack webhook
// and by the post-payment callback page — whichever arrives first wins;
// the second is a no-op.
import { eq, sql } from "drizzle-orm";

import { db } from "@/shared/db";
import { cart, cartItem, sale } from "@/shared/db/schema";
import { toMinorUnits, verifyTransaction } from "@/shared/lib/paystack";
import { revalidateCatalog, revalidateOrders } from "@/shared/lib/revalidate";
import { getStoreSettings } from "@/shared/store/settings";
import { commitSaleStock } from "@/features/admin/sales/server/core";
import { redeemCoupon } from "@/features/admin/coupons/server/core";
import { InsufficientStockError } from "@/features/admin/inventory/server/stock";
import { sendOrderNotifications } from "@/features/app/notifications/server/send-order-notifications";

export type CompletionResult =
  | { ok: true; saleId: string; saleNumber: string; accessToken: string; alreadyPaid: boolean }
  | { ok: false; error: string; retryable: boolean };

export async function completeOnlinePayment(reference: string): Promise<CompletionResult> {
  const order = await db.query.sale.findFirst({ where: eq(sale.paystackReference, reference) });
  if (!order) return { ok: false, error: "Order not found for this payment.", retryable: false };

  if (order.paymentStatus === "paid") {
    return {
      ok: true,
      saleId: order.id,
      saleNumber: order.saleNumber,
      accessToken: order.accessToken,
      alreadyPaid: true,
    };
  }

  const verified = await verifyTransaction(reference);
  if (!verified.ok) return { ok: false, error: verified.error, retryable: true };
  if (verified.data.status !== "success") {
    return { ok: false, error: `Payment ${verified.data.status}.`, retryable: false };
  }
  // Never trust anything but our own stored total.
  if (
    verified.data.amount !== toMinorUnits(order.totalAmount) ||
    verified.data.currency.toUpperCase() !== (await storeCurrency())
  ) {
    console.error("[completeOnlinePayment] amount/currency mismatch", {
      reference,
      expected: toMinorUnits(order.totalAmount),
      got: verified.data.amount,
      currency: verified.data.currency,
    });
    return { ok: false, error: "Payment amount mismatch. Please contact support.", retryable: false };
  }

  let stockShortfall = false;
  const transitioned = await db.transaction(async (tx) => {
    // Claim pending → paid exactly once.
    const [claimed] = await tx
      .update(sale)
      .set({
        paymentStatus: "paid",
        paymentMethod: "paystack",
        status: "processing",
        balance: 0,
        paidAt: new Date(),
      })
      .where(sql`${sale.id} = ${order.id} AND ${sale.paymentStatus} <> 'paid'`)
      .returning({ id: sale.id });
    if (!claimed) return false;

    try {
      await tx.transaction(async (inner) => {
        await commitSaleStock(inner, order.id, null);
      });
    } catch (err) {
      if (!(err instanceof InsufficientStockError)) throw err;
      // Paid but stock ran out between checkout and payment. Keep the
      // payment, flag the order for staff (refund or backorder).
      stockShortfall = true;
      await tx
        .update(sale)
        .set({
          notes: sql`concat_ws(E'\n', ${sale.notes}, '⚠ STOCK SHORTFALL at payment time — review before fulfilling.')`,
        })
        .where(eq(sale.id, order.id));
    }

    if (order.couponId) await redeemCoupon(tx, order.couponId);

    // Empty the buyer's cart now that the order is paid.
    if (order.buyerUid) {
      const c = await tx.query.cart.findFirst({
        where: eq(cart.buyerUid, order.buyerUid),
        columns: { id: true },
      });
      if (c) await tx.delete(cartItem).where(eq(cartItem.cartId, c.id));
    }
    return true;
  });

  if (transitioned) {
    if (stockShortfall) console.warn("[completeOnlinePayment] stock shortfall on", order.saleNumber);
    await sendOrderNotifications(order.id);
    revalidateOrders();
    revalidateCatalog();
  }

  return {
    ok: true,
    saleId: order.id,
    saleNumber: order.saleNumber,
    accessToken: order.accessToken,
    alreadyPaid: !transitioned,
  };
}

async function storeCurrency(): Promise<string> {
  return (await getStoreSettings()).currency.toUpperCase();
}
