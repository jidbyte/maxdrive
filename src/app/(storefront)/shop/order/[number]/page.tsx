import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { getCurrentUser } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { Button } from "@/shared/components/ui/button";
import { getOrderByNumberAndToken, getOrderForBuyer } from "@/features/admin/sales/server/queries";
import { OrderSummary } from "@/features/storefront/ui/order-summary";
import { Container } from "@/features/storefront/ui/section";

export const metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ t?: string; new?: string }>;
}) {
  const { number } = await params;
  const sp = await searchParams;
  const saleNumber = decodeURIComponent(number);

  // Access: the private link token, or the signed-in buyer who placed it.
  let order = sp.t ? await getOrderByNumberAndToken(saleNumber, sp.t) : null;
  if (!order) {
    const user = await getCurrentUser();
    if (user) order = (await getOrderForBuyer(saleNumber, user.authUid)) ?? null;
  }
  if (!order) notFound();

  const settings = await getStoreSettings();
  const isNew = sp.new === "1";

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      {isNew ? (
        <div className="bg-horizon mb-8 rounded-2xl border border-border p-6 text-center sm:p-10">
          <CheckCircle2 className="mx-auto size-12 text-success" />
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink">Thank you, {order.customerName.split(" ")[0]}!</h1>
          <p className="mt-2 text-neutral">
            {order.paymentStatus === "paid"
              ? "Your payment was successful and your order is confirmed."
              : "Your order is reserved. Pay when you collect it at our store."}{" "}
            Bookmark this page to track it.
          </p>
        </div>
      ) : (
        <h1 className="mb-8 text-3xl font-extrabold tracking-tight text-ink">Order details</h1>
      )}
      <OrderSummary order={order} currency={settings.currency} />
      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button asChild>
          <Link href="/shop">Continue shopping</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/contact">Need help with this order?</Link>
        </Button>
      </div>
    </Container>
  );
}
