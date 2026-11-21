import { and, asc, count, desc, eq, gte, inArray, isNull, lt } from "drizzle-orm";

import { db } from "@/shared/db";
import { service, serviceBooking } from "@/shared/db/schema";

export async function listActiveServices() {
  return db.query.service.findMany({
    where: and(eq(service.isActive, true), isNull(service.deletedAt)),
    orderBy: [asc(service.sortOrder), asc(service.name)],
  });
}

export async function listAllServices() {
  return db.query.service.findMany({
    where: isNull(service.deletedAt),
    orderBy: [asc(service.sortOrder), asc(service.name)],
  });
}

export async function listBookingsBetween(start: Date, end: Date) {
  return db.query.serviceBooking.findMany({
    where: and(gte(serviceBooking.scheduledAt, start), lt(serviceBooking.scheduledAt, end)),
    orderBy: [asc(serviceBooking.scheduledAt)],
    with: { items: true },
  });
}

export async function getBookingById(id: string) {
  return db.query.serviceBooking.findFirst({
    where: eq(serviceBooking.id, id),
    with: { items: true, customer: true },
  });
}

export async function getBookingByNumberAndToken(bookingNumber: string, token: string) {
  if (!token) return null;
  return db.query.serviceBooking.findFirst({
    where: and(eq(serviceBooking.bookingNumber, bookingNumber), eq(serviceBooking.accessToken, token)),
    with: { items: true },
  });
}

export async function getBookingForBuyer(bookingNumber: string, buyerUid: string) {
  return db.query.serviceBooking.findFirst({
    where: and(eq(serviceBooking.bookingNumber, bookingNumber), eq(serviceBooking.buyerUid, buyerUid)),
    with: { items: true },
  });
}

export async function listBookingsForBuyer(buyerUid: string) {
  return db.query.serviceBooking.findMany({
    where: eq(serviceBooking.buyerUid, buyerUid),
    orderBy: [desc(serviceBooking.scheduledAt)],
    with: { items: true },
  });
}

/** Upcoming bookings still waiting for staff action (for the sidebar badge). */
export async function countUpcomingBookings(from: Date) {
  const [row] = await db
    .select({ n: count() })
    .from(serviceBooking)
    .where(and(gte(serviceBooking.scheduledAt, from), inArray(serviceBooking.status, ["requested", "confirmed"])));
  return row.n;
}
