"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/shared/db";
import { auditLog, service } from "@/shared/db/schema";
import { requireCan } from "@/shared/authz/can";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { slugify } from "@/shared/lib/slug";
import { CATEGORY_ICONS } from "@/features/admin/products/category-icons";

const serviceSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  category: z.string().trim().max(40).optional().or(z.literal("")),
  summary: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  durationMinutes: z.number().int().min(10, "At least 10 minutes").max(8 * 60),
  basePrice: z.number().int().min(0),
  priceIsFrom: z.boolean(),
  icon: z.enum(CATEGORY_ICONS).nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});
export type ServiceInput = z.infer<typeof serviceSchema>;

function revalidate() {
  revalidatePath("/admin/services");
  revalidatePath("/services", "layout");
  revalidatePath("/");
}

function values(d: ServiceInput) {
  return {
    name: d.name,
    slug: slugify(d.name),
    category: d.category || null,
    summary: d.summary || null,
    description: d.description || null,
    durationMinutes: d.durationMinutes,
    basePrice: d.basePrice,
    priceIsFrom: d.priceIsFrom,
    icon: d.icon,
    isActive: d.isActive,
    sortOrder: d.sortOrder,
  };
}

export async function saveService(id: string | null, input: ServiceInput): Promise<ActionResult> {
  const auth = await requireCan("services.manage");
  if (!auth.ok) return fail(auth.error);
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const v = values(parsed.data);

  const clash = await db.query.service.findFirst({
    where: and(eq(service.slug, v.slug), isNull(service.deletedAt), id ? ne(service.id, id) : undefined),
    columns: { id: true },
  });
  if (clash) return fail("A service with that name already exists.");

  if (id) {
    const [row] = await db.update(service).set(v).where(eq(service.id, id)).returning({ id: service.id });
    if (!row) return fail("Service not found.");
  } else {
    await db.insert(service).values(v);
  }
  await db.insert(auditLog).values({ actorUid: auth.uid, action: id ? "service.update" : "service.create", entityType: "service", entityId: id, metadata: { name: v.name, price: v.basePrice } });
  revalidate();
  return ok();
}

export async function deleteService(id: string): Promise<ActionResult> {
  const auth = await requireCan("services.manage");
  if (!auth.ok) return fail(auth.error);
  // Soft delete; free the slug so the name can be reused.
  const [row] = await db
    .update(service)
    .set({ deletedAt: new Date(), isActive: false, slug: `deleted-${id.slice(0, 8)}-${Date.now()}` })
    .where(eq(service.id, id))
    .returning({ id: service.id });
  if (!row) return fail("Service not found.");
  revalidate();
  return ok();
}
