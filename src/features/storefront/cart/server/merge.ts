// Server-only (not a "use server" module).
import { eq } from "drizzle-orm";

import { db } from "@/shared/db";
import { cart, cartItem } from "@/shared/db/schema";

/**
 * Called right after sign-in: moves a guest cart's items into the buyer's
 * cart (summing quantities), then deletes the guest cart. If the buyer has
 * no cart yet, the guest cart is simply re-keyed to them.
 */
export async function mergeGuestCartIntoBuyer(guestId: string, buyerUid: string): Promise<void> {
  await db.transaction(async (tx) => {
    const guestCart = await tx.query.cart.findFirst({
      where: eq(cart.guestId, guestId),
      with: { items: true },
    });
    if (!guestCart) return;

    const buyerCart = await tx.query.cart.findFirst({
      where: eq(cart.buyerUid, buyerUid),
      with: { items: true },
    });

    if (!buyerCart) {
      await tx
        .update(cart)
        .set({ buyerUid, guestId: null })
        .where(eq(cart.id, guestCart.id));
      return;
    }

    const existing = new Map(buyerCart.items.map((i) => [i.productId, i]));
    for (const item of guestCart.items) {
      const match = existing.get(item.productId);
      if (match) {
        await tx
          .update(cartItem)
          .set({ quantity: match.quantity + item.quantity })
          .where(eq(cartItem.id, match.id));
      } else {
        await tx
          .insert(cartItem)
          .values({ cartId: buyerCart.id, productId: item.productId, quantity: item.quantity });
      }
    }
    await tx.delete(cart).where(eq(cart.id, guestCart.id));
  });
}
