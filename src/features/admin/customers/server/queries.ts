import { and, asc, desc, eq, isNull, notInArray, sql } from "drizzle-orm";

import { db } from "@/shared/db";
import { customer, sale, serviceBooking } from "@/shared/db/schema";

export async function listCustomers() {
  return db.query.customer.findMany({
    where: isNull(customer.deletedAt),
    orderBy: [asc(customer.name)],
  });
}

/** Customers with order count, lifetime spend and last order date. */
export async function listCustomersWithStats() {
  const live = notInArray(sale.status, ["cancelled", "refunded"]);
  return db
    .select({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      city: customer.city,
      customerType: customer.customerType,
      hasAccount: sql<boolean>`${customer.buyerUid} is not null`,
      createdAt: customer.createdAt,
      orders: sql<number>`count(${sale.id})::int`,
      spent: sql<number>`coalesce(sum(case when ${sale.paymentStatus} = 'paid' then ${sale.totalAmount} else 0 end), 0)::int`,
      lastOrder: sql<Date | null>`max(${sale.saleDate})`,
    })
    .from(customer)
    .leftJoin(sale, and(eq(sale.customerId, customer.id), live))
    .where(isNull(customer.deletedAt))
    .groupBy(customer.id)
    .orderBy(asc(customer.name));
}

export async function getCustomerById(customerId: string) {
  return db.query.customer.findFirst({
    where: and(eq(customer.id, customerId), isNull(customer.deletedAt)),
    with: { vehicles: true },
  });
}

export async function getCustomerActivity(customerId: string) {
  const [orders, bookings] = await Promise.all([
    db.query.sale.findMany({
      where: eq(sale.customerId, customerId),
      orderBy: [desc(sale.createdAt)],
      limit: 50,
    }),
    db.query.serviceBooking.findMany({
      where: eq(serviceBooking.customerId, customerId),
      orderBy: [desc(serviceBooking.scheduledAt)],
      limit: 20,
      with: { items: true },
    }),
  ]);
  return { orders, bookings };
}

export async function getCustomerByBuyerUid(buyerUid: string) {
  return db.query.customer.findFirst({
    where: and(eq(customer.buyerUid, buyerUid), isNull(customer.deletedAt)),
    with: { vehicles: true },
  });
}
