import Link from "next/link";
import { CalendarX } from "lucide-react";

import { getCurrentUser } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { Button } from "@/shared/components/ui/button";
import { listVehicleOptions } from "@/features/admin/products/server/queries";
import { getCustomerByBuyerUid } from "@/features/admin/customers/server/queries";
import { listActiveServices } from "@/features/workshop/server/queries";
import { BookingWizard } from "@/features/workshop/client/booking-wizard";
import { bookingDays } from "@/features/workshop/wizard-data";
import { Container } from "@/features/storefront/ui/section";

export const metadata = {
  title: "Book a service",
  description: "Book your MAXDRIVE workshop visit online — choose a service, pick a time, done.",
  alternates: { canonical: "/services/book" },
};

export default async function BookServicePage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service: preselect } = await searchParams;
  const [settings, services, makes, user] = await Promise.all([
    getStoreSettings(),
    listActiveServices(),
    listVehicleOptions(),
    getCurrentUser(),
  ]);

  if (!settings.onlineBookingEnabled || services.length === 0) {
    return (
      <Container className="py-24">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <CalendarX className="size-12 text-neutral" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">Online booking is unavailable</h1>
          <p className="mt-2 text-neutral">Please call or message us and we&apos;ll book you in.</p>
          <Button asChild className="mt-6"><Link href="/contact">Contact us</Link></Button>
        </div>
      </Container>
    );
  }

  const customer = user ? await getCustomerByBuyerUid(user.authUid) : null;
  const initial = services.filter((s) => s.slug === preselect || s.id === preselect).map((s) => s.id);

  return (
    <Container className="py-8 sm:py-12">
      <p className="mb-2 text-sm font-semibold text-primary">MAXDRIVE Workshop</p>
      <h1 className="mb-8 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Book a service</h1>
      <BookingWizard
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          summary: s.summary,
          category: s.category,
          icon: s.icon,
          durationMinutes: s.durationMinutes,
          basePrice: s.basePrice,
          priceIsFrom: s.priceIsFrom,
        }))}
        makes={makes}
        days={bookingDays(settings)}
        currency={settings.currency}
        initialServiceIds={initial}
        prefill={{
          name: customer?.name ?? user?.name ?? "",
          phone: customer?.phone ?? user?.phone ?? "",
          email: customer?.email ?? user?.email ?? "",
        }}
      />
    </Container>
  );
}
