"use client";

import { DataList } from "@/shared/components/admin/data-list";
import { formatPrice } from "@/shared/utils/currency";

export type SupplierRow = {
  id: string;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  orders: number;
  spent: number;
  owed: number;
  lastOrder: string | null;
};

export function SuppliersList({ suppliers, currency }: { suppliers: SupplierRow[]; currency: string }) {
  const money = (n: number) => formatPrice(n, currency);
  return (
    <DataList
      rows={suppliers}
      getRowId={(r) => r.id}
      rowHref={(r) => `/admin/suppliers/${r.id}/edit`}
      searchText={(r) => `${r.companyName} ${r.contactName ?? ""} ${r.phone ?? ""} ${r.email ?? ""}`}
      searchPlaceholder="Search supplier, contact, phone"
      defaultSort={{ key: "name", dir: "asc" }}
      filters={[{ key: "owed", label: "We owe", predicate: (r) => r.owed > 0 }]}
      columns={[
        { key: "name", header: "Supplier", cell: (r) => r.companyName, sortValue: (r) => r.companyName.toLowerCase() },
        {
          key: "contact",
          header: "Contact",
          cell: (r) => (
            <span className="text-sm">
              <span className="block text-ink">{r.contactName ?? "—"}</span>
              <span className="text-xs text-neutral">{[r.phone, r.email].filter(Boolean).join(" · ")}</span>
            </span>
          ),
        },
        { key: "orders", header: "POs", align: "right", cell: (r) => <span className="tabular-nums">{r.orders}</span>, sortValue: (r) => r.orders },
        { key: "spent", header: "Received", align: "right", cell: (r) => <span className="tabular-nums">{money(r.spent)}</span>, sortValue: (r) => r.spent },
        { key: "owed", header: "Owed", align: "right", cell: (r) => <span className={r.owed ? "font-bold text-warning tabular-nums" : "text-neutral tabular-nums"}>{money(r.owed)}</span>, sortValue: (r) => r.owed },
      ]}
      mobile={(r) => ({
        title: r.companyName,
        subtitle: [r.contactName, r.phone].filter(Boolean).join(" · ") || r.email || "No contact details",
        value: money(r.spent),
        badge: r.owed ? <span className="text-xs font-semibold text-warning">{money(r.owed)} owed</span> : undefined,
      })}
      empty={{ title: "No suppliers yet", description: "Add the wholesalers and distributors you buy stock from." }}
    />
  );
}
