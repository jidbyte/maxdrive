// Server-side helpers that shape data for the booking wizard.
import type { StoreSettings } from "@/shared/db/schema";
import { addDays, todayIn, weekdayOf } from "@/shared/lib/zoned-time";
import type { WizardDay } from "./client/booking-wizard";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function bookingDays(s: StoreSettings, count = s.bookingWindowDays): WizardDay[] {
  const today = todayIn(s.timezone);
  return Array.from({ length: Math.max(1, count) + 1 }, (_, i) => {
    const date = addDays(today, i);
    const wd = weekdayOf(date);
    const hours = s.openingHours.find((h) => h.day === wd);
    return {
      date,
      weekday: i === 0 ? "Today" : i === 1 ? "Tmrw" : WD[wd],
      day: String(Number(date.slice(8, 10))),
      month: MO[Number(date.slice(5, 7)) - 1],
      closed: !hours || hours.closed,
    };
  });
}
