/**
 * Minimal timezone helpers (no extra dependency). Workshop hours are stored
 * as wall-clock times ("08:00") in the store's IANA timezone; bookings are
 * stored as UTC instants.
 */

/** Offset in minutes of `timeZone` from UTC at the given instant (e.g. +60 for Europe/London in summer). */
function offsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/** "2026-11-10" + "08:30" in `timeZone` → UTC Date. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  // Two passes handle DST transitions correctly.
  const first = new Date(guess.getTime() - offsetMinutes(guess, timeZone) * 60_000);
  return new Date(guess.getTime() - offsetMinutes(first, timeZone) * 60_000);
}

/** UTC instant → { date: "YYYY-MM-DD", time: "HH:MM", weekday: 0-6 } in `timeZone`. */
export function utcToZoned(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}`, weekday };
}

/** Today's date (YYYY-MM-DD) in `timeZone`. */
export function todayIn(timeZone: string): string {
  return utcToZoned(new Date(), timeZone).date;
}

/** Add days to a YYYY-MM-DD date string. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Weekday (0 = Sunday) of a YYYY-MM-DD date string. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isDateString(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

/** Format a UTC instant for display in the store's timezone. */
export function formatInZone(instant: Date, timeZone: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, ...opts }).format(instant);
}
