import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";

import { timestamps } from "./store";
import { product } from "./products";
import { saleItem } from "./sales";

// Reviews require a verified purchase — saleItemId points at the sale_item
// that proved eligibility. Only signed-in buyers can review (buyerUid is the
// author identity). One review per (product, buyer): reviewing again edits
// the existing review. Staff can hide a review (reviews.moderate).
export const review = pgTable(
  "review",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    saleItemId: text("sale_item_id")
      .notNull()
      .references(() => saleItem.id, { onDelete: "cascade" }),
    buyerUid: text("buyer_uid").notNull(),
    buyerName: text("buyer_name").notNull(),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    status: text("status", { enum: ["published", "hidden"] })
      .notNull()
      .default("published"),
    deletedAt: timestamp("deleted_at"),
    ...timestamps,
  },
  (table) => [
    index("review_productId_idx").on(table.productId),
    unique("review_product_buyer_unique").on(table.productId, table.buyerUid),
  ],
);

export const reviewRelations = relations(review, ({ one }) => ({
  product: one(product, {
    fields: [review.productId],
    references: [product.id],
  }),
  saleItem: one(saleItem, {
    fields: [review.saleItemId],
    references: [saleItem.id],
  }),
}));
