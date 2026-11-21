import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";

import { getStoreSettings } from "@/shared/store/settings";
import { Button } from "@/shared/components/ui/button";
import {
  listCategoriesWithCounts,
  listVehicleMakes,
  searchCatalog,
  type CatalogSort,
} from "@/features/storefront/catalog/server/queries";
import { getSelectedVehicle } from "@/features/storefront/catalog/server/vehicle";
import { ProductGrid } from "./product-card";
import { CatalogSidebar, CatalogToolbar } from "./catalog-filters";
import { VehicleSelector } from "./vehicle-selector";
import { Container } from "./section";

export type CatalogSearchParams = {
  q?: string;
  brand?: string;
  sort?: string;
  page?: string;
  min?: string;
  max?: string;
  stock?: string;
  fits?: string;
};

const SORTS: CatalogSort[] = ["relevance", "newest", "price-asc", "price-desc", "name"];
const int = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

export async function CatalogView({
  searchParams,
  category,
}: {
  searchParams: CatalogSearchParams;
  category?: { slug: string; name: string; description: string | null } | null;
}) {
  const [settings, vehicle, categories, makes] = await Promise.all([
    getStoreSettings(),
    getSelectedVehicle(),
    listCategoriesWithCounts(),
    listVehicleMakes(),
  ]);

  const page = int(searchParams.page) ?? 1;
  const result = await searchCatalog({
    q: searchParams.q,
    category: category?.slug,
    brand: searchParams.brand,
    vehicle,
    fitsOnly: searchParams.fits === "1",
    minPrice: int(searchParams.min),
    maxPrice: int(searchParams.max),
    inStock: searchParams.stock === "1",
    sort: SORTS.includes(searchParams.sort as CatalogSort) ? (searchParams.sort as CatalogSort) : undefined,
    page,
  });

  const title = searchParams.q
    ? `Results for “${searchParams.q}”`
    : category?.name ?? (vehicle && searchParams.fits === "1" ? `Parts for your ${vehicle.label}` : "All parts");

  const pageHref = (p: number) => {
    const qs = new URLSearchParams(
      Object.entries(searchParams).filter(([, v]) => typeof v === "string" && v) as [string, string][],
    );
    if (p > 1) qs.set("page", String(p));
    else qs.delete("page");
    const base = category ? `/shop/c/${category.slug}` : "/shop";
    const s = qs.toString();
    return s ? `${base}?${s}` : base;
  };

  return (
    <Container className="py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-neutral">
        <Link href="/" className="hover:text-ink">Home</Link> <span className="mx-1.5">/</span>
        <Link href="/shop" className="hover:text-ink">Shop</Link>
        {category && (
          <>
            <span className="mx-1.5">/</span>
            <span className="text-ink">{category.name}</span>
          </>
        )}
      </nav>
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
          {category?.description && <p className="mt-2 max-w-2xl text-neutral">{category.description}</p>}
        </div>
        <div className="w-full lg:max-w-md">
          <VehicleSelector makes={makes} current={vehicle} redirectTo={null} compact={false} />
        </div>
      </div>

      <div className="flex gap-10">
        <CatalogSidebar
          categories={categories}
          brands={result.brands}
          activeCategory={category?.slug ?? null}
          hasVehicle={!!vehicle}
        />
        <div className="min-w-0 flex-1 space-y-6">
          <CatalogToolbar
            categories={categories}
            brands={result.brands}
            activeCategory={category?.slug ?? null}
            hasVehicle={!!vehicle}
            total={result.total}
          />

          {result.items.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border px-6 py-20 text-center">
              <SearchX className="size-10 text-neutral" />
              <div>
                <p className="text-lg font-bold text-ink">No parts match these filters</p>
                <p className="mt-1 text-sm text-neutral">
                  Try removing a filter, or contact us — we can source most parts within days.
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href="/shop">Clear all</Link>
                </Button>
                <Button asChild>
                  <Link href="/contact">Ask our team</Link>
                </Button>
              </div>
            </div>
          ) : (
            <ProductGrid products={result.items} currency={settings.currency} className="xl:grid-cols-3" />
          )}

          {result.pageCount > 1 && (
            <nav className="flex items-center justify-center gap-2 pt-4" aria-label="Pagination">
              <Button asChild variant="outline" size="icon" aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-40" : ""}>
                <Link href={pageHref(page - 1)} aria-label="Previous page"><ChevronLeft /></Link>
              </Button>
              <span className="px-3 text-sm text-neutral">
                Page <b className="text-ink">{page}</b> of {result.pageCount}
              </span>
              <Button asChild variant="outline" size="icon" aria-disabled={page >= result.pageCount} className={page >= result.pageCount ? "pointer-events-none opacity-40" : ""}>
                <Link href={pageHref(page + 1)} aria-label="Next page"><ChevronRight /></Link>
              </Button>
            </nav>
          )}
        </div>
      </div>
    </Container>
  );
}
