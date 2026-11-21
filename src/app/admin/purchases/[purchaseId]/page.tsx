import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, SquarePen, Truck } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { PageAction, PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { BackLink, DetailList, Panel } from "@/shared/components/admin/panel";
import { StatusBadge } from "@/shared/components/admin/status-badge";
import { getPurchaseById } from "@/features/admin/purchases/server/queries";
import { PurchaseStatusActions } from "@/features/admin/purchases/client/purchase-status-actions";

export const metadata = { title: "Purchase order" };

const FLOW = [["draft", "Draft"], ["ordered", "Ordered"], ["shipped", "In transit"], ["received", "Received"]] as const;

export default async function PurchaseDetailPage({ params }: { params: Promise<{ purchaseId: string }> }) {
  const { purchaseId } = await params;
  await requireStaffPage("purchases.manage");
  const [s, p] = await Promise.all([getStoreSettings(), getPurchaseById(purchaseId)]);
  if (!p) notFound();

  const money = (n: number) => formatPrice(n, s.currency);
  const date = (d: Date | null) => (d ? d.toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");
  const idx = FLOW.findIndex(([k]) => k === p.purchaseStatus);
  const itemsTotal = p.items.reduce((a, i) => a + i.subtotal, 0);

  return (
    <div className="space-y-6">
      <BackLink href="/admin/purchases">Purchases</BackLink>
      <PageHeader>
        <PageTitle
          icon={Truck}
          description={
            <span className="flex flex-wrap items-center gap-2">
              {p.supplierName}
              <StatusBadge kind="purchase" value={p.purchaseStatus} />
              <StatusBadge kind="payment" value={p.paymentStatus} />
            </span>
          }
        >
          <span className="font-mono">{p.purchaseNumber}</span>
        </PageTitle>
        {p.purchaseStatus === "draft" && (
          <PageAction>
            <Button asChild variant="outline">
              <Link href={`/admin/purchases/${p.id}/edit`}><SquarePen /> Edit</Link>
            </Button>
          </PageAction>
        )}
      </PageHeader>

      <Panel>
        {p.purchaseStatus !== "cancelled" && (
          <ol className="mb-5 grid grid-cols-4 gap-2">
            {FLOW.map(([k, label], i) => (
              <li key={k} className="flex flex-col gap-2">
                <span className={cn("h-1.5 rounded-full", i <= idx ? "bg-primary" : "bg-surface-2")} />
                <span className={cn("flex items-center gap-1 text-xs font-semibold", i <= idx ? "text-ink" : "text-neutral")}>
                  {i <= idx && <Check className="size-3.5 text-primary" />} {label}
                </span>
              </li>
            ))}
          </ol>
        )}
        <PurchaseStatusActions purchaseId={p.id} purchaseStatus={p.purchaseStatus} paymentStatus={p.paymentStatus} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel title="Items">
          <ul className="divide-y divide-border">
            {p.items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="min-w-0">
                  {i.productId ? (
                    <Link href={`/admin/products/${i.productId}`} className="font-semibold text-ink hover:text-primary">{i.productName}</Link>
                  ) : (
                    <span className="font-semibold text-ink">{i.productName}</span>
                  )}
                  <span className="block font-mono text-xs text-neutral">{i.productSku} · {i.quantity} × {money(i.unitCost)}</span>
                </span>
                <span className="font-semibold text-ink tabular-nums">{money(i.subtotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-neutral">Items</dt><dd className="tabular-nums">{money(itemsTotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral">Shipping</dt><dd className="tabular-nums">{money(p.shippingCost)}</dd></div>
            {p.discountAmount > 0 && <div className="flex justify-between text-success"><dt>Discount</dt><dd className="tabular-nums">−{money(p.discountAmount)}</dd></div>}
            <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold text-ink"><dt>Total</dt><dd className="tabular-nums">{money(p.totalAmount)}</dd></div>
          </dl>
        </Panel>

        <Panel title="Details">
          <DetailList
            items={[
              ["Supplier", p.supplierId ? <Link href={`/admin/suppliers/${p.supplierId}/edit`} className="text-primary">{p.supplierName}</Link> : p.supplierName],
              ["Ordered", date(p.purchaseDate)],
              ["Expected", date(p.eta)],
              ["Received", date(p.deliveryDate)],
              ["Supplier phone", p.supplier?.phone],
              ["Supplier email", p.supplier?.email],
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
