import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

import { timestamps } from "./store";
import { review } from "./reviews";
import { productFitment } from "./vehicles";

/**
 * Money columns are whole currency units (see shared/utils/currency.ts).
 * `quantity` is the on-hand stock count; every change to it must also write
 * an inventory_log row (see features/admin/inventory).
 */
export const product = pgTable(
  "product",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    /** URL slug for /shop/p/[slug]. Unique. */
    slug: text("slug").notNull().unique(),
    sku: text("sku").notNull().unique(),
    /** Optional internal/barcode code. */
    code: text("code").unique(),
    /** Manufacturer part number, e.g. "0 986 494 524". */
    partNumber: text("part_number"),
    /** OEM / cross-reference numbers this part replaces. */
    oemNumbers: text("oem_numbers").array().notNull().default(sql`'{}'::text[]`),
    brand: text("brand"),
    model: text("model"),
    description: text("description"),
    condition: text("condition", { enum: ["new", "used", "refurbished"] })
      .notNull()
      .default("new"),
    warrantyMonths: integer("warranty_months"),
    weightGrams: integer("weight_grams"),
    quantity: integer("quantity").notNull().default(0),
    restockLevel: integer("restock_level").notNull().default(10),
    costPrice: integer("cost_price").notNull().default(0),
    sellingPrice: integer("selling_price").notNull().default(0),
    /** Optional "was" price shown struck-through on the storefront. */
    compareAtPrice: integer("compare_at_price"),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    /** Universal parts (wipers, oils, bulbs…) skip vehicle fitment filtering. */
    isUniversal: boolean("is_universal").notNull().default(false),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    deletedAt: timestamp("deleted_at"),
    ...timestamps,
  },
  (table) => [
    index("product_name_idx").on(table.name),
    index("product_sku_idx").on(table.sku),
    index("product_partNumber_idx").on(table.partNumber),
    index("product_brand_idx").on(table.brand),
    index("product_isActive_idx").on(table.isActive),
    index("product_isFeatured_idx").on(table.isFeatured),
  ],
);

export const category = pgTable(
  "category",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull().unique(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    /** lucide icon name used on the storefront category chips. */
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [index("category_name_idx").on(table.name)],
);

export const image = pgTable(
  "image",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    url: text("url").notNull(),
    fileKey: text("file_key").notNull(), // Cloudflare R2 object key
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    alt: text("alt"),
    ...timestamps,
  },
  (table) => [
    index("image_productId_idx").on(table.productId),
    index("image_isPrimary_idx").on(table.isPrimary),
  ],
);

// m2m junction between products and categories
export const productCategory = pgTable(
  "product_category",
  {
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.categoryId] }),
    index("productCategory_productId_idx").on(table.productId),
    index("productCategory_categoryId_idx").on(table.categoryId),
  ],
);

/** Audit trail for every stock change. */
export const inventoryLog = pgTable(
  "inventory_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    /** Stock level after this change was applied. */
    balanceAfter: integer("balance_after"),
    reason: text("reason", {
      enum: [
        "sale",
        "sale_cancelled",
        "purchase_received",
        "adjustment",
        "stock_take",
        "damaged",
        "returned",
        "work_order",
        "initial",
      ],
    }).notNull(),
    note: text("note"),
    /** e.g. "sale", "purchase", "work_order" + the row id it came from. */
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    /** Firebase UID of the staff member, or null for system/storefront changes. */
    actorUid: text("actor_uid"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("inventoryLog_productId_idx").on(table.productId),
    index("inventoryLog_createdAt_idx").on(table.createdAt),
  ],
);

/// Relations
export const productRelations = relations(product, ({ many }) => ({
  images: many(image),
  productCategories: many(productCategory),
  inventoryLogs: many(inventoryLog),
  reviews: many(review),
  fitments: many(productFitment),
}));

export const categoryRelations = relations(category, ({ many }) => ({
  productCategories: many(productCategory),
}));

export const imageRelations = relations(image, ({ one }) => ({
  product: one(product, {
    fields: [image.productId],
    references: [product.id],
  }),
}));

export const productCategoryRelations = relations(productCategory, ({ one }) => ({
  product: one(product, {
    fields: [productCategory.productId],
    references: [product.id],
  }),
  category: one(category, {
    fields: [productCategory.categoryId],
    references: [category.id],
  }),
}));

export const inventoryLogRelations = relations(inventoryLog, ({ one }) => ({
  product: one(product, {
    fields: [inventoryLog.productId],
    references: [product.id],
  }),
}));
