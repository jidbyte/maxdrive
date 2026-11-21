"use server";

import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/shared/db";
import { auditLog, category } from "@/shared/db/schema";
import { requireCan } from "@/shared/authz/can";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { revalidateCatalog } from "@/shared/lib/revalidate";
import { slugify } from "@/shared/lib/slug";
import { revalidatePath } from "next/cache";
import { CATEGORY_ICONS } from "../category-icons";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  icon: z.enum(CATEGORY_ICONS).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});
export type CategoryInput = z.input<typeof categorySchema>;

function revalidate() {
  revalidatePath("/admin/products/categories");
  revalidateCatalog();
}

export async function createCategory(input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCan("products.manage");
  if (!auth.ok) return fail(auth.error);
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const d = parsed.data;

  const slug = slugify(d.name);
  const taken = await db.query.category.findFirst({ where: eq(category.slug, slug), columns: { id: true } });
  if (taken) return fail("A category with that name already exists.");

  const [created] = await db
    .insert(category)
    .values({ name: d.name, slug, description: d.description || null, icon: d.icon ?? null, sortOrder: d.sortOrder })
    .returning({ id: category.id });
  await db.insert(auditLog).values({ actorUid: auth.uid, action: "category.create", entityType: "category", entityId: created.id, metadata: { name: d.name } });

  revalidate();
  return ok({ id: created.id });
}

export async function updateCategory(id: string, input: CategoryInput): Promise<ActionResult> {
  const auth = await requireCan("products.manage");
  if (!auth.ok) return fail(auth.error);
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const d = parsed.data;

  const slug = slugify(d.name);
  const taken = await db.query.category.findFirst({
    where: and(eq(category.slug, slug), ne(category.id, id)),
    columns: { id: true },
  });
  if (taken) return fail("Another category already uses that name.");

  // Note: renaming changes the public URL /shop/c/[slug].
  const [row] = await db
    .update(category)
    .set({ name: d.name, slug, description: d.description || null, icon: d.icon ?? null, sortOrder: d.sortOrder })
    .where(eq(category.id, id))
    .returning({ id: category.id });
  if (!row) return fail("Category not found.");

  revalidate();
  return ok();
}

/** Deleting removes the tag from products; the products themselves stay. */
export async function deleteCategory(id: string): Promise<ActionResult> {
  const auth = await requireCan("products.manage");
  if (!auth.ok) return fail(auth.error);
  const [row] = await db.delete(category).where(eq(category.id, id)).returning({ name: category.name });
  if (!row) return fail("Category not found.");
  await db.insert(auditLog).values({ actorUid: auth.uid, action: "category.delete", entityType: "category", entityId: id, metadata: { name: row.name } });
  revalidate();
  return ok();
}
