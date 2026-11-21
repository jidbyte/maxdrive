import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { timestamps } from "./store";
import { customer } from "./customers";
import { customerVehicle } from "./vehicles";
import { product } from "./products";
import { sale } from "./sales";
import { appUser } from "./users";

/** Workshop service catalog (oil change, diagnostics, AC regas, …). */
export const service = pgTable(
  "service",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    category: text("category"),
    summary: text("summary"),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    /** Whole currency units. "from" price when priceIsFrom = true. */
    basePrice: integer("base_price").notNull().default(0),
    priceIsFrom: boolean("price_is_from").notNull().default(false),
    /** lucide icon name for the storefront card. */
    icon: text("icon"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: timestamp("deleted_at"),
    ...timestamps,
  },
  (table) => [index("service_isActive_idx").on(table.isActive)],
);

export const BOOKING_STATUSES = [
  "requested",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;

/** A customer's appointment at the workshop. */
export const serviceBooking = pgTable(
  "service_booking",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    bookingNumber: text("booking_number").notNull().unique(),
    customerId: text("customer_id").references(() => customer.id, {
      onDelete: "set null",
    }),
    buyerUid: text("buyer_uid"),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone").notNull(),
    vehicleId: text("vehicle_id").references(() => customerVehicle.id, {
      onDelete: "set null",
    }),
    /** Snapshot, e.g. "2017 Toyota Corolla 1.8 · GR-1234-22". */
    vehicleDescription: text("vehicle_description").notNull(),
    scheduledAt: timestamp("scheduled_at").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    status: text("status", { enum: BOOKING_STATUSES })
      .notNull()
      .default("requested"),
    source: text("source", { enum: ["online", "phone", "walk_in"] })
      .notNull()
      .default("online"),
    estimatedTotal: integer("estimated_total").notNull().default(0),
    customerNotes: text("customer_notes"),
    internalNotes: text("internal_notes"),
    accessToken: text("access_token")
      .notNull()
      .$defaultFn(() => crypto.randomUUID().replace(/-/g, "")),
    reminderSentAt: timestamp("reminder_sent_at"),
    ...timestamps,
  },
  (table) => [
    index("serviceBooking_scheduledAt_idx").on(table.scheduledAt),
    index("serviceBooking_status_idx").on(table.status),
    index("serviceBooking_customerId_idx").on(table.customerId),
    index("serviceBooking_buyerUid_idx").on(table.buyerUid),
  ],
);

export const serviceBookingItem = pgTable(
  "service_booking_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    bookingId: text("booking_id")
      .notNull()
      .references(() => serviceBooking.id, { onDelete: "cascade" }),
    serviceId: text("service_id").references(() => service.id, {
      onDelete: "set null",
    }),
    serviceName: text("service_name").notNull(),
    price: integer("price").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
  },
  (table) => [index("serviceBookingItem_bookingId_idx").on(table.bookingId)],
);

export const WORK_ORDER_STATUSES = [
  "open",
  "in_progress",
  "awaiting_parts",
  "completed",
  "invoiced",
  "cancelled",
] as const;

/** Job card: the actual work done on a vehicle (labour + parts). */
export const workOrder = pgTable(
  "work_order",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workOrderNumber: text("work_order_number").notNull().unique(),
    bookingId: text("booking_id").references(() => serviceBooking.id, {
      onDelete: "set null",
    }),
    customerId: text("customer_id").references(() => customer.id, {
      onDelete: "set null",
    }),
    customerName: text("customer_name").notNull(),
    vehicleId: text("vehicle_id").references(() => customerVehicle.id, {
      onDelete: "set null",
    }),
    vehicleDescription: text("vehicle_description").notNull(),
    mileageIn: integer("mileage_in"),
    technicianUserId: text("technician_user_id").references(() => appUser.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: WORK_ORDER_STATUSES })
      .notNull()
      .default("open"),
    complaint: text("complaint"),
    diagnosis: text("diagnosis"),
    labourTotal: integer("labour_total").notNull().default(0),
    partsTotal: integer("parts_total").notNull().default(0),
    totalAmount: integer("total_amount").notNull().default(0),
    /** The sale created when the work order is billed. */
    saleId: text("sale_id").references(() => sale.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    ...timestamps,
  },
  (table) => [
    index("workOrder_status_idx").on(table.status),
    index("workOrder_technician_idx").on(table.technicianUserId),
    index("workOrder_customerId_idx").on(table.customerId),
  ],
);

export const workOrderItem = pgTable(
  "work_order_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workOrderId: text("work_order_id")
      .notNull()
      .references(() => workOrder.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["labour", "part"] }).notNull(),
    /** Set for parts — consuming a part decrements stock via inventory_log. */
    productId: text("product_id").references(() => product.id, {
      onDelete: "set null",
    }),
    serviceId: text("service_id").references(() => service.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: integer("unit_price").notNull(),
    subtotal: integer("subtotal").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("workOrderItem_workOrderId_idx").on(table.workOrderId)],
);

export const serviceRelations = relations(service, () => ({}));

export const serviceBookingRelations = relations(serviceBooking, ({ one, many }) => ({
  customer: one(customer, {
    fields: [serviceBooking.customerId],
    references: [customer.id],
  }),
  vehicle: one(customerVehicle, {
    fields: [serviceBooking.vehicleId],
    references: [customerVehicle.id],
  }),
  items: many(serviceBookingItem),
}));

export const serviceBookingItemRelations = relations(serviceBookingItem, ({ one }) => ({
  booking: one(serviceBooking, {
    fields: [serviceBookingItem.bookingId],
    references: [serviceBooking.id],
  }),
  service: one(service, {
    fields: [serviceBookingItem.serviceId],
    references: [service.id],
  }),
}));

export const workOrderRelations = relations(workOrder, ({ one, many }) => ({
  booking: one(serviceBooking, {
    fields: [workOrder.bookingId],
    references: [serviceBooking.id],
  }),
  customer: one(customer, {
    fields: [workOrder.customerId],
    references: [customer.id],
  }),
  vehicle: one(customerVehicle, {
    fields: [workOrder.vehicleId],
    references: [customerVehicle.id],
  }),
  technician: one(appUser, {
    fields: [workOrder.technicianUserId],
    references: [appUser.id],
  }),
  sale: one(sale, { fields: [workOrder.saleId], references: [sale.id] }),
  items: many(workOrderItem),
}));

export const workOrderItemRelations = relations(workOrderItem, ({ one }) => ({
  workOrder: one(workOrder, {
    fields: [workOrderItem.workOrderId],
    references: [workOrder.id],
  }),
  product: one(product, {
    fields: [workOrderItem.productId],
    references: [product.id],
  }),
}));
