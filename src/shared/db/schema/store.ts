import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  check,
} from "drizzle-orm/pg-core";

export const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const STORE_SETTINGS_ID = "default";

export type OpeningHours = Array<{
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  /** "08:00" (24h, store-local time) */
  open: string;
  close: string;
  closed: boolean;
}>;

export const DEFAULT_OPENING_HOURS: OpeningHours = [
  { day: 0, open: "10:00", close: "16:00", closed: true },
  { day: 1, open: "08:00", close: "18:00", closed: false },
  { day: 2, open: "08:00", close: "18:00", closed: false },
  { day: 3, open: "08:00", close: "18:00", closed: false },
  { day: 4, open: "08:00", close: "18:00", closed: false },
  { day: 5, open: "08:00", close: "18:00", closed: false },
  { day: 6, open: "09:00", close: "15:00", closed: false },
];

/**
 * MAXDRIVE is single-tenant: there is exactly ONE row in this table
 * (id = 'default', enforced by a CHECK constraint). It replaces AREA's
 * per-shop `organization` table and holds every business setting staff can
 * edit at runtime. Read it with getStoreSettings() (cached), never by
 * querying the table ad hoc.
 *
 * Money columns follow the rest of the schema: whole currency units.
 */
export const storeSettings = pgTable(
  "store_settings",
  {
    id: text("id").primaryKey().default(STORE_SETTINGS_ID),
    name: text("name").notNull().default("MAXDRIVE"),
    legalName: text("legal_name"),
    tagline: text("tagline"),
    description: text("description"),
    logoUrl: text("logo_url"),
    email: text("email"),
    phone: text("phone"),
    whatsappPhone: text("whatsapp_phone"),
    address: text("address"),
    city: text("city"),
    country: text("country").notNull().default("GH"),
    // ISO 4217 code — see shared/config/currencies.ts
    currency: text("currency").notNull().default("GHS"),

    // Tax: basis points (1250 = 12.5%). taxInclusive = listed prices already include tax.
    taxRateBps: integer("tax_rate_bps").notNull().default(0),
    taxInclusive: boolean("tax_inclusive").notNull().default(true),

    // Fulfilment
    deliveryEnabled: boolean("delivery_enabled").notNull().default(true),
    pickupEnabled: boolean("pickup_enabled").notNull().default(true),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    freeDeliveryThreshold: integer("free_delivery_threshold"),

    // Workshop / bookings
    /** IANA zone the workshop's opening hours are expressed in. */
    timezone: text("timezone").notNull().default("Africa/Accra"),
    /** How far ahead customers can book online. */
    bookingWindowDays: integer("booking_window_days").notNull().default(30),
    /** Minimum notice for online bookings, in minutes. */
    bookingLeadMinutes: integer("booking_lead_minutes").notNull().default(120),
    onlineBookingEnabled: boolean("online_booking_enabled").notNull().default(true),
    openingHours: jsonb("opening_hours")
      .$type<OpeningHours>()
      .notNull()
      .default(DEFAULT_OPENING_HOURS),
    bookingSlotMinutes: integer("booking_slot_minutes").notNull().default(30),
    workshopBays: integer("workshop_bays").notNull().default(2),

    // Inventory
    lowStockThreshold: integer("low_stock_threshold").notNull().default(10),

    // Notifications (Settings → Notifications)
    emailNotificationsEnabled: boolean("email_notifications_enabled").notNull().default(true),
    whatsappNotificationsEnabled: boolean("whatsapp_notifications_enabled").notNull().default(true),
    orderAlertEmail: text("order_alert_email"),

    socials: jsonb("socials").$type<Record<string, string>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [check("store_settings_singleton", sql`${table.id} = 'default'`)],
);

export type StoreSettings = typeof storeSettings.$inferSelect;
