import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, CircleSlash, Package } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import type { CatalogProduct } from "@/features/storefront/catalog/server/queries";
import { AddToCartButton } from "./add-to-cart-button";
import { Price } from "./price";

export function ProductCard({
  product,
  currency,
  priority,
}: {
  product: CatalogProduct;
  currency: string;
  priority?: boolean;
}) {
  const soldOut = product.quantity < 1;
  const lowStock = !soldOut && product.quantity <= 3;
  const onSale = !!product.compareAtPrice && product.compareAtPrice > product.sellingPrice;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40">
      <Link
        href={`/shop/p/${product.slug}`}
        className="absolute inset-0 z-10 rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
        aria-label={product.name}
      />
      <div className="relative m-2 aspect-[4/3] overflow-hidden rounded-[18px] bg-surface-2">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-neutral/60">
            <Package className="size-12" strokeWidth={1.2} />
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          {onSale && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
              Sale
            </span>
          )}
          {soldOut && (
            <span className="rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-bold text-surface">
              Sold out
            </span>
          )}
          {lowStock && (
            <span className="rounded-full bg-warning px-2.5 py-1 text-[11px] font-bold text-black">
              Only {product.quantity} left
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-4 pt-1 pb-4">
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold tracking-wide text-neutral uppercase">
          <span className="truncate">{product.brand ?? "MAXDRIVE"}</span>
          {product.partNumber && (
            <span className="hidden truncate font-mono normal-case sm:inline">{product.partNumber}</span>
          )}
        </div>
        <h3 className="line-clamp-2 text-sm leading-snug font-bold text-ink sm:text-[15px]">{product.name}</h3>
        {product.fits !== null && (
          <p
            className={cn(
              "flex items-center gap-1 text-xs font-semibold",
              product.fits ? "text-success" : "text-neutral",
            )}
          >
            {product.fits ? <BadgeCheck className="size-3.5" /> : <CircleSlash className="size-3.5" />}
            {product.fits ? "Fits your vehicle" : "Check fitment"}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <Price amount={product.sellingPrice} compareAt={product.compareAtPrice} currency={currency} size="sm" />
          <div className="relative z-20">
            <AddToCartButton productId={product.id} productName={product.name} available={product.quantity} />
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  currency,
  className,
}: {
  products: CatalogProduct[];
  currency: string;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4", className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} currency={currency} priority={i < 4} />
      ))}
    </div>
  );
}
