import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { timestamps } from "./store";
import { product } from "./products";
import { supplier } from "./suppliers";

export const purchase = pgTable(
  "purchase",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    purchaseNumber: text("purchase_number").notNull().unique(),
    supplierId: text("supplier_id").references(() => supplier.id, {
      onDelete: "set null",
    }),
    supplierName: text("supplier_name").notNull(),
    purchaseDate: timestamp("purchase_date").notNull(),
    eta: timestamp("eta"),
    deliveryDate: timestamp("delivery_date"),
    shippingCost: integer("shipping_cost").notNull().default(0),
    totalAmount: integer("total_amount").notNull().default(0),
    paymentStatus: text("payment_status", {
      enum: ["pending", "partial", "paid", "overdue", "cancelled"],
    })
      .notNull()
      .default("pending"),
    purchaseStatus: text("purchase_status", {
      enum: ["draft", "ordered", "shipped", "received", "cancelled"],
    })
      .notNull()
      .default("draft"),
    discountAmount: integer("discount_amount").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("purchase_supplierId_idx").on(table.supplierId),
    index("purchase_purchaseDate_idx").on(table.purchaseDate),
    index("purchase_paymentStatus_idx").on(table.paymentStatus),
    index("purchase_purchaseStatus_idx").on(table.purchaseStatus),
  ],
);

export const purchaseItem = pgTable(
  "purchase_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    purchaseId: text("purchase_id")
      .notNull()
      .references(() => purchase.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => product.id, {
      onDelete: "set null",
    }),
    productName: text("product_name").notNull(),
    productCode: text("product_code"),
    productSku: text("product_sku").notNull(),
    quantity: integer("quantity").notNull(),
    unitCost: integer("unit_cost").notNull(),
    subtotal: integer("subtotal").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("purchaseItem_purchaseId_idx").on(table.purchaseId),
    index("purchaseItem_productId_idx").on(table.productId),
  ],
);

export const purchaseRelations = relations(purchase, ({ one, many }) => ({
  supplier: one(supplier, {
    fields: [purchase.supplierId],
    references: [supplier.id],
  }),
  items: many(purchaseItem),
}));

export const purchaseItemRelations = relations(purchaseItem, ({ one }) => ({
  purchase: one(purchase, {
    fields: [purchaseItem.purchaseId],
    references: [purchase.id],
  }),
  product: one(product, {
    fields: [purchaseItem.productId],
    references: [product.id],
  }),
}));
