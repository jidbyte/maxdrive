import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

import { timestamps } from "./store";
import { sale } from "./sales";
import { customerVehicle } from "./vehicles";

/**
 * A customer record — created by staff, by storefront checkout (guest or
 * signed-in), or by a service booking. buyerUid links it to a Firebase
 * account when the customer has one (one customer row per account).
 */
export const customer = pgTable(
  "customer",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    buyerUid: text("buyer_uid").unique(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    customerType: text("customer_type", { enum: ["individual", "business"] })
      .notNull()
      .default("individual"),
    notes: text("notes"),
    deletedAt: timestamp("deleted_at"),
    ...timestamps,
  },
  (table) => [
    index("customer_name_idx").on(table.name),
    index("customer_email_idx").on(table.email),
    index("customer_phone_idx").on(table.phone),
  ],
);

export const customerRelations = relations(customer, ({ many }) => ({
  sales: many(sale),
  vehicles: many(customerVehicle),
}));
