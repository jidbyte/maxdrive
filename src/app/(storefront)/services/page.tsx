import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { CalendarClock, Clock } from "lucide-react";

import { db } from "@/shared/db";
import { service } from "@/shared/db/schema";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { Button } from "@/shared/components/ui/button";
import { CategoryIcon } from "@/features/storefront/ui/category-icon";
import { Container } from "@/features/storefront/ui/section";

export const metadata = {
  title: "Workshop services",
  description: "Oil changes, diagnostics, brakes, AC and full servicing by certified MAXDRIVE technicians.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const [s, services] = await Promise.all([
    getStoreSettings(),
    db.query.service.findMany({ where: eq(service.isActive, true), orderBy: [asc(service.sortOrder)] }),
  ]);

  return (
    <>
      <section className="bg-horizon border-b border-border">
        <Container className="grid gap-8 py-12 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold text-primary">MAXDRIVE Workshop</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Expert care for your vehicle</h1>
            <p className="mt-3 max-w-xl text-lg text-neutral">
              Certified technicians, genuine parts and transparent pricing — buy your parts online and have them
              fitted in our workshop.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/services/book">
                <CalendarClock /> Book online
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/contact">Ask a question</Link>
            </Button>
          </div>
        </Container>
      </section>

      <Container className="py-12 sm:py-16">
        {services.length === 0 ? (
          <p className="text-center text-neutral">Our service menu is coming soon.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((sv) => (
              <article key={sv.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-card">
                <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
                  <CategoryIcon name={sv.icon} className="size-5" />
                </span>
                {sv.category && <p className="text-xs font-semibold tracking-wide text-neutral uppercase">{sv.category}</p>}
                <h2 className="text-xl font-bold tracking-tight text-ink">{sv.name}</h2>
                <p className="text-sm text-neutral">{sv.summary}</p>
                <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-sm">
                  <span className="flex items-center gap-1.5 text-neutral">
                    <Clock className="size-4" /> ~{sv.durationMinutes} min
                  </span>
                  <span className="text-base font-extrabold text-ink">
                    {sv.priceIsFrom && <span className="text-xs font-medium text-neutral">from </span>}
                    {formatPrice(sv.basePrice, s.currency)}
                  </span>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/services/book?service=${sv.slug}`}>Book this service</Link>
                </Button>
              </article>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
