"use server";

import { eq } from "drizzle-orm";

import { db } from "@/shared/db";
import { cart, cartItem, customer, sale } from "@/shared/db/schema";
import { getCurrentUser } from "@/shared/authz/session";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { initializeTransaction } from "@/shared/lib/paystack";
import { siteConfig } from "@/shared/config/site";
import { revalidateCatalog, revalidateOrders } from "@/shared/lib/revalidate";
import { insertSale } from "@/features/admin/sales/server/core";
import { redeemCoupon } from "@/features/admin/coupons/server/core";
import { InsufficientStockError } from "@/features/admin/inventory/server/stock";
import { sendOrderNotifications } from "@/features/app/notifications/server/send-order-notifications";
import { getCartIdentity } from "@/features/storefront/cart/server/identity";
import { getCartView } from "@/features/storefront/cart/server/queries";
import { quoteCart, type CheckoutQuote } from "./quote";
import { checkoutSchema, type CheckoutInput } from "./schema";

export type { ActionResult };

/** Live price preview for the checkout page (server-computed). */
export async function getCheckoutQuote(
  fulfilment: "delivery" | "pickup",
  couponCode?: string,
): Promise<CheckoutQuote | null> {
  const view = await getCartView(await getCartIdentity());
  if (view.lines.length === 0) return null;
  return quoteCart(view, {
    fulfilment: fulfilment === "delivery" ? "delivery" : "pickup",
    couponCode: couponCode?.slice(0, 40) || null,
  });
}

async function findOrCreateCustomer(input: {
  name: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  buyerUid: string | null;
}): Promise<string> {
  if (input.buyerUid) {
    const linked = await db.query.customer.findFirst({
      where: eq(customer.buyerUid, input.buyerUid),
      columns: { id: true },
    });
    if (linked) {
      await db
        .update(customer)
        .set({ phone: input.phone, ...(input.address ? { address: input.address, city: input.city } : {}) })
        .where(eq(customer.id, linked.id));
      return linked.id;
    }
  } else {
    const byEmail = await db.query.customer.findFirst({
      where: eq(customer.email, input.email.toLowerCase()),
      columns: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  const [created] = await db
    .insert(customer)
    .values({
      buyerUid: input.buyerUid,
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      address: input.address,
      city: input.city,
    })
    .onConflictDoNothing()
    .returning({ id: customer.id });
  if (created) return created.id;
  return (await db.query.customer.findFirst({
    where: eq(customer.buyerUid, input.buyerUid!),
    columns: { id: true },
  }))!.id;
}

/**
 * Places an order from the caller's cart.
 *  - paystack: creates a PENDING order, then returns Paystack's hosted
 *    payment URL. Stock is committed only once payment is verified.
 *  - pay_on_pickup: creates the order and reserves (commits) stock now so
 *    it's held for collection; staff mark it paid at the counter.
 */
export async function placeOrder(
  input: CheckoutInput,
): Promise<ActionResult<{ redirectUrl: string }>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const d = parsed.data;

  const identity = await getCartIdentity();
  const view = await getCartView(identity);
  if (view.lines.length === 0) return fail("Your cart is empty.");
  if (view.hasIssues) {
    return fail("Some items in your cart are no longer available in that quantity. Please review your cart.");
  }

  const quote = await quoteCart(view, { fulfilment: d.fulfilment, couponCode: d.couponCode || null });
  if (d.fulfilment === "delivery" && !quote.deliveryEnabled) return fail("Delivery is currently unavailable.");
  if (d.fulfilment === "pickup" && !quote.pickupEnabled) return fail("Store pickup is currently unavailable.");
  if (d.couponCode && quote.couponError) return fail(quote.couponError);
  if (quote.totalAmount <= 0 && d.paymentMethod === "paystack") {
    return fail("Order total must be greater than zero.");
  }

  const user = await getCurrentUser();
  const buyerUid = identity.kind === "buyer" ? identity.buyerUid : null;
  const customerId = await findOrCreateCustomer({
    name: d.name,
    email: d.email,
    phone: d.phone,
    address: d.fulfilment === "delivery" ? d.address || null : null,
    city: d.fulfilment === "delivery" ? d.city || null : null,
    buyerUid,
  });

  const payNow = d.paymentMethod === "paystack";
  const reference = payNow ? `MDPAY-${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}` : null;

  let created: { id: string; saleNumber: string; accessToken: string };
  try {
    created = await db.transaction(async (tx) => {
      const order = await insertSale(tx, {
        channel: "online",
        fulfilment: d.fulfilment,
        status: "pending",
        customerId,
        buyerUid,
        customerName: d.name,
        customerEmail: d.email.toLowerCase(),
        customerPhone: d.phone,
        deliveryAddress: d.fulfilment === "delivery" ? d.address || null : null,
        deliveryCity: d.fulfilment === "delivery" ? d.city || null : null,
        paystackReference: reference,
        couponId: quote.couponId,
        subtotal: quote.subtotal,
        discountAmount: quote.discountAmount,
        deliveryFee: quote.deliveryFee,
        taxAmount: quote.taxAmount,
        totalAmount: quote.totalAmount,
        paymentStatus: "pending",
        paymentMethod: payNow ? "paystack" : null,
        notes: d.notes || null,
        items: view.lines.map((l) => ({
          productId: l.productId,
          productName: l.name,
          productCode: l.partNumber,
          productSku: l.sku,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        commitStock: !payNow,
        actorUid: user?.authUid ?? null,
      });

      if (!payNow) {
        if (quote.couponId) await redeemCoupon(tx, quote.couponId);
        if (view.id) await tx.delete(cartItem).where(eq(cartItem.cartId, view.id));
      }
      return order;
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return fail("Some items just sold out. Please review your cart.");
    }
    console.error("[placeOrder]", err);
    return fail("We couldn't place your order. Please try again.");
  }

  const orderUrl = `/shop/order/${created.saleNumber}?t=${created.accessToken}`;

  if (!payNow) {
    await sendOrderNotifications(created.id);
    revalidateOrders();
    revalidateCatalog();
    return ok({ redirectUrl: orderUrl });
  }

  const appUrl = siteConfig.url.replace(/\/$/, "");
  const init = await initializeTransaction({
    email: d.email,
    amount: quote.totalAmount,
    currency: quote.currency,
    reference: reference!,
    callbackUrl: `${appUrl}/shop/order/processing`,
    metadata: { saleId: created.id, saleNumber: created.saleNumber },
  });
  if (!init.ok) {
    await db.update(sale).set({ status: "cancelled", paymentStatus: "cancelled" }).where(eq(sale.id, created.id));
    console.error("[placeOrder] Paystack init failed:", init.error);
    return fail("Payment couldn't be started. Please try again in a moment.");
  }

  // Keep the cart until payment succeeds (so an abandoned payment loses nothing);
  // just bump it so abandoned-cart jobs can see recent activity.
  if (view.id) await db.update(cart).set({ updatedAt: new Date() }).where(eq(cart.id, view.id));

  revalidateOrders();
  return ok({ redirectUrl: init.data.authorization_url });
}
