"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/shared/db";
import { customer } from "@/shared/db/schema";
import { requireCan } from "@/shared/authz/can";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { customerSchema, type CustomerInput } from "./schema";

export type { ActionResult };

function values(d: CustomerInput) {
  return {
    name: d.name,
    customerType: d.customerType,
    email: d.email || null,
    phone: d.phone || null,
    address: d.address || null,
    city: d.city || null,
    notes: d.notes || null,
  };
}

export async function createCustomer(input: CustomerInput): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCan("customers.manage");
  if (!auth.ok) return fail(auth.error);

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));

  const [created] = await db
    .insert(customer)
    .values(values(parsed.data))
    .returning({ id: customer.id });

  revalidatePath("/admin/customers");
  return ok({ id: created.id });
}

export async function updateCustomer(customerId: string, input: CustomerInput): Promise<ActionResult> {
  const auth = await requireCan("customers.manage");
  if (!auth.ok) return fail(auth.error);

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));

  const [updated] = await db
    .update(customer)
    .set(values(parsed.data))
    .where(eq(customer.id, customerId))
    .returning({ id: customer.id });
  if (!updated) return fail("Customer not found.");

  revalidatePath("/admin/customers");
  return ok();
}

export async function deleteCustomer(customerId: string): Promise<ActionResult> {
  const auth = await requireCan("customers.manage");
  if (!auth.ok) return fail(auth.error);

  const [updated] = await db
    .update(customer)
    .set({ deletedAt: new Date() })
    .where(eq(customer.id, customerId))
    .returning({ id: customer.id });
  if (!updated) return fail("Customer not found.");

  revalidatePath("/admin/customers");
  return ok();
}
