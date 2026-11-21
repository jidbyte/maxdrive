import { relations } from "drizzle-orm";
import { pgTable, text, integer, index, unique } from "drizzle-orm/pg-core";

import { timestamps } from "./store";
import { product } from "./products";

// Server-side cart for signed-in buyers (buyerUid) or guests who have a
// long-lived guest cookie (guestId) — exactly one of the two is set.
// Postgres treats NULLs as distinct, so each unique constraint only bites
// when its column is set: "one cart per buyer" and "one cart per guest".
export const cart = pgTable(
  "cart",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    buyerUid: text("buyer_uid").unique(),
    guestId: text("guest_id").unique(),
    ...timestamps,
  },
  (table) => [index("cart_updatedAt_idx").on(table.updatedAt)],
);

// No price snapshot here on purpose — a cart always reflects the product's
// current price/stock. Price is snapshotted onto sale_item.unitPrice only
// once checkout actually happens.
export const cartItem = pgTable(
  "cart_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    cartId: text("cart_id")
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    index("cartItem_cartId_idx").on(table.cartId),
    unique("cartItem_cart_product_unique").on(table.cartId, table.productId),
  ],
);

export const cartRelations = relations(cart, ({ many }) => ({
  items: many(cartItem),
}));

export const cartItemRelations = relations(cartItem, ({ one }) => ({
  cart: one(cart, { fields: [cartItem.cartId], references: [cart.id] }),
  product: one(product, {
    fields: [cartItem.productId],
    references: [product.id],
  }),
}));
