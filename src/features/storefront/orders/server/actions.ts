"use server";

import { and, eq, ilike } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/shared/db";
import { sale } from "@/shared/db/schema";
import { type ActionResult, fail, ok } from "@/shared/lib/action-result";

const lookupSchema = z.object({
  saleNumber: z.string().trim().min(4).max(40),
  email: z.email().max(160),
});

/**
 * Guest order lookup: order number + the email used at checkout. Returns
 * the private order URL (with access token) only on an exact match, and the
 * same generic error otherwise, so it can't be used to probe for orders.
 */
export async function lookupOrder(input: {
  saleNumber: string;
  email: string;
}): Promise<ActionResult<{ url: string }>> {
  const parsed = lookupSchema.safeParse(input);
  if (!parsed.success) return fail("Enter your order number and the email you used at checkout.");

  const order = await db.query.sale.findFirst({
    where: and(
      eq(sale.saleNumber, parsed.data.saleNumber.toUpperCase()),
      ilike(sale.customerEmail, parsed.data.email),
    ),
    columns: { saleNumber: true, accessToken: true },
  });
  if (!order) return fail("We couldn't find an order with those details.");
  return ok({ url: `/shop/order/${order.saleNumber}?t=${order.accessToken}` });
}
