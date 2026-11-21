// Server-only slot engine (not a "use server" module).
import { and, inArray, lt, ne, sql } from "drizzle-orm";

import { db, type DbOrTx } from "@/shared/db";
import { serviceBooking, type StoreSettings } from "@/shared/db/schema";
import { getStoreSettings } from "@/shared/store/settings";
import { addDays, todayIn, utcToZoned, weekdayOf, zonedToUtc } from "@/shared/lib/zoned-time";

/** Bookings in these states occupy a workshop bay. */
export const ACTIVE_BOOKING_STATUSES = ["requested", "confirmed", "checked_in", "in_progress"] as const;

export type Slot = { time: string; start: string; available: boolean };
export type DayAvailability = { date: string; open: boolean; reason?: string; slots: Slot[] };

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/**
 * All bookable start times for `date` (store-local YYYY-MM-DD) for a job of
 * `durationMinutes`. A slot is available when fewer than `workshopBays`
 * active bookings overlap it, it ends before closing time, and it respects
 * lead time / booking window (unless `staff` is true).
 */
export async function getDayAvailability(
  date: string,
  durationMinutes: number,
  opts: { staff?: boolean; excludeBookingId?: string; tx?: DbOrTx; settings?: StoreSettings } = {},
): Promise<DayAvailability> {
  const s = opts.settings ?? (await getStoreSettings());
  const tz = s.timezone;
  const today = todayIn(tz);

  if (!opts.staff) {
    if (!s.onlineBookingEnabled) return { date, open: false, reason: "Online booking is currently unavailable.", slots: [] };
    if (date < today) return { date, open: false, reason: "That date has passed.", slots: [] };
    if (date > addDays(today, s.bookingWindowDays)) {
      return { date, open: false, reason: `Bookings open ${s.bookingWindowDays} days ahead.`, slots: [] };
    }
  }

  const hours = s.openingHours.find((h) => h.day === weekdayOf(date));
  if (!hours || hours.closed) return { date, open: false, reason: "The workshop is closed that day.", slots: [] };

  const openMin = toMin(hours.open);
  const closeMin = toMin(hours.close);
  const step = Math.max(5, s.bookingSlotMinutes);
  const dayStart = zonedToUtc(date, hours.open, tz);
  const dayEnd = zonedToUtc(date, hours.close, tz);

  const conds = [
    inArray(serviceBooking.status, [...ACTIVE_BOOKING_STATUSES]),
    lt(serviceBooking.scheduledAt, dayEnd),
    // Explicit UTC literal: a raw Date param here would bypass the column encoder.
    sql`${serviceBooking.scheduledAt} + make_interval(mins => ${serviceBooking.durationMinutes}) > ${dayStart.toISOString().replace("Z", "")}::timestamp`,
  ];
  if (opts.excludeBookingId) conds.push(ne(serviceBooking.id, opts.excludeBookingId));

  const busy = await (opts.tx ?? db)
    .select({ at: serviceBooking.scheduledAt, dur: serviceBooking.durationMinutes })
    .from(serviceBooking)
    .where(and(...conds));
  const intervals = busy.map((b) => [b.at.getTime(), b.at.getTime() + b.dur * 60_000] as const);

  const earliest = opts.staff ? 0 : Date.now() + s.bookingLeadMinutes * 60_000;
  const slots: Slot[] = [];
  for (let m = openMin; m + durationMinutes <= closeMin; m += step) {
    const time = toHHMM(m);
    const start = zonedToUtc(date, time, tz);
    const end = start.getTime() + durationMinutes * 60_000;
    const overlapping = intervals.filter(([a, b]) => a < end && b > start.getTime()).length;
    slots.push({
      time,
      start: start.toISOString(),
      available: start.getTime() >= earliest && overlapping < Math.max(1, s.workshopBays),
    });
  }

  if (slots.length === 0) {
    return { date, open: false, reason: "No time slots fit this service on that day.", slots };
  }
  return { date, open: true, slots };
}

/** Is `start` (UTC) a currently-available slot for a job of `durationMinutes`? */
export async function isSlotAvailable(
  start: Date,
  durationMinutes: number,
  opts: { staff?: boolean; excludeBookingId?: string; tx?: DbOrTx } = {},
): Promise<boolean> {
  const settings = await getStoreSettings();
  const { date } = utcToZoned(start, settings.timezone);
  const day = await getDayAvailability(date, durationMinutes, { ...opts, settings });
  return day.slots.some((s) => s.start === start.toISOString() && s.available);
}
