import Link from "next/link";
import { Package } from "lucide-react";

import { getCurrentUser } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { listOrdersForBuyer } from "@/features/admin/sales/server/queries";
import { getCustomerByBuyerUid } from "@/features/admin/customers/server/queries";
import { getReviewsByBuyerForProducts } from "@/features/admin/reviews/server/queries";
import { OrderItemReviewButton } from "@/features/admin/reviews/client/order-item-review-button";

export const metadata = { title: "Orders" };

export default async function AccountOrdersPage() {
  const user = (await getCurrentUser())!;
  const [settings, customer] = await Promise.all([getStoreSettings(), getCustomerByBuyerUid(user.authUid)]);
  const orders = await listOrdersForBuyer(user.authUid, customer?.id);
  const productIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.productId).filter((x): x is string => !!x)))];
  const reviews = await getReviewsByBuyerForProducts(user.authUid, productIds);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <Package className="size-10 text-neutral" />
        <p className="mt-4 text-lg font-bold text-ink">No orders yet</p>
        <p className="mt-1 text-sm text-neutral">Orders you place while signed in will show up here.</p>
        <Button asChild className="mt-6">
          <Link href="/shop">Browse parts</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {orders.map((o) => (
        <li key={o.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={`/shop/order/${o.saleNumber}`} className="font-mono font-bold text-ink hover:text-primary">
                {o.saleNumber}
              </Link>
              <p className="text-xs text-neutral">{o.createdAt.toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-bold capitalize",
                  o.status === "completed" ? "bg-success/12 text-success" : o.status === "cancelled" ? "bg-danger/12 text-danger" : "bg-primary-soft text-primary",
                )}
              >
                {o.status}
              </span>
              <span className="font-extrabold text-ink tabular-nums">{formatPrice(o.totalAmount, settings.currency)}</span>
            </div>
          </div>
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {o.items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  {i.product ? (
                    <Link href={`/shop/p/${i.product.slug}`} className="line-clamp-1 font-semibold text-ink hover:text-primary">
                      {i.productName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-ink">{i.productName}</span>
                  )}
                  <span className="text-xs text-neutral">Qty {i.quantity}</span>
                </span>
                {i.productId && o.paymentStatus === "paid" && o.status !== "cancelled" && (
                  <OrderItemReviewButton
                    productId={i.productId}
                    productName={i.productName}
                    existingReview={(() => {
                      const r = reviews.get(i.productId);
                      return r ? { rating: r.rating, title: r.title ?? "", body: r.body } : undefined;
                    })()}
                  />
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
