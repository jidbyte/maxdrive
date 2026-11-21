"use server";

import { and, eq, inArray, ne } from "drizzle-orm";

import { db, type DbOrTx } from "@/shared/db";
import {
  product,
  category,
  image,
  productCategory,
  productFitment,
  auditLog,
} from "@/shared/db/schema";
import { requireCan } from "@/shared/authz/can";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { revalidateCatalog } from "@/shared/lib/revalidate";
import { slugify, uniqueSlug } from "@/shared/lib/slug";
import { applyStockChange } from "@/features/admin/inventory/server/stock";
import {
  adjustStockSchema,
  createProductSchema,
  type AdjustStockInput,
  type CreateProductInput,
} from "./schema";

export type { ActionResult };

async function getOrCreateCategoryIds(tx: DbOrTx, names: string[]): Promise<string[]> {
  const wanted = new Map<string, string>();
  for (const raw of names) {
    const name = raw.trim();
    const slug = slugify(name);
    if (slug && !wanted.has(slug)) wanted.set(slug, name);
  }
  if (wanted.size === 0) return [];

  const slugs = [...wanted.keys()];
  const existing = await tx.query.category.findMany({
    where: inArray(category.slug, slugs),
    columns: { id: true, slug: true },
  });
  const have = new Set(existing.map((c) => c.slug));
  const toCreate = slugs.filter((s) => !have.has(s));

  const created = toCreate.length
    ? await tx
        .insert(category)
        .values(toCreate.map((slug) => ({ slug, name: wanted.get(slug)! })))
        .onConflictDoNothing()
        .returning({ id: category.id })
    : [];

  return [...existing.map((c) => c.id), ...created.map((c) => c.id)];
}

function normalise(data: ReturnType<typeof createProductSchema.parse>) {
  return {
    name: data.name,
    sku: data.sku,
    partNumber: data.partNumber || null,
    oemNumbers: Array.from(new Set(data.oemNumbers.filter(Boolean))),
    brand: data.brand || null,
    model: data.model || null,
    description: data.description || null,
    condition: data.condition,
    warrantyMonths: data.warrantyMonths ?? null,
    sellingPrice: data.sellingPrice,
    compareAtPrice: data.compareAtPrice ?? null,
    costPrice: data.costPrice,
    restockLevel: data.restockLevel,
    isActive: data.isActive,
    isFeatured: data.isFeatured,
    isUniversal: data.isUniversal,
  };
}

async function replaceRelations(
  tx: DbOrTx,
  productId: string,
  data: ReturnType<typeof createProductSchema.parse>,
) {
  const categoryIds = await getOrCreateCategoryIds(tx, data.categories);

  await tx.delete(image).where(eq(image.productId, productId));
  if (data.images.length > 0) {
    // Exactly one primary image.
    const primaryIndex = Math.max(0, data.images.findIndex((i) => i.isPrimary));
    await tx.insert(image).values(
      data.images.map((img, i) => ({
        productId,
        url: img.url,
        fileKey: img.fileKey,
        isPrimary: i === primaryIndex,
        alt: data.name,
      })),
    );
  }

  await tx.delete(productCategory).where(eq(productCategory.productId, productId));
  if (categoryIds.length > 0) {
    await tx
      .insert(productCategory)
      .values(categoryIds.map((categoryId) => ({ productId, categoryId })))
      .onConflictDoNothing();
  }

  await tx.delete(productFitment).where(eq(productFitment.productId, productId));
  if (data.fitments.length > 0) {
    await tx.insert(productFitment).values(
      data.fitments.map((f) => ({
        productId,
        makeId: f.makeId,
        modelId: f.modelId || null,
        yearFrom: f.yearFrom ?? null,
        yearTo: f.yearTo ?? null,
        engine: f.engine || null,
        notes: f.notes || null,
      })),
    );
  }
}

