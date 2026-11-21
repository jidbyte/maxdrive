import Image from "next/image";
import Link from "next/link";
import { Check, Package } from "lucide-react";

import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";

type Order = {
  saleNumber: string;
  status: string;
  paymentStatus: string;
  fulfilment: string;
  createdAt: Date;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  taxAmount: number;
  totalAmount: number;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    subtotal: number;
    product: { slug: string; images: { url: string; isPrimary: boolean }[] } | null;
  }>;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Order received",
  processing: "Preparing your order",
  ready: "Ready for pickup",
  shipped: "On its way",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

function steps(o: Order) {
  const flow =
    o.fulfilment === "delivery"
      ? ["pending", "processing", "shipped", "completed"]
      : ["pending", "processing", "ready", "completed"];
  const idx = Math.max(0, flow.indexOf(o.status));
  return flow.map((s, i) => ({ key: s, label: STATUS_LABEL[s], done: i <= idx }));
}

export function OrderSummary({ order, currency }: { order: Order; currency: string }) {
  const fmt = (n: number) => formatPrice(n, currency);
  const closed = order.status === "cancelled" || order.status === "refunded";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-neutral uppercase">Order</p>
            <p className="font-mono text-lg font-bold text-ink">{order.saleNumber}</p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              order.paymentStatus === "paid" ? "bg-success/12 text-success" : "bg-warning/15 text-warning",
            )}
          >
            {order.paymentStatus === "paid" ? "Paid" : order.paymentStatus === "pending" ? "Payment pending" : order.paymentStatus}
          </span>
        </div>

        {closed ? (
          <p className="mt-6 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
            This order was {order.status}.
          </p>
        ) : (
          <ol className="mt-6 grid grid-cols-4 gap-2">
            {steps(order).map((s) => (
              <li key={s.key} className="flex flex-col gap-2">
                <span className={cn("h-1.5 rounded-full", s.done ? "bg-primary" : "bg-surface-2")} />
                <span className={cn("flex items-center gap-1 text-[11px] font-semibold sm:text-xs", s.done ? "text-ink" : "text-neutral")}>
                  {s.done && <Check className="hidden size-3.5 text-primary sm:inline" />}
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="font-bold text-ink">{order.fulfilment === "delivery" ? "Delivery to" : "Store pickup"}</h2>
          <p className="mt-2 text-sm text-neutral">
            {order.customerName}
            <br />
            {order.fulfilment === "delivery"
              ? [order.deliveryAddress, order.deliveryCity].filter(Boolean).join(", ")
              : "We'll notify you when it's ready to collect."}
            <br />
            {order.customerPhone}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="font-bold text-ink">Placed</h2>
          <p className="mt-2 text-sm text-neutral">
            {order.createdAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            <br />
            Confirmation sent to {order.customerEmail ?? "your email"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
        <ul className="divide-y divide-border">
          {order.items.map((i) => {
            const img = i.product?.images.find((x) => x.isPrimary)?.url ?? i.product?.images[0]?.url;
            return (
              <li key={i.id} className="flex items-center gap-4 py-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {img ? <Image src={img} alt="" fill sizes="56px" className="object-cover" /> : <Package className="absolute inset-0 m-auto size-5 text-neutral" />}
                </span>
                <span className="min-w-0 flex-1">
                  {i.product ? (
                    <Link href={`/shop/p/${i.product.slug}`} className="line-clamp-2 text-sm font-semibold text-ink hover:text-primary">
                      {i.productName}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-ink">{i.productName}</span>
                  )}
                  <span className="text-xs text-neutral">Qty {i.quantity}</span>
                </span>
                <span className="text-sm font-semibold text-ink tabular-nums">{fmt(i.subtotal)}</span>
              </li>
            );
          })}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-neutral">Subtotal</dt><dd className="tabular-nums">{fmt(order.subtotal)}</dd></div>
          {order.discountAmount > 0 && <div className="flex justify-between text-success"><dt>Discount</dt><dd className="tabular-nums">−{fmt(order.discountAmount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-neutral">{order.fulfilment === "delivery" ? "Delivery" : "Pickup"}</dt><dd className="tabular-nums">{order.deliveryFee ? fmt(order.deliveryFee) : "Free"}</dd></div>
          {order.taxAmount > 0 && <div className="flex justify-between text-neutral"><dt>Tax</dt><dd className="tabular-nums">{fmt(order.taxAmount)}</dd></div>}
          <div className="flex justify-between border-t border-border pt-3 text-base font-extrabold text-ink"><dt>Total</dt><dd className="tabular-nums">{fmt(order.totalAmount)}</dd></div>
        </dl>
      </div>
    </div>
  );
}
