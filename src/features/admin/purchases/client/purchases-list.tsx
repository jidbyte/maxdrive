"use client";

import { DataList } from "@/shared/components/admin/data-list";
import { StatusBadge } from "@/shared/components/admin/status-badge";
import { formatPrice } from "@/shared/utils/currency";

export type PurchaseRow = {
  id: string;
  purchaseNumber: string;
  supplierName: string;
  purchaseStatus: string;
  paymentStatus: string;
  totalAmount: number;
  itemCount: number;
  purchaseDate: string;
  eta: string | null;
};

export function PurchasesList({ purchases, currency }: { purchases: PurchaseRow[]; currency: string }) {
  const money = (n: number) => formatPrice(n, currency);
  const d = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return (
    <DataList
      rows={purchases}
      getRowId={(r) => r.id}
      rowHref={(r) => `/admin/purchases/${r.id}`}
      searchText={(r) => `${r.purchaseNumber} ${r.supplierName}`}
      searchPlaceholder="Search PO # or supplier"
      defaultSort={{ key: "date", dir: "desc" }}
      filters={[
        { key: "open", label: "Open", predicate: (r) => ["draft", "ordered", "shipped"].includes(r.purchaseStatus) },
        { key: "transit", label: "In transit", predicate: (r) => r.purchaseStatus === "shipped" },
        { key: "unpaid", label: "Unpaid", predicate: (r) => r.paymentStatus !== "paid" && r.purchaseStatus !== "cancelled" },
        { key: "received", label: "Received", predicate: (r) => r.purchaseStatus === "received" },
      ]}
      columns={[
        { key: "number", header: "PO", cell: (r) => <span className="font-mono">{r.purchaseNumber}</span>, sortValue: (r) => r.purchaseNumber },
        { key: "supplier", header: "Supplier", cell: (r) => <span className="font-medium text-ink">{r.supplierName}</span>, sortValue: (r) => r.supplierName.toLowerCase() },
        { key: "status", header: "Status", cell: (r) => <StatusBadge kind="purchase" value={r.purchaseStatus} /> },
        { key: "payment", header: "Payment", cell: (r) => <StatusBadge kind="payment" value={r.paymentStatus} /> },
        { key: "date", header: "Ordered", cell: (r) => <span className="whitespace-nowrap text-neutral">{d(r.purchaseDate)}</span>, sortValue: (r) => r.purchaseDate },
        { key: "eta", header: "ETA", cell: (r) => <span className="whitespace-nowrap text-neutral">{r.eta ? d(r.eta) : "—"}</span>, sortValue: (r) => r.eta ?? "" },
        { key: "total", header: "Total", align: "right", cell: (r) => <span className="font-bold text-ink tabular-nums">{money(r.totalAmount)}</span>, sortValue: (r) => r.totalAmount },
      ]}
      mobile={(r) => ({
        title: <span><span className="font-mono">{r.purchaseNumber}</span> · {r.supplierName}</span>,
        subtitle: `${d(r.purchaseDate)} · ${r.itemCount} unit${r.itemCount === 1 ? "" : "s"}`,
        value: money(r.totalAmount),
        badge: <StatusBadge kind="purchase" value={r.purchaseStatus} />,
      })}
      empty={{ title: "No purchase orders yet", description: "Create one to restock from a supplier — stock updates when it's received." }}
    />
  );
}
