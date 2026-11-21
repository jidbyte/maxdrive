import Link from "next/link";
import { CalendarPlus, ChevronLeft } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { listVehicleOptions } from "@/features/admin/products/server/queries";
import { listActiveServices } from "@/features/workshop/server/queries";
import { BookingWizard } from "@/features/workshop/client/booking-wizard";
import { bookingDays } from "@/features/workshop/wizard-data";

export const metadata = { title: "New booking" };

export default async function NewBookingPage() {
  await requireStaffPage("bookings.manage");
  const [s, services, makes] = await Promise.all([getStoreSettings(), listActiveServices(), listVehicleOptions()]);

  return (
    <div className="space-y-6">
      <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-neutral hover:text-ink">
        <ChevronLeft className="size-4" /> Bookings
      </Link>
      <PageHeader>
        <PageTitle icon={CalendarPlus} description="Book a phone or walk-in customer. Lead time and booking window don't apply.">
          New booking
        </PageTitle>
      </PageHeader>
      <BookingWizard
        mode="staff"
        services={services.map((x) => ({
          id: x.id,
          name: x.name,
          summary: x.summary,
          category: x.category,
          icon: x.icon,
          durationMinutes: x.durationMinutes,
          basePrice: x.basePrice,
          priceIsFrom: x.priceIsFrom,
        }))}
        makes={makes}
        days={bookingDays(s, Math.max(s.bookingWindowDays, 60))}
        currency={s.currency}
      />
    </div>
  );
}
