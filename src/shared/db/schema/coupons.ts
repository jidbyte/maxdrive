
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { timestamps } from "./store";

export const coupon = pgTable(
  "coupon",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    code: text("code").notNull().unique(),
    discountType: text("discount_type", { enum: ["percentage", "fixed"] })
      .notNull()
      .default("percentage"),
    // percentage: 0-100; fixed: whole-number currency amount
    discountValue: integer("discount_value").notNull(),
    minOrderAmount: integer("min_order_amount").notNull().default(0),
    maxRedemptions: integer("max_redemptions"), // null = unlimited
    redemptionCount: integer("redemption_count").notNull().default(0),
    startsAt: timestamp("starts_at"),
    expiresAt: timestamp("expires_at"),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at"),
    ...timestamps,
  },
  (table) => [index("coupon_isActive_idx").on(table.isActive)],
);

