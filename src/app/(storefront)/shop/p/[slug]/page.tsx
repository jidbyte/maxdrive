import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Car,
  CircleAlert,
  RotateCcw,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";

import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { JsonLd, absoluteUrl, breadcrumbLd } from "@/shared/seo/json-ld";
import { ProductImageGallery } from "@/features/admin/products/client/image-gallery";
import { StarRatingDisplay } from "@/features/admin/reviews/client/star-rating";
import {
  getReviewSummaryForProduct,
  getReviewsForProduct,
} from "@/features/admin/reviews/server/queries";
import {
  getProductBySlug,
  getRelatedProducts,
  listVehicleMakes,
  productFitsVehicle,
} from "@/features/storefront/catalog/server/queries";
import { getSelectedVehicle } from "@/features/storefront/catalog/server/vehicle";
import { AddToCartButton } from "@/features/storefront/ui/add-to-cart-button";
import { Price } from "@/features/storefront/ui/price";
import { ProductGrid } from "@/features/storefront/ui/product-card";
import { Container, SectionHeading } from "@/features/storefront/ui/section";
import { VehicleSelector } from "@/features/storefront/ui/vehicle-selector";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: "Part not found" };
  const desc =
    p.seoDescription ||
    p.description?.slice(0, 160) ||
    `${p.name}${p.brand ? ` by ${p.brand}` : ""}${p.partNumber ? ` (part no. ${p.partNumber})` : ""} at MAXDRIVE.`;
  const img = p.images.find((i) => i.isPrimary)?.url ?? p.images[0]?.url;
  return {
    title: p.seoTitle || p.name,
    description: desc,
    alternates: { canonical: `/shop/p/${p.slug}` },
    openGraph: { type: "website", title: p.name, description: desc, images: img ? [img] : undefined },
    twitter: { card: img ? "summary_large_image" : "summary", title: p.name, description: desc },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();

  const [settings, vehicle, makes, summary, reviews] = await Promise.all([
    getStoreSettings(),
    getSelectedVehicle(),
    listVehicleMakes(),
    getReviewSummaryForProduct(product.id),
    getReviewsForProduct(product.id),
  ]);
  const categoryIds = product.productCategories.map((pc) => pc.categoryId);
  const [fits, related] = await Promise.all([
    vehicle ? productFitsVehicle(product.id, vehicle) : Promise.resolve(null),
    getRelatedProducts(product.id, categoryIds, vehicle, 4),
  ]);

  const currency = settings.currency;
  const soldOut = product.quantity < 1;
  const primaryCategory = product.productCategories[0]?.category;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    mpn: product.partNumber ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    image: product.images.map((i) => i.url),
    description: product.description ?? undefined,
    itemCondition: `https://schema.org/${product.condition === "new" ? "NewCondition" : product.condition === "used" ? "UsedCondition" : "RefurbishedCondition"}`,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/shop/p/${product.slug}`),
      seller: { "@id": absoluteUrl("/#store") },
      itemCondition: `https://schema.org/${product.condition === "new" ? "NewCondition" : product.condition === "used" ? "UsedCondition" : "RefurbishedCondition"}`,
      priceCurrency: currency,
      price: product.sellingPrice,
      availability: soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    },
    aggregateRating:
      summary.reviewCount > 0
        ? { "@type": "AggregateRating", ratingValue: summary.averageRating.toFixed(1), reviewCount: summary.reviewCount }
        : undefined,
  };

  return (
    <>
      <JsonLd
        data={[
          jsonLd,
          breadcrumbLd([
            ["Home", "/"],
            ["Shop", "/shop"],
            ...(primaryCategory ? [[primaryCategory.name, `/shop/c/${primaryCategory.slug}`] as [string, string]] : []),
            [product.name, `/shop/p/${product.slug}`],
          ]),
        ]}
      />
      <Container className="py-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="mb-6 truncate text-sm text-neutral">
          <Link href="/" className="hover:text-ink">Home</Link> <span className="mx-1.5">/</span>
          <Link href="/shop" className="hover:text-ink">Shop</Link>
          {primaryCategory && (
            <>
              <span className="mx-1.5">/</span>
              <Link href={`/shop/c/${primaryCategory.slug}`} className="hover:text-ink">{primaryCategory.name}</Link>
            </>
          )}
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <ProductImageGallery
            images={product.images.map((i) => ({ id: i.id, url: i.url, isPrimary: i.isPrimary }))}
            productName={product.name}
            className="lg:sticky lg:top-24 lg:self-start"
          />

          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-wide text-neutral uppercase">
                {product.brand && <span className="text-primary">{product.brand}</span>}
                {product.partNumber && <span className="font-mono normal-case">Part # {product.partNumber}</span>}
                <span className="font-mono normal-case">SKU {product.sku}</span>
              </div>
              <h1 className="mt-2 text-3xl leading-tight font-extrabold tracking-tight text-ink sm:text-4xl">
                {product.name}
              </h1>
              {summary.reviewCount > 0 && (
                <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-neutral hover:text-ink">
                  <StarRatingDisplay rating={summary.averageRating} size="md" />
                  {summary.averageRating.toFixed(1)} · {summary.reviewCount} review{summary.reviewCount === 1 ? "" : "s"}
                </a>
              )}
            </div>

            <Price amount={product.sellingPrice} compareAt={product.compareAtPrice} currency={currency} size="lg" />

            {/* Fitment */}
            {product.isUniversal ? (
              <p className="flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                <BadgeCheck className="size-5" /> Universal fit — suitable for most vehicles
              </p>
            ) : vehicle ? (
              fits ? (
                <p className="flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                  <BadgeCheck className="size-5" /> Fits your {vehicle.label}
                </p>
              ) : (
                <p className="flex items-center gap-2 rounded-2xl bg-warning/15 px-4 py-3 text-sm font-semibold text-warning">
                  <CircleAlert className="size-5" /> We couldn&apos;t confirm this fits your {vehicle.label}. Check the
                  compatibility list below or ask us.
                </p>
              )
            ) : (
              <details className="group rounded-2xl border border-border p-4">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink">
                  <Car className="size-5 text-primary" /> Check if this fits your vehicle
                </summary>
                <VehicleSelector makes={makes} current={null} redirectTo={null} className="mt-4" />
              </details>
            )}

            <div className="space-y-3">
              <p className={soldOut ? "text-sm font-semibold text-danger" : "text-sm font-semibold text-success"}>
                {soldOut
                  ? "Out of stock — contact us for availability"
                  : product.quantity <= 5
                    ? `Only ${product.quantity} left in stock`
                    : "In stock — ready to ship"}
              </p>
              <AddToCartButton
                productId={product.id}
                productName={product.name}
                available={product.quantity}
                variant="full"
              />
            </div>

            <ul className="grid gap-3 rounded-xl border border-border bg-card p-5 text-sm sm:grid-cols-2">
              {settings.deliveryEnabled && (
                <li className="flex gap-3">
                  <Truck className="size-5 shrink-0 text-primary" />
                  <span>
                    <b className="block text-ink">Delivery</b>
                    <span className="text-neutral">
                      {settings.freeDeliveryThreshold
                        ? `Free over ${formatPrice(settings.freeDeliveryThreshold, currency)}`
                        : `${formatPrice(settings.deliveryFee, currency)} flat rate`}
                    </span>
                  </span>
                </li>
              )}
              {settings.pickupEnabled && (
                <li className="flex gap-3">
                  <Store className="size-5 shrink-0 text-primary" />
                  <span>
                    <b className="block text-ink">Store pickup</b>
                    <span className="text-neutral">Free · pay online or on pickup</span>
                  </span>
                </li>
              )}
              <li className="flex gap-3">
                <ShieldCheck className="size-5 shrink-0 text-primary" />
                <span>
                  <b className="block text-ink">Warranty</b>
                  <span className="text-neutral">
                    {product.warrantyMonths ? `${product.warrantyMonths}-month warranty` : "Manufacturer warranty"}
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <RotateCcw className="size-5 shrink-0 text-primary" />
                <span>
                  <b className="block text-ink">Condition</b>
                  <span className="text-neutral capitalize">{product.condition}</span>
                </span>
              </li>
            </ul>

            {product.description && (
              <section>
                <h2 className="mb-2 text-lg font-bold text-ink">Description</h2>
                <p className="leading-relaxed whitespace-pre-line text-neutral">{product.description}</p>
              </section>
            )}

            {(product.oemNumbers.length > 0 || product.model) && (
              <section>
                <h2 className="mb-2 text-lg font-bold text-ink">Specifications</h2>
                <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border text-sm">
                  {product.model && (
                    <div className="grid grid-cols-3 gap-4 px-4 py-3">
                      <dt className="text-neutral">Model</dt>
                      <dd className="col-span-2 text-ink">{product.model}</dd>
                    </div>
                  )}
                  {product.oemNumbers.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 px-4 py-3">
                      <dt className="text-neutral">OEM / cross-ref</dt>
                      <dd className="col-span-2 font-mono text-ink">{product.oemNumbers.join(", ")}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {product.fitments.length > 0 && (
              <section>
                <h2 className="mb-2 text-lg font-bold text-ink">Compatible vehicles</h2>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-2 text-left text-xs text-neutral">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Make</th>
                        <th className="px-4 py-2.5 font-semibold">Model</th>
                        <th className="px-4 py-2.5 font-semibold">Years</th>
                        <th className="px-4 py-2.5 font-semibold">Engine</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {product.fitments.map((f) => (
                        <tr key={f.id}>
                          <td className="px-4 py-2.5 text-ink">{f.make.name}</td>
                          <td className="px-4 py-2.5 text-ink">{f.model?.name ?? "All models"}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-ink tabular-nums">
                            {f.yearFrom || f.yearTo ? `${f.yearFrom ?? "…"}–${f.yearTo ?? "…"}` : "All"}
                          </td>
                          <td className="px-4 py-2.5 text-neutral">{f.engine ?? "All"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Reviews */}
        <section id="reviews" className="mt-16 scroll-mt-24">
          <SectionHeading title="Customer reviews" />
          {reviews.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-neutral">
              No reviews yet. Bought this part? Review it from <Link href="/account/orders" className="font-semibold text-primary">your orders</Link>.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {reviews.slice(0, 8).map((r) => (
                <article key={r.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-center justify-between gap-3">
                    <StarRatingDisplay rating={r.rating} size="md" />
                    <time className="text-xs text-neutral">{new Date(r.createdAt).toLocaleDateString()}</time>
                  </div>
                  {r.title && <h3 className="mt-3 font-bold text-ink">{r.title}</h3>}
                  <p className="mt-1.5 text-sm text-neutral">{r.body}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink">
                    {r.buyerName} <span className="flex items-center gap-1 text-success"><BadgeCheck className="size-3.5" /> Verified purchase</span>
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        {related.length > 0 && (
          <section className="mt-16">
            <SectionHeading title="You may also need" href={primaryCategory ? `/shop/c/${primaryCategory.slug}` : "/shop"} />
            <ProductGrid products={related} currency={currency} />
          </section>
        )}
      </Container>

      {/* Mobile sticky buy bar */}
      {!soldOut && (
        <div className="sticky bottom-0 z-30 border-t border-border bg-surface/90 p-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Price amount={product.sellingPrice} currency={currency} size="sm" />
            <AddToCartButton productId={product.id} productName={product.name} available={product.quantity} className="size-12" />
          </div>
        </div>
      )}
    </>
  );
}
