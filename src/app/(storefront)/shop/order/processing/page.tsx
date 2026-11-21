import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Loader2, XCircle } from "lucide-react";

import { db } from "@/shared/db";
import { cartItem } from "@/shared/db/schema";
import { Button } from "@/shared/components/ui/button";
import { completeOnlinePayment } from "@/features/storefront/checkout/server/complete";
import { getCartIdentity } from "@/features/storefront/cart/server/identity";
import { cartWhere } from "@/features/storefront/cart/server/queries";
import { Container } from "@/features/storefront/ui/section";

export const metadata = { title: "Confirming payment", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Paystack redirects here with ?reference=…&trxref=… after payment. */
export default async function PaymentProcessingPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string; attempt?: string }>;
}) {
  const sp = await searchParams;
  const reference = sp.reference || sp.trxref;
  if (!reference) redirect("/shop/cart");

  const result = await completeOnlinePayment(reference);

  if (result.ok) {
    // Empty this visitor's cart (the webhook can't see a guest's cookie).
    const where = cartWhere(await getCartIdentity());
    if (where) {
      const c = await db.query.cart.findFirst({ where, columns: { id: true } });
      if (c) await db.delete(cartItem).where(eq(cartItem.cartId, c.id));
    }
    redirect(`/shop/order/${result.saleNumber}?t=${result.accessToken}&new=1`);
  }

  const attempt = Number(sp.attempt ?? 0);
  if (result.retryable && attempt < 5) {
    return (
      <Container className="py-24">
        <meta httpEquiv="refresh" content={`3;url=/shop/order/processing?reference=${encodeURIComponent(reference)}&attempt=${attempt + 1}`} />
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <Loader2 className="size-10 animate-spin text-primary" />
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">Confirming your payment…</h1>
          <p className="mt-2 text-neutral">This usually takes a few seconds. Please don&apos;t close this page.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-24">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <XCircle className="size-12 text-danger" />
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">Payment not completed</h1>
        <p className="mt-2 text-neutral">
          {result.error} Your cart has been kept — you can try again, or contact us if you were charged.
        </p>
        <div className="mt-6 flex gap-2">
          <Button asChild>
            <Link href="/shop/checkout">Try again</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
