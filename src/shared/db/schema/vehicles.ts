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
import { customer } from "./customers";

/** Reference data: vehicle makes (Toyota, Honda, …). */
export const vehicleMake = pgTable("vehicle_make", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  ...timestamps,
});

/** Reference data: models per make (Corolla, Civic, …). */
export const vehicleModel = pgTable(
  "vehicle_model",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    makeId: text("make_id")
      .notNull()
      .references(() => vehicleMake.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ...timestamps,
  },
  (table) => [
    index("vehicleModel_makeId_idx").on(table.makeId),
    unique("vehicleModel_make_slug_unique").on(table.makeId, table.slug),
  ],
);

/**
 * Which vehicles a part fits. Deliberately range-based (make + optional
 * model + year range + optional engine) rather than a full variant catalog,
 * so staff can enter fitment quickly and "Fits your 2017 Corolla 1.8" is a
 * simple query. A product with no fitment rows and isUniversal = false is
 * shown without a fit badge; isUniversal = true always "fits".
 */
export const productFitment = pgTable(
  "product_fitment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    makeId: text("make_id")
      .notNull()
      .references(() => vehicleMake.id, { onDelete: "cascade" }),
    /** null = all models of the make */
    modelId: text("model_id").references(() => vehicleModel.id, {
      onDelete: "cascade",
    }),
    yearFrom: integer("year_from"),
    yearTo: integer("year_to"),
    /** Free text, e.g. "1.8L 2ZR-FE". null = all engines. */
    engine: text("engine"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("productFitment_productId_idx").on(table.productId),
    index("productFitment_lookup_idx").on(table.makeId, table.modelId),
  ],
);

/** A customer's saved vehicle ("My garage"). */
export const customerVehicle = pgTable(
  "customer_vehicle",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    makeId: text("make_id").references(() => vehicleMake.id, {
      onDelete: "set null",
    }),
    modelId: text("model_id").references(() => vehicleModel.id, {
      onDelete: "set null",
    }),
    /** Denormalised display text, kept even if reference data changes. */
    makeName: text("make_name").notNull(),
    modelName: text("model_name").notNull(),
    year: integer("year"),
    engine: text("engine"),
    vin: text("vin"),
    plateNumber: text("plate_number"),
    mileage: integer("mileage"),
    nickname: text("nickname"),
    deletedAt: timestamp("deleted_at"),
    ...timestamps,
  },
  (table) => [
    index("customerVehicle_customerId_idx").on(table.customerId),
    index("customerVehicle_plate_idx").on(table.plateNumber),
  ],
);

export const vehicleMakeRelations = relations(vehicleMake, ({ many }) => ({
  models: many(vehicleModel),
}));

export const vehicleModelRelations = relations(vehicleModel, ({ one }) => ({
  make: one(vehicleMake, {
    fields: [vehicleModel.makeId],
    references: [vehicleMake.id],
  }),
}));

export const productFitmentRelations = relations(productFitment, ({ one }) => ({
  product: one(product, {
    fields: [productFitment.productId],
    references: [product.id],
  }),
  make: one(vehicleMake, {
    fields: [productFitment.makeId],
    references: [vehicleMake.id],
  }),
  model: one(vehicleModel, {
    fields: [productFitment.modelId],
    references: [vehicleModel.id],
  }),
}));

export const customerVehicleRelations = relations(customerVehicle, ({ one }) => ({
  customer: one(customer, {
    fields: [customerVehicle.customerId],
    references: [customer.id],
  }),
  make: one(vehicleMake, {
    fields: [customerVehicle.makeId],
    references: [vehicleMake.id],
  }),
  model: one(vehicleModel, {
    fields: [customerVehicle.modelId],
    references: [vehicleModel.id],
  }),
}));
