// Server-only booking creation (not a "use server" module). Callers authorize first.
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/shared/db";
import { customer, service, serviceBooking, serviceBookingItem } from "@/shared/db/schema";
import { documentNumber, NUMBER_PREFIX } from "@/shared/lib/numbers";
import { getStoreSettings } from "@/shared/store/settings";
import { utcToZoned } from "@/shared/lib/zoned-time";
import { getDayAvailability } from "./availability";
import type { BookingInput } from "./schema";

export class SlotTakenError extends Error {
  constructor() {
    super("Sorry — that time was just taken. Please pick another slot.");
  }
}

export async function loadServices(ids: string[]) {
  const rows = await db.query.service.findMany({
    where: and(inArray(service.id, ids), eq(service.isActive, true), isNull(service.deletedAt)),
  });
  if (rows.length !== new Set(ids).size) return null;
  return rows;
}

export function vehicleLabel(v: BookingInput["vehicle"]) {
  return [v.year, v.makeName, v.modelName].filter(Boolean).join(" ") + (v.plateNumber ? ` · ${v.plateNumber.toUpperCase()}` : "");
}

/**
 * Creates a booking inside a transaction guarded by a per-day advisory
 * lock, re-checking capacity so two people can't grab the last bay.
 */
export async function createBookingRecord(
  input: BookingInput & { serviceIds: string[] },
  opts: { source: "online" | "phone" | "walk_in"; buyerUid: string | null; staff: boolean },
) {
  const services = await loadServices(input.serviceIds);
  if (!services) throw new Error("One or more selected services are no longer available.");

  const duration = services.reduce((s, x) => s + x.durationMinutes, 0);
  const estimate = services.reduce((s, x) => s + x.basePrice, 0);
  const start = new Date(input.start);
  const settings = await getStoreSettings();
  const { date } = utcToZoned(start, settings.timezone);

  // Find or create the customer record (by account, else by phone).
  let customerId: string | null = null;
  if (opts.buyerUid) {
    const linked = await db.query.customer.findFirst({ where: eq(customer.buyerUid, opts.buyerUid), columns: { id: true } });
    customerId = linked?.id ?? null;
  }
  if (!customerId) {
    const byPhone = await db.query.customer.findFirst({ where: eq(customer.phone, input.phone), columns: { id: true } });
    customerId = byPhone?.id ?? null;
  }
  if (!customerId) {
    const [created] = await db
      .insert(customer)
      .values({ name: input.name, phone: input.phone, email: input.email || null, buyerUid: opts.buyerUid })
      .onConflictDoNothing()
      .returning({ id: customer.id });
    customerId = created?.id ?? null;
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"booking:" + date}))`);
    const day = await getDayAvailability(date, duration, { staff: opts.staff, tx, settings });
    const ok = day.slots.some((s) => s.start === start.toISOString() && s.available);
    if (!ok) throw new SlotTakenError();

    const [b] = await tx
      .insert(serviceBooking)
      .values({
        bookingNumber: documentNumber(NUMBER_PREFIX.booking),
        customerId,
        buyerUid: opts.buyerUid,
        customerName: input.name,
        customerEmail: input.email || null,
        customerPhone: input.phone,
        vehicleDescription: vehicleLabel(input.vehicle),
        scheduledAt: start,
        durationMinutes: duration,
        status: "confirmed",
        source: opts.source,
        estimatedTotal: estimate,
        customerNotes: input.notes || null,
        internalNotes: input.vehicle.mileage ? `Mileage: ${input.vehicle.mileage.toLocaleString()}` : null,
      })
      .returning({ id: serviceBooking.id, bookingNumber: serviceBooking.bookingNumber, accessToken: serviceBooking.accessToken });

    await tx.insert(serviceBookingItem).values(
      services.map((s) => ({
        bookingId: b.id,
        serviceId: s.id,
        serviceName: s.name,
        price: s.basePrice,
        durationMinutes: s.durationMinutes,
      })),
    );
    return b;
  });
}
