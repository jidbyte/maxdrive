"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/shared/db";
import { supplier } from "@/shared/db/schema";
import { requireCan } from "@/shared/authz/can";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { supplierSchema, type SupplierInput } from "./schema";

export type { ActionResult };

function values(d: SupplierInput) {
  return {
    companyName: d.companyName,
    contactName: d.contactName || null,
    phone: d.phone || null,
    email: d.email || null,
    website: d.website || null,
    address: d.address || null,
  };
}

export async function createSupplier(input: SupplierInput): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCan("suppliers.manage");
  if (!auth.ok) return fail(auth.error);

  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));

  const [created] = await db
    .insert(supplier)
    .values(values(parsed.data))
    .returning({ id: supplier.id });

  revalidatePath("/admin/suppliers");
  return ok({ id: created.id });
}

export async function updateSupplier(supplierId: string, input: SupplierInput): Promise<ActionResult> {
  const auth = await requireCan("suppliers.manage");
  if (!auth.ok) return fail(auth.error);

  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));

  const [updated] = await db
    .update(supplier)
    .set(values(parsed.data))
    .where(eq(supplier.id, supplierId))
    .returning({ id: supplier.id });
  if (!updated) return fail("Supplier not found.");

  revalidatePath("/admin/suppliers");
  return ok();
}

export async function deleteSupplier(supplierId: string): Promise<ActionResult> {
  const auth = await requireCan("suppliers.manage");
  if (!auth.ok) return fail(auth.error);

  const [updated] = await db
    .update(supplier)
    .set({ deletedAt: new Date() })
    .where(eq(supplier.id, supplierId))
    .returning({ id: supplier.id });
  if (!updated) return fail("Supplier not found.");

  revalidatePath("/admin/suppliers");
  return ok();
}
