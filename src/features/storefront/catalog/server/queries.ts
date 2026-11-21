import { cache } from "react";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  ne,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/shared/db";
import {
  category,
  image,
  product,
  productCategory,
  productFitment,
  sale,
  saleItem,
  vehicleMake,
  vehicleModel,
} from "@/shared/db/schema";

export type VehicleSelection = {
  makeId: string;
  modelId?: string | null;
  year?: number | null;
  label: string;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  partNumber: string | null;
  sellingPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  condition: "new" | "used" | "refurbished";
  imageUrl: string | null;
  /** null = no vehicle selected; true/false = fits the selected vehicle. */
  fits: boolean | null;
};

export type CatalogSort = "relevance" | "newest" | "price-asc" | "price-desc" | "name";

export type CatalogFilters = {
  q?: string;
  category?: string; // category slug
  brand?: string;
  vehicle?: VehicleSelection | null;
  /** Only show parts that fit the selected vehicle. */
  fitsOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
};

const active = and(eq(product.isActive, true), isNull(product.deletedAt))!;

/** SQL predicate: product fits the vehicle (or is universal). */
function fitsVehicle(v: VehicleSelection): SQL {
  const conds: SQL[] = [
    sql`${productFitment.productId} = ${product.id}`,
    eq(productFitment.makeId, v.makeId),
  ];
  if (v.modelId) {
    conds.push(or(isNull(productFitment.modelId), eq(productFitment.modelId, v.modelId))!);
  }
  if (v.year) {
    conds.push(or(isNull(productFitment.yearFrom), lte(productFitment.yearFrom, v.year))!);
    conds.push(or(isNull(productFitment.yearTo), gte(productFitment.yearTo, v.year))!);
  }
  return sql`(${product.isUniversal} OR EXISTS (SELECT 1 FROM ${productFitment} WHERE ${and(...conds)}))`;
}

function searchPredicate(q: string): SQL {
  const term = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
  return or(
    ilike(product.name, term),
    ilike(product.sku, term),
    ilike(product.partNumber, term),
    ilike(product.brand, term),
    ilike(product.model, term),
    sql`array_to_string(${product.oemNumbers}, ' ') ILIKE ${term}`,
  )!;
}

async function primaryImages(productIds: string[]) {
  if (productIds.length === 0) return new Map<string, string>();
  const rows = await db
    .select({ productId: image.productId, url: image.url, isPrimary: image.isPrimary })
    .from(image)
    .where(inArray(image.productId, productIds));
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.isPrimary || !map.has(r.productId)) map.set(r.productId, r.url);
  }
  return map;
}

async function toCatalogProducts(
  rows: Array<typeof product.$inferSelect>,
  vehicle?: VehicleSelection | null,
): Promise<CatalogProduct[]> {
  const ids = rows.map((r) => r.id);
  const images = await primaryImages(ids);

  let fitting: Set<string> | null = null;
  if (vehicle && ids.length) {
    const fitRows = await db
      .select({ id: product.id })
      .from(product)
      .where(and(inArray(product.id, ids), fitsVehicle(vehicle)));
    fitting = new Set(fitRows.map((r) => r.id));
  }

  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    partNumber: p.partNumber,
    sellingPrice: p.sellingPrice,
    compareAtPrice: p.compareAtPrice,
    quantity: p.quantity,
    condition: p.condition,
    imageUrl: images.get(p.id) ?? null,
    fits: fitting ? fitting.has(p.id) : null,
  }));
}

export async function searchCatalog(filters: CatalogFilters) {
  const pageSize = Math.min(Math.max(filters.pageSize ?? 24, 1), 60);
  const page = Math.max(filters.page ?? 1, 1);

  const where: SQL[] = [active];
  const q = filters.q?.trim().slice(0, 80);
  if (q) where.push(searchPredicate(q));
  if (filters.brand) where.push(ilike(product.brand, filters.brand));
  if (filters.minPrice !== undefined) where.push(gte(product.sellingPrice, filters.minPrice));
  if (filters.maxPrice !== undefined) where.push(lte(product.sellingPrice, filters.maxPrice));
  if (filters.inStock) where.push(sql`${product.quantity} > 0`);
  if (filters.vehicle && filters.fitsOnly) where.push(fitsVehicle(filters.vehicle));
  if (filters.category) {
    where.push(
      sql`EXISTS (SELECT 1 FROM ${productCategory} JOIN ${category} ON ${category.id} = ${productCategory.categoryId} WHERE ${productCategory.productId} = ${product.id} AND ${category.slug} = ${filters.category})`,
    );
  }
  const whereClause = and(...where);

  const sort = filters.sort ?? (q ? "relevance" : "newest");
  const orderBy =
    sort === "price-asc"
      ? [asc(product.sellingPrice)]
      : sort === "price-desc"
        ? [desc(product.sellingPrice)]
        : sort === "name"
          ? [asc(product.name)]
          : sort === "relevance" && q
            ? [
                // exact part/sku hits first, then in-stock, then newest
                desc(sql`(${product.partNumber} ILIKE ${q} OR ${product.sku} ILIKE ${q})`),
                desc(sql`${product.quantity} > 0`),
                desc(product.createdAt),
              ]
            : [desc(sql`${product.quantity} > 0`), desc(product.createdAt)];

  const [rows, [{ total }], brandRows] = await Promise.all([
    db
      .select()
      .from(product)
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(product).where(whereClause),
    db
      .select({ brand: product.brand, n: count() })
      .from(product)
      .where(and(active, sql`${product.brand} IS NOT NULL`))
      .groupBy(product.brand)
      .orderBy(asc(product.brand)),
  ]);

  return {
    items: await toCatalogProducts(rows, filters.vehicle),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    brands: brandRows.filter((b) => b.brand).map((b) => ({ name: b.brand!, count: b.n })),
  };
}

