import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Phone, Plus } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { addDays, formatInZone, isDateString, todayIn, weekdayOf, zonedToUtc } from "@/shared/lib/zoned-time";
import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { PageAction, PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { listBookingsBetween } from "@/features/workshop/server/queries";
import { BookingStatusActions } from "@/features/workshop/client/booking-status-actions";
import { BOOKING_STATUS_META, SOURCE_LABEL } from "@/features/workshop/status";
import { DatePickerJump } from "@/features/workshop/client/date-picker-jump";

export const metadata = { title: "Bookings" };

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireStaffPage("bookings.manage");
  const s = await getStoreSettings();
  const tz = s.timezone;
  const today = todayIn(tz);
  const sp = await searchParams;
  const date = isDateString(sp.date) ? sp.date : today;

  // Bookings for the 7-day strip (which also contains the selected day).
  const stripStart = date;
  const stripEnd = addDays(date, 7);
  const all = await listBookingsBetween(zonedToUtc(stripStart, "00:00", tz), zonedToUtc(stripEnd, "00:00", tz));
  const dayEnd = zonedToUtc(addDays(date, 1), "00:00", tz);
  const dayBookings = all.filter((b) => b.scheduledAt < dayEnd);
  const active = dayBookings.filter((b) => !["cancelled", "no_show"].includes(b.status));

  const countFor = (d: string) => {
    const from = zonedToUtc(d, "00:00", tz).getTime();
    const to = zonedToUtc(addDays(d, 1), "00:00", tz).getTime();
    return all.filter((b) => b.scheduledAt.getTime() >= from && b.scheduledAt.getTime() < to && !["cancelled", "no_show"].includes(b.status)).length;
  };
  const hours = s.openingHours.find((h) => h.day === weekdayOf(date));
  const fmtTime = (d: Date) => formatInZone(d, tz, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle
          icon={CalendarDays}
          description={`${formatInZone(zonedToUtc(date, "12:00", tz), tz, { weekday: "long", day: "numeric", month: "long" })} · ${
            hours && !hours.closed ? `open ${hours.open}–${hours.close} · ${s.workshopBays} bays` : "closed"
          }`}
        >
          Bookings
        </PageTitle>
        <PageAction>
          <Button asChild>
            <Link href="/admin/bookings/new"><Plus /> New booking</Link>
          </Button>
        </PageAction>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="icon" aria-label="Previous day">
          <Link href={`/admin/bookings?date=${addDays(date, -1)}`}><ChevronLeft /></Link>
        </Button>
        <Button asChild variant={date === today ? "primary" : "outline"} size="sm" className="h-10">
          <Link href="/admin/bookings">Today</Link>
        </Button>
        <Button asChild variant="outline" size="icon" aria-label="Next day">
          <Link href={`/admin/bookings?date=${addDays(date, 1)}`}><ChevronRight /></Link>
        </Button>
        <DatePickerJump value={date} />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {Array.from({ length: 7 }, (_, i) => addDays(date, i)).map((d) => {
          const n = countFor(d);
          return (
            <Link
              key={d}
              href={`/admin/bookings?date=${d}`}
              className={cn(
                "flex w-20 shrink-0 flex-col items-center rounded-2xl border py-2.5 transition-colors",
                d === date ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40",
              )}
            >
              <span className="text-[11px] font-semibold text-neutral uppercase">{d === today ? "Today" : WD[weekdayOf(d)]}</span>
              <span className="text-lg font-extrabold text-ink">{Number(d.slice(8))}</span>
              <span className={cn("text-[11px] font-semibold", n ? "text-primary" : "text-neutral")}>{n} booking{n === 1 ? "" : "s"}</span>
            </Link>
          );
        })}
      </div>

      {dayBookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="font-bold text-ink">No bookings for this day</p>
          <p className="mt-1 text-sm text-neutral">New online bookings appear here automatically.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-neutral">
            {active.length} active · {dayBookings.length - active.length} cancelled / no-show
          </p>
          <ul className="space-y-3">
            {dayBookings.map((b) => {
              const meta = BOOKING_STATUS_META[b.status];
              const end = new Date(b.scheduledAt.getTime() + b.durationMinutes * 60_000);
              const dim = ["cancelled", "no_show"].includes(b.status);
              return (
                <li
                  key={b.id}
                  className={cn(
                    "grid gap-4 rounded-xl border border-border bg-card p-4 shadow-card sm:grid-cols-[110px_1fr_auto] sm:items-center sm:p-5",
                    dim && "opacity-60",
                  )}
                >
                  <div className="flex items-center gap-2 sm:block">
                    <p className="text-xl font-extrabold text-ink tabular-nums">{fmtTime(b.scheduledAt)}</p>
                    <p className="flex items-center gap-1 text-xs text-neutral tabular-nums">
                      <Clock className="size-3" /> until {fmtTime(end)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/bookings/${b.id}`} className="font-bold text-ink hover:text-primary">
                        {b.customerName}
                      </Link>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      <Badge variant="outline">{SOURCE_LABEL[b.source]}</Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-ink">{b.items.map((i) => i.serviceName).join(", ")}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-neutral">
                      <span>{b.vehicleDescription}</span>
                      <a href={`tel:${b.customerPhone}`} className="flex items-center gap-1 hover:text-primary">
                        <Phone className="size-3" /> {b.customerPhone}
                      </a>
                      <span>est. {formatPrice(b.estimatedTotal, s.currency)}</span>
                    </p>
                    {b.customerNotes && <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink">“{b.customerNotes}”</p>}
                  </div>
                  <BookingStatusActions bookingId={b.id} status={b.status} />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
