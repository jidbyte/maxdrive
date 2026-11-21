"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/shared/db";
import { auditLog, serviceBooking } from "@/shared/db/schema";
import { BOOKING_STATUSES } from "@/shared/db/schema/services";
import { requireCan } from "@/shared/authz/can";
import { getSession } from "@/shared/authz/session";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { isDateString } from "@/shared/lib/zoned-time";
import { getDayAvailability, isSlotAvailable, type DayAvailability } from "./availability";
import { createBookingRecord, loadServices, SlotTakenError } from "./core";
import { sendBookingNotifications } from "./notify";
import { bookingSchema, type BookingInput } from "./schema";

type BookingStatus = (typeof BOOKING_STATUSES)[number];

function revalidateBookings() {
  revalidatePath("/admin/bookings", "layout");
  revalidatePath("/account/bookings");
}

/** Public: available start times for a date and a set of services. */
export async function getAvailableSlots(date: string, serviceIds: string[], staff = false): Promise<DayAvailability> {
  if (!isDateString(date) || !Array.isArray(serviceIds) || serviceIds.length === 0 || serviceIds.length > 6) {
    return { date, open: false, reason: "Choose a service and a date.", slots: [] };
  }
  if (staff) {
    const auth = await requireCan("bookings.manage");
    if (!auth.ok) staff = false;
  }
  const services = await loadServices(serviceIds);
  if (!services) return { date, open: false, reason: "That service is unavailable.", slots: [] };
  const duration = services.reduce((s, x) => s + x.durationMinutes, 0);
  return getDayAvailability(date, duration, { staff });
}

/** Public: a customer books online (guest or signed in). */
export async function bookService(input: BookingInput): Promise<ActionResult<{ url: string }>> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const session = await getSession();

  try {
    const b = await createBookingRecord(parsed.data, { source: "online", buyerUid: session?.uid ?? null, staff: false });
    await sendBookingNotifications(b.id, "created");
    revalidateBookings();
    return ok({ url: `/services/booking/${b.bookingNumber}?t=${b.accessToken}&new=1` });
  } catch (err) {
    if (err instanceof SlotTakenError) return fail(err.message);
    console.error("[bookService]", err);
    return fail(err instanceof Error && err.message.includes("no longer available") ? err.message : "We couldn't save your booking. Please try again.");
  }
}

/** Staff: phone / walk-in booking on a customer's behalf (lead time & window not enforced). */
export async function createStaffBooking(
  input: BookingInput,
  source: "phone" | "walk_in" = "phone",
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCan("bookings.manage");
  if (!auth.ok) return fail(auth.error);
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  try {
    const b = await createBookingRecord(parsed.data, { source, buyerUid: null, staff: true });
    await db.insert(auditLog).values({ actorUid: auth.uid, action: "booking.create", entityType: "booking", entityId: b.id });
    await sendBookingNotifications(b.id, "confirmed");
    revalidateBookings();
    return ok({ id: b.id });
  } catch (err) {
    if (err instanceof SlotTakenError) return fail("That slot is fully booked. Choose another time.");
    console.error("[createStaffBooking]", err);
    return fail("Couldn't create the booking.");
  }
}

/** Public: customer cancels via their private link (until the job starts). */
export async function cancelMyBooking(bookingNumber: string, token: string): Promise<ActionResult> {
  if (typeof token !== "string" || token.length < 16) return fail("Invalid link.");
  const b = await db.query.serviceBooking.findFirst({
    where: and(eq(serviceBooking.bookingNumber, bookingNumber), eq(serviceBooking.accessToken, token)),
  });
  if (!b) return fail("Booking not found.");
  if (!["requested", "confirmed"].includes(b.status)) return fail("This booking can no longer be cancelled online — please call us.");
  await db.update(serviceBooking).set({ status: "cancelled" }).where(eq(serviceBooking.id, b.id));
  await sendBookingNotifications(b.id, "cancelled");
  revalidateBookings();
  revalidatePath(`/services/booking/${bookingNumber}`);
  return ok();
}

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "no_show", "cancelled"],
  checked_in: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: ["confirmed"],
  no_show: ["confirmed"],
};

export async function setBookingStatus(bookingId: string, status: BookingStatus): Promise<ActionResult> {
  const auth = await requireCan("bookings.manage");
  if (!auth.ok) return fail(auth.error);
  const b = await db.query.serviceBooking.findFirst({ where: eq(serviceBooking.id, bookingId) });
  if (!b) return fail("Booking not found.");
  if (!TRANSITIONS[b.status].includes(status)) return fail(`Can't move a ${b.status.replace("_", " ")} booking to ${status.replace("_", " ")}.`);

  // Re-opening a cancelled booking must still fit.
  if ((b.status === "cancelled" || b.status === "no_show") && !(await isSlotAvailable(b.scheduledAt, b.durationMinutes, { staff: true, excludeBookingId: b.id }))) {
    return fail("That time slot is now full — reschedule instead.");
  }

  await db.update(serviceBooking).set({ status }).where(eq(serviceBooking.id, bookingId));
  await db.insert(auditLog).values({
    actorUid: auth.uid,
    action: "booking.status",
    entityType: "booking",
    entityId: bookingId,
    metadata: { from: b.status, to: status },
  });
  if (status === "cancelled") await sendBookingNotifications(bookingId, "cancelled");
  revalidateBookings();
  return ok();
}

export async function rescheduleBooking(bookingId: string, startIso: string): Promise<ActionResult> {
  const auth = await requireCan("bookings.manage");
  if (!auth.ok) return fail(auth.error);
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return fail("Invalid time.");
  const b = await db.query.serviceBooking.findFirst({ where: eq(serviceBooking.id, bookingId) });
  if (!b) return fail("Booking not found.");
  if (!["requested", "confirmed"].includes(b.status)) return fail("Only upcoming bookings can be rescheduled.");
  if (!(await isSlotAvailable(start, b.durationMinutes, { staff: true, excludeBookingId: b.id }))) {
    return fail("That slot is fully booked.");
  }
  await db.update(serviceBooking).set({ scheduledAt: start, reminderSentAt: null }).where(eq(serviceBooking.id, bookingId));
  await db.insert(auditLog).values({
    actorUid: auth.uid,
    action: "booking.reschedule",
    entityType: "booking",
    entityId: bookingId,
    metadata: { from: b.scheduledAt.toISOString(), to: start.toISOString() },
  });
  await sendBookingNotifications(bookingId, "rescheduled");
  revalidateBookings();
  return ok();
}

export async function updateBookingNotes(bookingId: string, internalNotes: string): Promise<ActionResult> {
  const auth = await requireCan("bookings.manage");
  if (!auth.ok) return fail(auth.error);
  await db
    .update(serviceBooking)
    .set({ internalNotes: internalNotes.slice(0, 2000) || null })
    .where(eq(serviceBooking.id, bookingId));
  revalidateBookings();
  return ok();
}