export async function createProduct(
  input: CreateProductInput,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCan("products.manage");
  if (!auth.ok) return fail(auth.error);

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const data = parsed.data;

  const skuTaken = await db.query.product.findFirst({
    where: eq(product.sku, data.sku),
    columns: { id: true },
  });
  if (skuTaken) return fail("That SKU is already in use.");

  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(product)
      .values({ ...normalise(data), slug: uniqueSlug(data.name), quantity: 0 })
      .returning({ id: product.id });

    await replaceRelations(tx, created.id, data);

    if (data.quantity > 0) {
      await applyStockChange(tx, {
        productId: created.id,
        delta: data.quantity,
        reason: "initial",
        actorUid: auth.uid,
      });
    }

    await tx.insert(auditLog).values({
      actorUid: auth.uid,
      action: "product.create",
      entityType: "product",
      entityId: created.id,
      metadata: { name: data.name, sku: data.sku },
    });
    return created.id;
  });

  revalidateCatalog();
  return ok({ id });
}

export async function updateProduct(
  productId: string,
  input: CreateProductInput,
): Promise<ActionResult> {
  const auth = await requireCan("products.manage");
  if (!auth.ok) return fail(auth.error);

  const existing = await db.query.product.findFirst({ where: eq(product.id, productId) });
  if (!existing || existing.deletedAt) return fail("Product not found.");

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const data = parsed.data;

  const skuOwner = await db.query.product.findFirst({
    where: and(eq(product.sku, data.sku), ne(product.id, productId)),
    columns: { id: true },
  });
  if (skuOwner) return fail("That SKU is already in use.");

  const quantityDelta = data.quantity - existing.quantity;
  // Stock changes from the edit form need inventory permission too.
  if (quantityDelta !== 0 && !auth.staff.permissions.has("inventory.adjust")) {
    return fail("You don't have permission to change stock levels.");
  }

  await db.transaction(async (tx) => {
    await tx.update(product).set(normalise(data)).where(eq(product.id, productId));
    await replaceRelations(tx, productId, data);

    if (quantityDelta !== 0) {
      await applyStockChange(tx, {
        productId,
        delta: quantityDelta,
        reason: "adjustment",
        note: "Edited on product form",
        actorUid: auth.uid,
      });
    }

    const priceChanged =
      existing.sellingPrice !== data.sellingPrice || existing.costPrice !== data.costPrice;
    await tx.insert(auditLog).values({
      actorUid: auth.uid,
      action: "product.update",
      entityType: "product",
      entityId: productId,
      metadata: priceChanged
        ? {
            sellingPrice: [existing.sellingPrice, data.sellingPrice],
            costPrice: [existing.costPrice, data.costPrice],
          }
        : null,
    });
  });

  revalidateCatalog();
  return ok();
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  const auth = await requireCan("products.manage");
  if (!auth.ok) return fail(auth.error);

  const existing = await db.query.product.findFirst({
    where: eq(product.id, productId),
    columns: { id: true, name: true },
  });
  if (!existing) return fail("Product not found.");

  await db
    .update(product)
    .set({ deletedAt: new Date(), isActive: false })
    .where(eq(product.id, productId));
  await db.insert(auditLog).values({
    actorUid: auth.uid,
    action: "product.delete",
    entityType: "product",
    entityId: productId,
    metadata: { name: existing.name },
  });

  revalidateCatalog();
  return ok();
}

export async function adjustStock(input: AdjustStockInput): Promise<ActionResult> {
  const auth = await requireCan("inventory.adjust");
  if (!auth.ok) return fail(auth.error);

  const parsed = adjustStockSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const { productId, delta, reason, note } = parsed.data;

  try {
    await db.transaction((tx) =>
      applyStockChange(tx, { productId, delta, reason, note, actorUid: auth.uid }),
    );
  } catch {
    return fail("Stock can't go below zero.");
  }

  revalidateCatalog();
  return ok();
}

export async function listCategoryOptions(): Promise<{ id: string; name: string }[]> {
  const auth = await requireCan("products.read");
  if (!auth.ok) return [];
  return db.query.category.findMany({
    columns: { id: true, name: true },
    orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.name)],
  });
}
