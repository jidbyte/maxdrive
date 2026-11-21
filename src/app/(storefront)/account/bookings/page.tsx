import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { getCurrentUser } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatInZone } from "@/shared/lib/zoned-time";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { listBookingsForBuyer } from "@/features/workshop/server/queries";

export const metadata = { title: "Bookings" };

export default async function AccountBookingsPage() {
  const user = (await getCurrentUser())!;
  const [s, bookings] = await Promise.all([getStoreSettings(), listBookingsForBuyer(user.authUid)]);
  const now = new Date();
  const upcoming = bookings.filter((b) => b.scheduledAt >= now && !["cancelled", "no_show", "completed"].includes(b.status)).reverse();
  const past = bookings.filter((b) => !upcoming.includes(b));

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <CalendarDays className="size-10 text-neutral" />
        <p className="mt-4 text-lg font-bold text-ink">No workshop bookings yet</p>
        <Button asChild className="mt-6"><Link href="/services/book">Book a service</Link></Button>
      </div>
    );
  }

  const Row = ({ b }: { b: (typeof bookings)[number] }) => (
    <li>
      <Link
        href={`/services/booking/${b.bookingNumber}?t=${b.accessToken}`}
        className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
      >
        <span className="min-w-0">
          <span className="block font-bold text-ink">
            {formatInZone(b.scheduledAt, s.timezone, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="block truncate text-sm text-neutral">
            {b.items.map((i) => i.serviceName).join(", ")} · {b.vehicleDescription}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize",
            b.status === "cancelled" || b.status === "no_show" ? "bg-danger/12 text-danger" : "bg-primary-soft text-primary",
          )}
        >
          {b.status.replace("_", " ")}
        </span>
      </Link>
    </li>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button asChild><Link href="/services/book">Book a service</Link></Button>
      </div>
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 font-bold text-ink">Upcoming</h2>
          <ul className="space-y-3">{upcoming.map((b) => <Row key={b.id} b={b} />)}</ul>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 font-bold text-ink">Past</h2>
          <ul className="space-y-3">{past.map((b) => <Row key={b.id} b={b} />)}</ul>
        </section>
      )}
    </div>
  );
}
