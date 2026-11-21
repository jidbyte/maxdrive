import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getCurrentUser } from "@/shared/authz/session";
import { getCustomerByBuyerUid } from "@/features/admin/customers/server/queries";
import { getCartIdentity } from "@/features/storefront/cart/server/identity";
import { getCartView } from "@/features/storefront/cart/server/queries";
import { quoteCart } from "@/features/storefront/checkout/server/quote";
import { CheckoutForm } from "@/features/storefront/ui/checkout-form";
import { Container } from "@/features/storefront/ui/section";

export const metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [cart, user] = await Promise.all([getCartIdentity().then(getCartView), getCurrentUser()]);
  if (cart.lines.length === 0 || cart.hasIssues) redirect("/shop/cart");

  const customer = user ? await getCustomerByBuyerUid(user.authUid) : null;
  const quote = await quoteCart(cart, { fulfilment: "delivery" });
  const initialQuote = quote.deliveryEnabled ? quote : await quoteCart(cart, { fulfilment: "pickup" });

  return (
    <Container className="py-8 sm:py-12">
      <Link href="/shop/cart" className="inline-flex items-center gap-1 text-sm font-semibold text-neutral hover:text-ink">
        <ChevronLeft className="size-4" /> Back to cart
      </Link>
      <h1 className="mt-3 mb-8 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Checkout</h1>
      <CheckoutForm
        lines={cart.lines.filter((l) => !l.issue)}
        initialQuote={initialQuote}
        signedIn={!!user}
        defaults={{
          name: customer?.name ?? user?.name ?? "",
          email: customer?.email ?? user?.email ?? "",
          phone: customer?.phone ?? user?.phone ?? "",
          address: customer?.address ?? "",
          city: customer?.city ?? "",
        }}
      />
    </Container>
  );
}
