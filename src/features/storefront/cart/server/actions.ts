"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/shared/db";
import { cart, cartItem, product } from "@/shared/db/schema";
import { type ActionResult, fail, ok } from "@/shared/lib/action-result";
import { getCartIdentity, getOrCreateCartIdentity } from "./identity";
import { cartWhere, getCartView, type CartView } from "./queries";

export type { ActionResult };

const MAX_LINE_QTY = 99;

function revalidateCart() {
  revalidatePath("/shop", "layout");
}

async function ensureCart(): Promise<string> {
  const identity = await getOrCreateCartIdentity();
  const where = cartWhere(identity)!;
  const existing = await db.query.cart.findFirst({ where, columns: { id: true } });
  if (existing) return existing.id;

  const [created] = await db
    .insert(cart)
    .values(
      identity.kind === "buyer"
        ? { buyerUid: identity.buyerUid }
        : { guestId: identity.guestId },
    )
    .onConflictDoNothing()
    .returning({ id: cart.id });
  if (created) return created.id;
  // Lost a race with a parallel request — read the winner.
  return (await db.query.cart.findFirst({ where, columns: { id: true } }))!.id;
}

/** Returns the cart line if it belongs to the caller's cart. */
async function ownedLine(cartItemId: string) {
  const identity = await getCartIdentity();
  const where = cartWhere(identity);
  if (!where) return null;
  const owner = await db.query.cart.findFirst({ where, columns: { id: true } });
  if (!owner) return null;
  return db.query.cartItem.findFirst({
    where: and(eq(cartItem.id, cartItemId), eq(cartItem.cartId, owner.id)),
    with: { product: { columns: { quantity: true, name: true } } },
  });
}

export async function addToCart(productId: string, quantity = 1): Promise<ActionResult<CartView>> {
  if (typeof productId !== "string" || !Number.isInteger(quantity) || quantity < 1) {
    return fail("Invalid quantity.");
  }

  const p = await db.query.product.findFirst({
    where: eq(product.id, productId),
    columns: { id: true, name: true, quantity: true, isActive: true, deletedAt: true },
  });
  if (!p || !p.isActive || p.deletedAt) return fail("This product is no longer available.");
  if (p.quantity < 1) return fail(`"${p.name}" is out of stock.`);

  const cartId = await ensureCart();
  const line = await db.query.cartItem.findFirst({
    where: and(eq(cartItem.cartId, cartId), eq(cartItem.productId, productId)),
  });

  const next = Math.min((line?.quantity ?? 0) + quantity, MAX_LINE_QTY);
  if (next > p.quantity) {
    return fail(`Only ${p.quantity} of "${p.name}" available.`);
  }

  if (line) {
    await db.update(cartItem).set({ quantity: next }).where(eq(cartItem.id, line.id));
  } else {
    await db.insert(cartItem).values({ cartId, productId, quantity: next });
  }
  await db.update(cart).set({ updatedAt: new Date() }).where(eq(cart.id, cartId));

  revalidateCart();
  return ok(await getCartView(await getCartIdentity()));
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number,
): Promise<ActionResult<CartView>> {
  if (!Number.isInteger(quantity)) return fail("Invalid quantity.");
  const line = await ownedLine(cartItemId);
  if (!line) return fail("Item not found in your cart.");

  if (quantity < 1) {
    await db.delete(cartItem).where(eq(cartItem.id, cartItemId));
  } else {
    if (quantity > line.product.quantity) {
      return fail(`Only ${line.product.quantity} of "${line.product.name}" available.`);
    }
    await db
      .update(cartItem)
      .set({ quantity: Math.min(quantity, MAX_LINE_QTY) })
      .where(eq(cartItem.id, cartItemId));
  }

  revalidateCart();
  return ok(await getCartView(await getCartIdentity()));
}

export async function removeCartItem(cartItemId: string): Promise<ActionResult<CartView>> {
  const line = await ownedLine(cartItemId);
  if (!line) return fail("Item not found in your cart.");
  await db.delete(cartItem).where(eq(cartItem.id, cartItemId));
  revalidateCart();
  return ok(await getCartView(await getCartIdentity()));
}

/** For client components (cart drawer) that need a fresh snapshot. */
export async function fetchCart(): Promise<CartView> {
  return getCartView(await getCartIdentity());
}
