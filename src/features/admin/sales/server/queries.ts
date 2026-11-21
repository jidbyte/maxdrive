import { and, desc, eq, or } from "drizzle-orm";

import { db } from "@/shared/db";
import { sale } from "@/shared/db/schema";

export async function listSales() {
  return db.query.sale.findMany({ orderBy: [desc(sale.createdAt)] });
}

export async function getSaleById(saleId: string) {
  return db.query.sale.findFirst({
    where: eq(sale.id, saleId),
    with: { items: true, customer: true },
  });
}

export async function getSaleByPaystackReference(reference: string) {
  return db.query.sale.findFirst({ where: eq(sale.paystackReference, reference) });
}

/**
 * Public order lookup for the confirmation/tracking page. Requires the
 * unguessable access token (guest link) — or the caller must separately
 * verify the signed-in buyer owns it (see getOrderForBuyer).
 */
export async function getOrderByNumberAndToken(saleNumber: string, token: string) {
  if (!token) return null;
  return db.query.sale.findFirst({
    where: and(eq(sale.saleNumber, saleNumber), eq(sale.accessToken, token)),
    with: { items: { with: { product: { with: { images: true } } } } },
  });
}

export async function getOrderForBuyer(saleNumber: string, buyerUid: string) {
  return db.query.sale.findFirst({
    where: and(eq(sale.saleNumber, saleNumber), eq(sale.buyerUid, buyerUid)),
    with: { items: { with: { product: { with: { images: true } } } } },
  });
}

/** Order history for a signed-in customer. */
export async function listOrdersForBuyer(buyerUid: string, customerId?: string | null) {
  return db.query.sale.findMany({
    where: customerId
      ? or(eq(sale.buyerUid, buyerUid), eq(sale.customerId, customerId))
      : eq(sale.buyerUid, buyerUid),
    orderBy: [desc(sale.createdAt)],
    with: { items: { with: { product: { columns: { id: true, name: true, slug: true } } } } },
  });
}
