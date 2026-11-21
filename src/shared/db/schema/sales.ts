import { relations } from "drizzle-orm";
import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

import { timestamps } from "./store";
import { product } from "./products";
import { customer } from "./customers";
import { coupon } from "./coupons";

/**
 * A sale = an order. Created three ways:
 *  - online:   storefront checkout (/shop/checkout) → Paystack
 *  - walk_in:  POS / manual sale in the admin
 *  - workshop: billed from a completed work order
 *
 * Two independent state machines:
 *  - paymentStatus: pending → partial → paid (or overdue / cancelled / refunded)
 *  - status (fulfilment): pending → processing → ready | shipped → completed
 *                         (or cancelled / refunded at any point)
 */
export const SALE_CHANNELS = ["online", "walk_in", "workshop"] as const;
export const FULFILMENT_METHODS = ["delivery", "pickup", "workshop"] as const;
export const SALE_STATUSES = [
  "pending",
  "processing",
  "ready",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
] as const;
export const PAYMENT_STATUSES = [
  "pending",
  "partial",
  "paid",
  "overdue",
  "cancelled",
  "refunded",
] as const;

export const sale = pgTable(
  "sale",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    saleNumber: text("sale_number").notNull().unique(),
    channel: text("channel", { enum: SALE_CHANNELS }).notNull().default("walk_in"),
    fulfilment: text("fulfilment", { enum: FULFILMENT_METHODS })
      .notNull()
      .default("pickup"),
    status: text("status", { enum: SALE_STATUSES }).notNull().default("pending"),
    customerId: text("customer_id").references(() => customer.id, {
      onDelete: "set null",
    }),
    /** Firebase UID of the signed-in buyer (null for guests / walk-ins). */
    buyerUid: text("buyer_uid"),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),
    deliveryAddress: text("delivery_address"),
    deliveryCity: text("delivery_city"),
    saleDate: timestamp("sale_date").notNull(),
    paystackReference: text("paystack_reference").unique(),
    couponId: text("coupon_id").references(() => coupon.id, {
      onDelete: "set null",
    }),
    subtotal: integer("subtotal").notNull().default(0),
    discountAmount: integer("discount_amount").notNull().default(0),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    taxAmount: integer("tax_amount").notNull().default(0),
    totalAmount: integer("total_amount").notNull().default(0),
    balance: integer("balance").notNull().default(0),
    paymentStatus: text("payment_status", { enum: PAYMENT_STATUSES })
      .notNull()
      .default("pending"),
    paymentMethod: text("payment_method", {
      enum: ["paystack", "cash", "mobile_money", "card", "bank_transfer", "other"],
    }),
    paidAt: timestamp("paid_at"),
    /**
     * Unguessable token that lets a guest view their own order at
     * /shop/order/[saleNumber]?t=… without an account.
     */
    accessToken: text("access_token")
      .notNull()
      .$defaultFn(() => crypto.randomUUID().replace(/-/g, "")),
    /** Set once stock has been decremented — guards against double-decrement. */
    stockCommittedAt: timestamp("stock_committed_at"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("sale_customerId_idx").on(table.customerId),
    index("sale_buyerUid_idx").on(table.buyerUid),
    index("sale_saleDate_idx").on(table.saleDate),
    index("sale_status_idx").on(table.status),
    index("sale_paymentStatus_idx").on(table.paymentStatus),
    index("sale_channel_idx").on(table.channel),
  ],
);

export const saleItem = pgTable(
  "sale_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    saleId: text("sale_id")
      .notNull()
      .references(() => sale.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => product.id, {
      onDelete: "set null",
    }),
    productName: text("product_name").notNull(),
    productCode: text("product_code"),
    productSku: text("product_sku").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    /** Cost snapshot at time of sale, for accurate profit reporting. */
    unitCost: integer("unit_cost").notNull().default(0),
    subtotal: integer("subtotal").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("saleItem_saleId_idx").on(table.saleId),
    index("saleItem_productId_idx").on(table.productId),
  ],
);

export const saleRelations = relations(sale, ({ one, many }) => ({
  customer: one(customer, {
    fields: [sale.customerId],
    references: [customer.id],
  }),
  coupon: one(coupon, { fields: [sale.couponId], references: [coupon.id] }),
  items: many(saleItem),
}));

export const saleItemRelations = relations(saleItem, ({ one }) => ({
  sale: one(sale, { fields: [saleItem.saleId], references: [sale.id] }),
  product: one(product, {
    fields: [saleItem.productId],
    references: [product.id],
  }),
}));
