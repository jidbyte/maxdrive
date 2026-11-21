"use client";

import { DataList } from "@/shared/components/admin/data-list";
import { StatusBadge } from "@/shared/components/admin/status-badge";
import { formatPrice } from "@/shared/utils/currency";

export type OrderRow = {
  id: string;
  saleNumber: string;
  customerName: string;
  customerPhone: string | null;
  channel: string;
  fulfilment: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  balance: number;
  itemCount: number;
  saleDate: string;
};

const FULFIL_LABEL: Record<string, string> = { delivery: "Delivery", pickup: "Pickup", workshop: "Workshop" };

export function OrdersList({ orders, currency }: { orders: OrderRow[]; currency: string }) {
  const money = (n: number) => formatPrice(n, currency);
  return (
    <DataList
      rows={orders}
      getRowId={(r) => r.id}
      rowHref={(r) => `/admin/orders/${r.id}`}
      searchText={(r) => `${r.saleNumber} ${r.customerName} ${r.customerPhone ?? ""}`}
      searchPlaceholder="Search order #, customer or phone"
      defaultSort={{ key: "date", dir: "desc" }}
      filters={[
        { key: "fulfil", label: "To fulfil", predicate: (r) => ["processing", "ready", "shipped"].includes(r.status) },
        { key: "unpaid", label: "Unpaid", predicate: (r) => ["pending", "partial", "overdue"].includes(r.paymentStatus) && r.status !== "cancelled" },
        { key: "online", label: "Online", predicate: (r) => r.channel === "online" },
        { key: "walkin", label: "Walk-in", predicate: (r) => r.channel === "walk_in" },
        { key: "closed", label: "Cancelled", predicate: (r) => r.status === "cancelled" || r.status === "refunded" },
      ]}
      columns={[
        { key: "number", header: "Order", cell: (r) => <span className="font-mono">{r.saleNumber}</span>, sortValue: (r) => r.saleNumber },
        {
          key: "customer",
          header: "Customer",
          cell: (r) => (
            <span>
              <span className="block font-medium text-ink">{r.customerName}</span>
              {r.customerPhone && <span className="text-xs text-neutral">{r.customerPhone}</span>}
            </span>
          ),
          sortValue: (r) => r.customerName.toLowerCase(),
        },
        {
          key: "channel",
          header: "Channel",
          cell: (r) => (
            <span className="flex flex-col items-start gap-1">
              <StatusBadge kind="channel" value={r.channel} />
              <span className="text-xs text-neutral">{FULFIL_LABEL[r.fulfilment] ?? r.fulfilment}</span>
            </span>
          ),
        },
        { key: "status", header: "Status", cell: (r) => <StatusBadge kind="order" value={r.status} /> },
        { key: "payment", header: "Payment", cell: (r) => <StatusBadge kind="payment" value={r.paymentStatus} /> },
        { key: "date", header: "Date", cell: (r) => <span className="whitespace-nowrap text-neutral">{new Date(r.saleDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>, sortValue: (r) => r.saleDate },
        {
          key: "total",
          header: "Total",
          align: "right",
          cell: (r) => (
            <span className="tabular-nums">
              <span className="block font-bold text-ink">{money(r.totalAmount)}</span>
              {r.balance > 0 && r.status !== "cancelled" && <span className="text-xs text-warning">{money(r.balance)} due</span>}
            </span>
          ),
          sortValue: (r) => r.totalAmount,
        },
      ]}
      mobile={(r) => ({
        title: (
          <span>
            <span className="font-mono">{r.saleNumber}</span> · {r.customerName}
          </span>
        ),
        subtitle: `${new Date(r.saleDate).toLocaleDateString()} · ${r.itemCount} item${r.itemCount === 1 ? "" : "s"} · ${FULFIL_LABEL[r.fulfilment] ?? r.fulfilment}`,
        value: money(r.totalAmount),
        badge: <StatusBadge kind="order" value={r.status} />,
        footer: <StatusBadge kind="payment" value={r.paymentStatus} />,
      })}
      empty={{ title: "No orders yet", description: "Online orders and walk-in sales will appear here." }}
    />
  );
}
