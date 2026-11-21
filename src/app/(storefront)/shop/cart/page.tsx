import Link from "next/link";
import { ArrowRight, Lock, ShoppingCart, Truck } from "lucide-react";

import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { Button } from "@/shared/components/ui/button";
import { Message } from "@/shared/components/common/message";
import { getCartIdentity } from "@/features/storefront/cart/server/identity";
import { getCartView } from "@/features/storefront/cart/server/queries";
import { getLatestProducts } from "@/features/storefront/catalog/server/queries";
import { CartLines } from "@/features/storefront/ui/cart-lines";
import { ProductGrid } from "@/features/storefront/ui/product-card";
import { Container, SectionHeading } from "@/features/storefront/ui/section";

export const metadata = { title: "Your cart", robots: { index: false } };

export default async function CartPage() {
  const [settings, cart] = await Promise.all([getStoreSettings(), getCartIdentity().then(getCartView)]);
  const currency = settings.currency;

  if (cart.lines.length === 0) {
    const suggestions = await getLatestProducts(4);
    return (
      <Container className="py-12 sm:py-16">
        <div className="bg-horizon mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-border px-6 py-16 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-primary-soft text-primary">
            <ShoppingCart className="size-7" />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">Your cart is empty</h1>
          <p className="mt-2 text-neutral">Find the right part for your vehicle in seconds.</p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/shop">
              Start shopping <ArrowRight />
            </Link>
          </Button>
        </div>
        {suggestions.length > 0 && (
          <section className="mt-16">
            <SectionHeading title="New arrivals" href="/shop" />
            <ProductGrid products={suggestions} currency={currency} />
          </section>
        )}
      </Container>
    );
  }

  const threshold = settings.deliveryEnabled ? settings.freeDeliveryThreshold : null;
  const remaining = threshold ? Math.max(0, threshold - cart.subtotal) : null;

  return (
    <Container className="py-8 sm:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Your cart</h1>
      <p className="mt-1 text-neutral">
        {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="rounded-xl border border-border bg-card px-5 shadow-card sm:px-6">
          {cart.hasIssues && (
            <Message variant="warning" className="mt-5">
              Some items changed since you added them. Adjust or remove them to continue.
            </Message>
          )}
          <CartLines lines={cart.lines} currency={currency} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          {remaining !== null && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Truck className="size-4 text-primary" />
                {remaining > 0
                  ? `Add ${formatPrice(remaining, currency)} more for free delivery`
                  : "You've unlocked free delivery 🎉"}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${Math.min(100, (cart.subtotal / (threshold || 1)) * 100)}%` }}
                />
              </div>
            </div>
          )}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral">Subtotal</dt>
                <dd className="font-semibold text-ink tabular-nums">{formatPrice(cart.subtotal, currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral">Delivery</dt>
                <dd className="text-neutral">Calculated at checkout</dd>
              </div>
            </dl>
            <Button asChild size="lg" className="mt-6 w-full" disabled={cart.hasIssues}>
              <Link href={cart.hasIssues ? "#" : "/shop/checkout"} aria-disabled={cart.hasIssues}>
                <Lock /> Secure checkout
              </Link>
            </Button>
            <Button asChild variant="ghost" className="mt-2 w-full">
              <Link href="/shop">Continue shopping</Link>
            </Button>
          </div>
        </aside>
      </div>
    </Container>
  );
}
