import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Check, ExternalLink, FileText, Mail, MapPin, Phone, ShoppingBag, SquarePen } from "lucide-react";

import { db } from "@/shared/db";
import { invoice } from "@/shared/db/schema";
import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { formatInZone } from "@/shared/lib/zoned-time";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { PageAction, PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { BackLink, Panel } from "@/shared/components/admin/panel";
import { StatusBadge } from "@/shared/components/admin/status-badge";
import { Message } from "@/shared/components/common/message";
import { getSaleById } from "@/features/admin/sales/server/queries";
import { CreateInvoiceButton, FulfilmentActions, PaymentEditor } from "@/features/admin/sales/client/order-actions";

export const metadata = { title: "Order" };

function flow(fulfilment: string) {
  return fulfilment === "delivery"
    ? [["pending", "Placed"], ["processing", "Processing"], ["shipped", "Shipped"], ["completed", "Delivered"]]
    : [["pending", "Placed"], ["processing", "Processing"], ["ready", "Ready"], ["completed", "Collected"]];
}

export default async function OrderDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = await params;
  const staff = await requireStaffPage("orders.read");
  const [s, o, inv] = await Promise.all([
    getStoreSettings(),
    getSaleById(saleId),
    db.query.invoice.findFirst({ where: eq(invoice.saleId, saleId), columns: { id: true, invoiceNumber: true, status: true } }),
  ]);
  if (!o) notFound();

  const money = (n: number) => formatPrice(n, s.currency);
  const canManage = staff.permissions.has("orders.manage");
  const closed = o.status === "cancelled" || o.status === "refunded";
  const steps = flow(o.fulfilment);
  const idx = steps.findIndex(([k]) => k === o.status);
  const shortfall = o.notes?.includes("STOCK SHORTFALL");

  return (
    <div className="space-y-6">
      <BackLink href="/admin/orders">Orders</BackLink>
      <PageHeader>
        <PageTitle
          icon={ShoppingBag}
          description={
            <span className="flex flex-wrap items-center gap-2">
              {formatInZone(o.createdAt, s.timezone, { dateStyle: "medium", timeStyle: "short" })}
              <StatusBadge kind="channel" value={o.channel} />
              <StatusBadge kind="order" value={o.status} />
              <StatusBadge kind="payment" value={o.paymentStatus} />
            </span>
          }
        >
          <span className="font-mono">{o.saleNumber}</span>
        </PageTitle>
        <PageAction>
          {o.channel === "online" && o.accessToken && (
            <Button asChild variant="ghost">
              <Link href={`/shop/order/${o.saleNumber}?t=${o.accessToken}`} target="_blank">
                <ExternalLink /> Customer view
              </Link>
            </Button>
          )}
          {canManage && !closed && (
            <Button asChild variant="outline">
              <Link href={`/admin/orders/${o.id}/edit`}>
                <SquarePen /> Edit
              </Link>
            </Button>
          )}
        </PageAction>
      </PageHeader>

      {shortfall && (
        <Message variant="warning">
          Stock ran out between checkout and payment for this order. Check availability before fulfilling, or refund the customer.
        </Message>
      )}

      {!closed && (
        <Panel title="Fulfilment">
          <ol className="mb-5 grid grid-cols-4 gap-2">
            {steps.map(([k, label], i) => (
              <li key={k} className="flex flex-col gap-2">
                <span className={cn("h-1.5 rounded-full", i <= idx ? "bg-primary" : "bg-surface-2")} />
                <span className={cn("flex items-center gap-1 text-xs font-semibold", i <= idx ? "text-ink" : "text-neutral")}>
                  {i <= idx && <Check className="size-3.5 text-primary" />} {label}
                </span>
              </li>
            ))}
          </ol>
          {canManage && <FulfilmentActions saleId={o.id} status={o.status} fulfilment={o.fulfilment} />}
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Panel title={`Items (${o.items.reduce((a, i) => a + i.quantity, 0)})`} bodyClassName="-mx-1">
            <ul className="divide-y divide-border">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-4 px-1 py-3 text-sm">
                  <span className="min-w-0">
                    {i.productId ? (
                      <Link href={`/admin/products/${i.productId}`} className="font-semibold text-ink hover:text-primary">{i.productName}</Link>
                    ) : (
                      <span className="font-semibold text-ink">{i.productName}</span>
                    )}
                    <span className="block font-mono text-xs text-neutral">
                      {i.productSku} · {i.quantity} × {money(i.unitPrice)}
                    </span>
                  </span>
                  <span className="font-semibold text-ink tabular-nums">{money(i.subtotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-border px-1 pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-neutral">Subtotal</dt><dd className="tabular-nums">{money(o.subtotal)}</dd></div>
              {o.discountAmount > 0 && <div className="flex justify-between text-success"><dt>Discount</dt><dd className="tabular-nums">−{money(o.discountAmount)}</dd></div>}
              {o.deliveryFee > 0 && <div className="flex justify-between"><dt className="text-neutral">Delivery</dt><dd className="tabular-nums">{money(o.deliveryFee)}</dd></div>}
              {o.taxAmount > 0 && <div className="flex justify-between text-neutral"><dt>Tax</dt><dd className="tabular-nums">{money(o.taxAmount)}</dd></div>}
              <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold text-ink"><dt>Total</dt><dd className="tabular-nums">{money(o.totalAmount)}</dd></div>
              {o.balance > 0 && !closed && <div className="flex justify-between font-semibold text-warning"><dt>Balance due</dt><dd className="tabular-nums">{money(o.balance)}</dd></div>}
            </dl>
          </Panel>

          {canManage && !closed && (
            <Panel title="Payment" description={o.paymentMethod ? `Method: ${o.paymentMethod.replace("_", " ")}` : undefined}>
              <PaymentEditor saleId={o.id} paymentStatus={o.paymentStatus} balance={o.balance} />
            </Panel>
          )}

          {o.notes && (
            <Panel title="Notes">
              <p className="text-sm whitespace-pre-line text-ink">{o.notes}</p>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <p className="font-bold text-ink">{o.customerName}</p>
            <div className="mt-3 space-y-2 text-sm">
              {o.customerPhone && <a href={`tel:${o.customerPhone}`} className="flex items-center gap-2 text-ink hover:text-primary"><Phone className="size-4 text-neutral" /> {o.customerPhone}</a>}
              {o.customerEmail && <a href={`mailto:${o.customerEmail}`} className="flex items-center gap-2 text-ink hover:text-primary"><Mail className="size-4 text-neutral" /> {o.customerEmail}</a>}
            </div>
            {o.customerId && (
              <Button asChild variant="ghost" size="sm" className="mt-3 -ml-3">
                <Link href={`/admin/customers/${o.customerId}`}>View customer →</Link>
              </Button>
            )}
          </Panel>

          <Panel title={o.fulfilment === "delivery" ? "Delivery" : o.fulfilment === "workshop" ? "Workshop" : "Store pickup"}>
            {o.fulfilment === "delivery" ? (
              <p className="flex gap-2 text-sm text-ink">
                <MapPin className="mt-0.5 size-4 shrink-0 text-neutral" />
                {[o.deliveryAddress, o.deliveryCity].filter(Boolean).join(", ") || "No address"}
              </p>
            ) : (
              <p className="text-sm text-neutral">Customer collects from the store.</p>
            )}
          </Panel>

          <Panel title="Invoice">
            {inv ? (
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm">
                  <FileText className="size-4 text-neutral" />
                  <span className="font-mono text-ink">{inv.invoiceNumber}</span>
                  <StatusBadge kind="invoice" value={inv.status} />
                </span>
                <Button asChild variant="ghost" size="sm"><Link href="/admin/finance/invoices">Open</Link></Button>
              </div>
            ) : staff.permissions.has("finance.manage") && !closed ? (
              <CreateInvoiceButton saleId={o.id} />
            ) : (
              <p className="text-sm text-neutral">No invoice.</p>
            )}
          </Panel>

          {o.paystackReference && (
            <Panel title="Paystack">
              <p className="font-mono text-xs break-all text-neutral">{o.paystackReference}</p>
              {o.paidAt && <p className="mt-1 text-xs text-neutral">Paid {formatInZone(o.paidAt, s.timezone, { dateStyle: "medium", timeStyle: "short" })}</p>}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