export const getProductBySlug = cache(async (slug: string) => {
  return db.query.product.findFirst({
    where: and(eq(product.slug, slug), active),
    with: {
      images: { orderBy: (i, { desc }) => [desc(i.isPrimary), desc(i.createdAt)] },
      productCategories: { with: { category: true } },
      fitments: { with: { make: true, model: true } },
    },
  });
});

export async function productFitsVehicle(productId: string, vehicle: VehicleSelection) {
  const [row] = await db
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.id, productId), fitsVehicle(vehicle)))
    .limit(1);
  return !!row;
}

export async function getRelatedProducts(
  productId: string,
  categoryIds: string[],
  vehicle?: VehicleSelection | null,
  limit = 8,
) {
  if (categoryIds.length === 0) return getLatestProducts(limit, vehicle, [productId]);
  const rows = await db
    .select()
    .from(product)
    .where(
      and(
        active,
        ne(product.id, productId),
        sql`EXISTS (SELECT 1 FROM ${productCategory} WHERE ${productCategory.productId} = ${product.id} AND ${inArray(productCategory.categoryId, categoryIds)})`,
      ),
    )
    .orderBy(desc(sql`${product.quantity} > 0`), desc(product.isFeatured), desc(product.createdAt))
    .limit(limit);
  return toCatalogProducts(rows, vehicle);
}

export async function getFeaturedProducts(limit = 8, vehicle?: VehicleSelection | null) {
  const rows = await db
    .select()
    .from(product)
    .where(and(active, eq(product.isFeatured, true)))
    .orderBy(desc(product.updatedAt))
    .limit(limit);
  return toCatalogProducts(rows, vehicle);
}

export async function getLatestProducts(
  limit = 8,
  vehicle?: VehicleSelection | null,
  excludeIds: string[] = [],
) {
  const rows = await db
    .select()
    .from(product)
    .where(
      excludeIds.length
        ? and(active, notInArray(product.id, excludeIds))
        : active,
    )
    .orderBy(desc(product.createdAt))
    .limit(limit);
  return toCatalogProducts(rows, vehicle);
}

export async function getBestSellers(limit = 8, vehicle?: VehicleSelection | null) {
  const ranked = await db
    .select({ productId: saleItem.productId, qty: sql<number>`sum(${saleItem.quantity})`.as("qty") })
    .from(saleItem)
    .innerJoin(sale, eq(saleItem.saleId, sale.id))
    .where(and(eq(sale.paymentStatus, "paid"), sql`${saleItem.productId} IS NOT NULL`))
    .groupBy(saleItem.productId)
    .orderBy(desc(sql`qty`))
    .limit(limit);
  const ids = ranked.map((r) => r.productId!);
  if (ids.length === 0) return getLatestProducts(limit, vehicle);

  const rows = await db.select().from(product).where(and(active, inArray(product.id, ids)));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = ids.map((id) => byId.get(id)).filter((r) => r !== undefined);
  return toCatalogProducts(ordered, vehicle);
}

export const listCategoriesWithCounts = cache(async () => {
  return db
    .select({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      productCount: sql<number>`count(${product.id})::int`,
    })
    .from(category)
    .leftJoin(productCategory, eq(productCategory.categoryId, category.id))
    .leftJoin(product, and(eq(product.id, productCategory.productId), active))
    .groupBy(category.id)
    .orderBy(asc(category.sortOrder), asc(category.name));
});

export const getCategoryBySlug = cache(async (slug: string) =>
  db.query.category.findFirst({ where: eq(category.slug, slug) }),
);

export const listVehicleMakes = cache(async () =>
  db.query.vehicleMake.findMany({
    orderBy: [asc(vehicleMake.name)],
    columns: { id: true, name: true, slug: true },
  }),
);

export async function listModelsForMake(makeId: string) {
  return db.query.vehicleModel.findMany({
    where: eq(vehicleModel.makeId, makeId),
    orderBy: [asc(vehicleModel.name)],
    columns: { id: true, name: true, slug: true },
  });
}

export async function countActiveProducts(): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(product).where(active);
  return n;
}
