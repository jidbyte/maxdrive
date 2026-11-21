import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

import { timestamps } from "./store";
import { purchase } from "./purchases";

export const supplier = pgTable(
  "supplier",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyName: text("company_name").notNull(),
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    address: text("address"),
    deletedAt: timestamp("deleted_at"),
    ...timestamps,
  },
  (table) => [
    index("supplier_companyName_idx").on(table.companyName),
    index("supplier_email_idx").on(table.email),
  ],
);

export const supplierRelations = relations(supplier, ({ many }) => ({
  purchases: many(purchase),
}));
