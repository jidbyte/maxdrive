import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck2, CalendarPlus, Car, Clock, MapPin, Phone, XCircle } from "lucide-react";

import { getCurrentUser } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { formatInZone } from "@/shared/lib/zoned-time";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { getBookingByNumberAndToken, getBookingForBuyer } from "@/features/workshop/server/queries";
import { CancelBookingButton } from "@/features/workshop/client/cancel-booking-button";
import { Container } from "@/features/storefront/ui/section";

export const metadata = { title: "Your booking", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: string }> = {
  requested: { label: "Requested", tone: "bg-warning/15 text-warning" },
  confirmed: { label: "Confirmed", tone: "bg-success/12 text-success" },
  checked_in: { label: "Checked in", tone: "bg-primary-soft text-primary" },
  in_progress: { label: "In progress", tone: "bg-primary-soft text-primary" },
  completed: { label: "Completed", tone: "bg-success/12 text-success" },
  cancelled: { label: "Cancelled", tone: "bg-danger/12 text-danger" },
  no_show: { label: "Missed", tone: "bg-danger/12 text-danger" },
};

function gcalDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ t?: string; new?: string }>;
}) {
  const { number } = await params;
  const sp = await searchParams;
  let booking = sp.t ? await getBookingByNumberAndToken(number, sp.t) : null;
  if (!booking) {
    const user = await getCurrentUser();
    if (user) booking = (await getBookingForBuyer(number, user.authUid)) ?? null;
  }
  if (!booking) notFound();

  const s = await getStoreSettings();
  const end = new Date(booking.scheduledAt.getTime() + booking.durationMinutes * 60_000);
  const when = formatInZone(booking.scheduledAt, s.timezone, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = `${formatInZone(booking.scheduledAt, s.timezone, { hour: "2-digit", minute: "2-digit" })} – ${formatInZone(end, s.timezone, { hour: "2-digit", minute: "2-digit" })}`;
  const where = [s.address, s.city].filter(Boolean).join(", ");
  const st = STATUS[booking.status] ?? STATUS.confirmed;
  const cancellable = ["requested", "confirmed"].includes(booking.status) && booking.scheduledAt > new Date();
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${s.name} workshop – ${booking.items.map((i) => i.serviceName).join(", ")}`)}&dates=${gcalDate(booking.scheduledAt)}/${gcalDate(end)}&details=${encodeURIComponent(`Booking ${booking.bookingNumber}\nVehicle: ${booking.vehicleDescription}`)}&location=${encodeURIComponent(where)}`;

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      {sp.new === "1" && booking.status !== "cancelled" && (
        <div className="bg-horizon mb-8 rounded-2xl border border-border p-6 text-center sm:p-10">
          <CalendarCheck2 className="mx-auto size-12 text-success" />
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink">You&apos;re booked in!</h1>
          <p className="mt-2 text-neutral">
            {booking.customerEmail ? `We've emailed a confirmation to ${booking.customerEmail}. ` : ""}
            Save this page to view or cancel your booking.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-neutral uppercase">Booking</p>
            <p className="font-mono text-lg font-bold text-ink">{booking.bookingNumber}</p>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold", st.tone)}>{st.label}</span>
        </div>

        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="flex gap-3">
            <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <dt className="text-xs text-neutral">When</dt>
              <dd className="font-semibold text-ink">{when}</dd>
              <dd className="text-sm text-ink tabular-nums">{time}</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Car className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <dt className="text-xs text-neutral">Vehicle</dt>
              <dd className="font-semibold text-ink">{booking.vehicleDescription}</dd>
            </div>
          </div>
          {where && (
            <div className="flex gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <dt className="text-xs text-neutral">Where</dt>
                <dd className="font-semibold text-ink">{s.name}</dd>
                <dd className="text-sm text-neutral">{where}</dd>
              </div>
            </div>
          )}
          {s.phone && (
            <div className="flex gap-3">
              <Phone className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <dt className="text-xs text-neutral">Questions?</dt>
                <dd><a href={`tel:${s.phone}`} className="font-semibold text-primary">{s.phone}</a></dd>
              </div>
            </div>
          )}
        </dl>

        <ul className="mt-6 divide-y divide-border border-t border-border">
          {booking.items.map((i) => (
            <li key={i.id} className="flex justify-between py-3 text-sm">
              <span className="text-ink">{i.serviceName}</span>
              <span className="text-neutral tabular-nums">{formatPrice(i.price, s.currency)}</span>
            </li>
          ))}
          <li className="flex justify-between py-3">
            <span className="font-bold text-ink">Estimated total</span>
            <span className="font-extrabold text-ink tabular-nums">{formatPrice(booking.estimatedTotal, s.currency)}</span>
          </li>
        </ul>
        <p className="text-xs text-neutral">Payment is taken at the workshop. Any extra parts are quoted before work starts.</p>

        {booking.status === "cancelled" ? (
          <p className="mt-6 flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
            <XCircle className="size-4" /> This booking was cancelled.
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline">
              <a href={gcal} target="_blank" rel="noreferrer"><CalendarPlus /> Add to Google Calendar</a>
            </Button>
            {cancellable && sp.t && <CancelBookingButton bookingNumber={booking.bookingNumber} token={sp.t} />}
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button asChild><Link href="/services/book">Book another service</Link></Button>
        <Button asChild variant="ghost"><Link href="/shop">Shop parts</Link></Button>
      </div>
    </Container>
  );
}
