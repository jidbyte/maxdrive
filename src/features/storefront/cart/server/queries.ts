import { eq } from "drizzle-orm";

import { db, type DbOrTx } from "@/shared/db";
import { cart } from "@/shared/db/schema";
import type { CartIdentity } from "./identity";

export function cartWhere(identity: CartIdentity) {
  if (identity.kind === "buyer") return eq(cart.buyerUid, identity.buyerUid);
  if (identity.kind === "guest") return eq(cart.guestId, identity.guestId);
  return null;
}

export async function findCart(identity: CartIdentity, tx: DbOrTx = db) {
  const where = cartWhere(identity);
  if (!where) return null;
  return tx.query.cart.findFirst({
    where,
    with: {
      items: {
        orderBy: (i, { asc }) => [asc(i.createdAt)],
        with: { product: { with: { images: true } } },
      },
    },
  });
}

export type CartLine = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  sku: string;
  partNumber: string | null;
  brand: string | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  available: number;
  /** Line can't be purchased as-is (removed, inactive, or not enough stock). */
  issue: "unavailable" | "insufficient_stock" | null;
};

export type CartView = {
  id: string | null;
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  hasIssues: boolean;
};

export const EMPTY_CART: CartView = {
  id: null,
  lines: [],
  itemCount: 0,
  subtotal: 0,
  hasIssues: false,
};

/** Cart with live prices/stock and per-line validation. */
export async function getCartView(identity: CartIdentity): Promise<CartView> {
  const record = await findCart(identity);
  if (!record) return EMPTY_CART;

  const lines: CartLine[] = record.items.map((item) => {
    const p = item.product;
    const unavailable = !p.isActive || !!p.deletedAt;
    return {
      id: item.id,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      partNumber: p.partNumber,
      brand: p.brand,
      imageUrl: p.images.find((i) => i.isPrimary)?.url ?? p.images[0]?.url ?? null,
      unitPrice: p.sellingPrice,
      quantity: item.quantity,
      available: unavailable ? 0 : p.quantity,
      issue: unavailable
        ? "unavailable"
        : item.quantity > p.quantity
          ? "insufficient_stock"
          : null,
    };
  });

  const valid = lines.filter((l) => !l.issue);
  return {
    id: record.id,
    lines,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    subtotal: valid.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    hasIssues: lines.some((l) => l.issue),
  };
}
