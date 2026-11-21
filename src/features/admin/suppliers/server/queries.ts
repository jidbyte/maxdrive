import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";

import { db } from "@/shared/db";
import { purchase, supplier } from "@/shared/db/schema";

export async function listSuppliers() {
  return db.query.supplier.findMany({
    where: isNull(supplier.deletedAt),
    orderBy: [asc(supplier.companyName)],
  });
}

export async function listSuppliersWithStats() {
  return db
    .select({
      id: supplier.id,
      companyName: supplier.companyName,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      orders: sql<number>`count(${purchase.id})::int`,
      spent: sql<number>`coalesce(sum(case when ${purchase.purchaseStatus} = 'received' then ${purchase.totalAmount} else 0 end), 0)::int`,
      owed: sql<number>`coalesce(sum(case when ${purchase.paymentStatus} <> 'paid' and ${purchase.purchaseStatus} not in ('draft','cancelled') then ${purchase.totalAmount} else 0 end), 0)::int`,
      lastOrder: sql<Date | null>`max(${purchase.purchaseDate})`,
    })
    .from(supplier)
    .leftJoin(purchase, and(eq(purchase.supplierId, supplier.id), ne(purchase.purchaseStatus, "cancelled")))
    .where(isNull(supplier.deletedAt))
    .groupBy(supplier.id)
    .orderBy(asc(supplier.companyName));
}

export async function getSupplierById(supplierId: string) {
  return db.query.supplier.findFirst({
    where: and(eq(supplier.id, supplierId), isNull(supplier.deletedAt)),
  });
}
