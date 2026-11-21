import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, Mail, Phone } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatInZone, utcToZoned } from "@/shared/lib/zoned-time";
import { formatPrice } from "@/shared/utils/currency";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { getBookingById } from "@/features/workshop/server/queries";
import { BookingStatusActions } from "@/features/workshop/client/booking-status-actions";
import { NotesPanel, ReschedulePanel } from "@/features/workshop/client/booking-admin-panels";
import { BOOKING_STATUS_META, SOURCE_LABEL } from "@/features/workshop/status";

export const metadata = { title: "Booking" };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
      <h2 className="mb-4 text-sm font-bold tracking-wide text-neutral uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaffPage("bookings.manage");
  const [s, b] = await Promise.all([getStoreSettings(), getBookingById(id)]);
  if (!b) notFound();

  const tz = s.timezone;
  const end = new Date(b.scheduledAt.getTime() + b.durationMinutes * 60_000);
  const meta = BOOKING_STATUS_META[b.status];
  const serviceIds = b.items.map((i) => i.serviceId).filter((x): x is string => !!x);
  const canMove = ["requested", "confirmed"].includes(b.status) && serviceIds.length === b.items.length;

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/bookings?date=${utcToZoned(b.scheduledAt, tz).date}`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-neutral hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Day view
      </Link>
      <PageHeader>
        <PageTitle
          icon={CalendarDays}
          description={
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{b.bookingNumber}</span>
              <Badge variant={meta.variant}>{meta.label}</Badge>
              <Badge variant="outline">{SOURCE_LABEL[b.source]}</Badge>
            </span>
          }
        >
          {formatInZone(b.scheduledAt, tz, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
          {formatInZone(b.scheduledAt, tz, { hour: "2-digit", minute: "2-digit" })}–{formatInZone(end, tz, { hour: "2-digit", minute: "2-digit" })}
        </PageTitle>
      </PageHeader>

      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <BookingStatusActions bookingId={b.id} status={b.status} size="default" />
        {b.status === "completed" && <p className="text-sm text-neutral">Completed — no further actions.</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title="Customer & vehicle">
            <p className="text-lg font-bold text-ink">{b.customerName}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={`tel:${b.customerPhone}`}><Phone /> {b.customerPhone}</a>
              </Button>
              {b.customerEmail && (
                <Button asChild variant="outline" size="sm">
                  <a href={`mailto:${b.customerEmail}`}><Mail /> {b.customerEmail}</a>
                </Button>
              )}
              {b.customerId && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/customers/${b.customerId}/edit`}>Customer record</Link>
                </Button>
              )}
            </div>
            <p className="mt-4 text-sm text-neutral">Vehicle</p>
            <p className="font-semibold text-ink">{b.vehicleDescription}</p>
            {b.customerNotes && (
              <>
                <p className="mt-4 text-sm text-neutral">Customer notes</p>
                <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink">{b.customerNotes}</p>
              </>
            )}
          </Card>

          <Card title="Services">
            <ul className="divide-y divide-border text-sm">
              {b.items.map((i) => (
                <li key={i.id} className="flex justify-between py-2.5">
                  <span className="text-ink">{i.serviceName} <span className="text-neutral">· {i.durationMinutes} min</span></span>
                  <span className="tabular-nums text-ink">{formatPrice(i.price, s.currency)}</span>
                </li>
              ))}
              <li className="flex justify-between py-2.5 font-bold text-ink">
                <span>Estimate</span>
                <span className="tabular-nums">{formatPrice(b.estimatedTotal, s.currency)}</span>
              </li>
            </ul>
          </Card>

          <Card title="Internal notes">
            <NotesPanel bookingId={b.id} initial={b.internalNotes ?? ""} />
          </Card>
        </div>

        <div className="space-y-6">
          {canMove && (
            <Card title="Reschedule">
              <ReschedulePanel bookingId={b.id} serviceIds={serviceIds} currentStart={b.scheduledAt.toISOString()} />
            </Card>
          )}
          <Card title="Timeline">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-neutral">Booked</dt><dd className="text-ink">{formatInZone(b.createdAt, tz, { dateStyle: "medium", timeStyle: "short" })}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral">Last update</dt><dd className="text-ink">{formatInZone(b.updatedAt, tz, { dateStyle: "medium", timeStyle: "short" })}</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
