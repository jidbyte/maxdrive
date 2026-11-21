import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowRight, BadgeCheck, Clock, ShieldCheck, Truck, Wrench } from "lucide-react";

import { db } from "@/shared/db";
import { service } from "@/shared/db/schema";
import { getStoreSettings } from "@/shared/store/settings";
import { JsonLd, storeLd } from "@/shared/seo/json-ld";
import { formatPrice } from "@/shared/utils/currency";
import { Button } from "@/shared/components/ui/button";
import {
  countActiveProducts,
  getBestSellers,
  getFeaturedProducts,
  getLatestProducts,
  listCategoriesWithCounts,
  listVehicleMakes,
} from "@/features/storefront/catalog/server/queries";
import { getSelectedVehicle } from "@/features/storefront/catalog/server/vehicle";
import { ProductGrid } from "@/features/storefront/ui/product-card";
import { VehicleSelector } from "@/features/storefront/ui/vehicle-selector";
import { CategoryIcon } from "@/features/storefront/ui/category-icon";
import { Container, SectionHeading } from "@/features/storefront/ui/section";

export const metadata = { alternates: { canonical: "/" } };

const TRUST = [
  { icon: BadgeCheck, title: "Genuine & OEM-grade", body: "Parts from brands you know, with manufacturer warranties." },
  { icon: ShieldCheck, title: "Fitment you can trust", body: "Tell us your vehicle — we show only parts that fit." },
  { icon: Truck, title: "Fast delivery or pickup", body: "Same-day delivery in town, or collect from our store." },
  { icon: Wrench, title: "Certified technicians", body: "Have parts fitted in our workshop by experts." },
];

export default async function HomePage() {
  const [settings, vehicle, makes, categories, productCount, services] = await Promise.all([
    getStoreSettings(),
    getSelectedVehicle(),
    listVehicleMakes(),
    listCategoriesWithCounts(),
    countActiveProducts(),
    db.query.service.findMany({
      where: eq(service.isActive, true),
      orderBy: [asc(service.sortOrder)],
      limit: 3,
    }),
  ]);

  const [featured, bestSellers] = await Promise.all([
    getFeaturedProducts(8, vehicle).then(async (f) => (f.length ? f : getLatestProducts(8, vehicle))),
    getBestSellers(4, vehicle),
  ]);

  const currency = settings.currency;

  return (
    <>
      <JsonLd data={storeLd(settings)} />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-horizon">
        <Container className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3.5 py-1.5 text-xs font-semibold text-primary sm:text-sm">
              <BadgeCheck className="size-4" /> Genuine &amp; OEM-grade auto parts
            </span>
            <h1 className="mt-5 text-4xl leading-[1.04] font-extrabold tracking-tight text-ink sm:text-5xl lg:text-[64px]">
              Quality parts.
              <br />
              <span className="text-primary">Trusted Service.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-neutral sm:text-lg">
              Shop parts matched to your exact vehicle, or book certified technicians at the {settings.name} workshop —
              all in one place.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/shop">
                  Shop parts <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/services/book">
                  <Wrench /> Book a service
                </Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
              <div>
                <dt className="text-xs text-neutral sm:text-sm">Parts in stock</dt>
                <dd className="text-2xl font-extrabold tracking-tight text-ink">
                  {productCount > 0 ? productCount.toLocaleString() : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral sm:text-sm">Categories</dt>
                <dd className="text-2xl font-extrabold tracking-tight text-ink">{categories.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral sm:text-sm">Delivery</dt>
                <dd className="text-2xl font-extrabold tracking-tight text-ink">24h</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card/90 p-5 shadow-pop backdrop-blur sm:p-7">
            <h2 className="text-xl font-extrabold tracking-tight text-ink">Find parts for your car</h2>
            <p className="mt-1 mb-5 text-sm text-neutral">Select your vehicle and we&apos;ll show parts that fit.</p>
            <VehicleSelector makes={makes} current={vehicle} />
          </div>
        </Container>
      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="py-14 sm:py-20">
          <Container>
            <SectionHeading eyebrow="Browse" title="Shop by category" href="/shop" linkLabel="All parts" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/shop/c/${c.slug}`}
                  className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40 sm:p-5"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary transition-transform group-hover:scale-105">
                    <CategoryIcon name={c.icon} className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-ink sm:text-[15px]">{c.name}</span>
                    <span className="text-xs text-neutral">
                      {c.productCount} part{c.productCount === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ── Featured / fits your vehicle ─────────────────────── */}
      {featured.length > 0 && (
        <section className="pb-14 sm:pb-20">
          <Container>
            <SectionHeading
              eyebrow={vehicle ? "Matched to your vehicle" : "Hand-picked"}
              title={vehicle ? `For your ${vehicle.label}` : "Featured parts"}
              href={vehicle ? "/shop?fits=1" : "/shop"}
            />
            <ProductGrid products={featured} currency={currency} />
          </Container>
        </section>
      )}

      {/* ── Services ─────────────────────────────────────────── */}
      {services.length > 0 && (
        <section className="py-14 sm:py-20">
          <Container>
            <div className="overflow-hidden rounded-2xl border border-border bg-horizon p-6 sm:p-10 lg:p-14">
              <SectionHeading
                eyebrow="Workshop"
                title="Have it fitted by our technicians"
                href="/services"
                linkLabel="All services"
              />
              <div className="grid gap-4 md:grid-cols-3">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card"
                  >
                    <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
                      <CategoryIcon name={s.icon} className="size-5" />
                    </span>
                    <h3 className="text-lg font-bold tracking-tight text-ink">{s.name}</h3>
                    <p className="text-sm text-neutral">{s.summary}</p>
                    <div className="mt-auto flex items-center justify-between pt-2 text-sm">
                      <span className="flex items-center gap-1.5 text-neutral">
                        <Clock className="size-4" /> {s.durationMinutes} min
                      </span>
                      <span className="font-bold text-ink">
                        {s.priceIsFrom ? "from " : ""}
                        {formatPrice(s.basePrice, currency)}
                      </span>
                    </div>
                    <Button asChild variant="outline" size="sm" className="mt-1">
                      <Link href={`/services/book?service=${s.slug}`}>Book now</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* ── Best sellers ─────────────────────────────────────── */}
      {bestSellers.length > 0 && (
        <section className="py-14 sm:py-20">
          <Container>
            <SectionHeading eyebrow="Popular" title="Best sellers" href="/shop" />
            <ProductGrid products={bestSellers} currency={currency} />
          </Container>
        </section>
      )}

      {/* ── Trust ────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map((t) => (
              <div key={t.title} className="rounded-xl border border-border bg-card p-6 shadow-card">
                <t.icon className="size-7 text-primary" />
                <h3 className="mt-4 font-bold text-ink">{t.title}</h3>
                <p className="mt-1.5 text-sm text-neutral">{t.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
