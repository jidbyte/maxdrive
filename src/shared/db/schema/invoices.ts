import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { timestamps } from "./store";
import { customer } from "./customers";
import { sale } from "./sales";

// An invoice is a document generated for a customer — usually from an
// existing sale, but can stand alone (e.g. invoicing before payment is
// collected). Delivery method is tracked so the dashboard can show
// "sent via WhatsApp" / "sent via email" / "PDF only".
export const invoice = pgTable(
  "invoice",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceNumber: text("invoice_number").notNull().unique(),
    saleId: text("sale_id").references(() => sale.id, {
      onDelete: "set null",
    }),
    customerId: text("customer_id").references(() => customer.id, {
      onDelete: "set null",
    }),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),
    issueDate: timestamp("issue_date").notNull(),
    dueDate: timestamp("due_date"),
    subtotal: integer("subtotal").notNull().default(0),
    discountAmount: integer("discount_amount").notNull().default(0),
    totalAmount: integer("total_amount").notNull().default(0),
    status: text("status", {
      enum: ["draft", "sent", "paid", "overdue", "void"],
    })
      .notNull()
      .default("draft"),
    pdfFileKey: text("pdf_file_key"), // Cloudflare R2 object key, once generated
    pdfUrl: text("pdf_url"),
    sentViaEmail: timestamp("sent_via_email"),
    sentViaWhatsapp: timestamp("sent_via_whatsapp"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("invoice_customerId_idx").on(table.customerId),
    index("invoice_status_idx").on(table.status),
  ],
);

export const invoiceItem = pgTable(
  "invoice_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoice.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: integer("unit_price").notNull(),
    subtotal: integer("subtotal").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("invoiceItem_invoiceId_idx").on(table.invoiceId)],
);

export const invoiceRelations = relations(invoice, ({ one, many }) => ({
  customer: one(customer, {
    fields: [invoice.customerId],
    references: [customer.id],
  }),
  sale: one(sale, { fields: [invoice.saleId], references: [sale.id] }),
  items: many(invoiceItem),
}));

export const invoiceItemRelations = relations(invoiceItem, ({ one }) => ({
  invoice: one(invoice, {
    fields: [invoiceItem.invoiceId],
    references: [invoice.id],
  }),
}));
