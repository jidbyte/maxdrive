"use client";

import { Badge } from "@/shared/components/ui/badge";
import { DataList } from "@/shared/components/admin/data-list";
import { formatPrice } from "@/shared/utils/currency";

export type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  customerType: string;
  hasAccount: boolean;
  orders: number;
  spent: number;
  lastOrder: string | null;
};

export function CustomersList({ customers, currency }: { customers: CustomerRow[]; currency: string }) {
  const money = (n: number) => formatPrice(n, currency);
  const d = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
  return (
    <DataList
      rows={customers}
      getRowId={(r) => r.id}
      rowHref={(r) => `/admin/customers/${r.id}`}
      searchText={(r) => `${r.name} ${r.email ?? ""} ${r.phone ?? ""} ${r.city ?? ""}`}
      searchPlaceholder="Search name, phone, email or city"
      defaultSort={{ key: "spent", dir: "desc" }}
      filters={[
        { key: "repeat", label: "Repeat", predicate: (r) => r.orders > 1 },
        { key: "business", label: "Business", predicate: (r) => r.customerType === "business" },
        { key: "account", label: "Has account", predicate: (r) => r.hasAccount },
      ]}
      columns={[
        {
          key: "name",
          header: "Customer",
          cell: (r) => (
            <span>
              <span className="block">{r.name}</span>
              <span className="mt-0.5 flex gap-1">
                {r.customerType === "business" && <Badge variant="secondary">Business</Badge>}
                {r.hasAccount && <Badge variant="outline">Account</Badge>}
              </span>
            </span>
          ),
          sortValue: (r) => r.name.toLowerCase(),
        },
        {
          key: "contact",
          header: "Contact",
          cell: (r) => (
            <span className="text-sm">
              <span className="block text-ink">{r.phone ?? "—"}</span>
              <span className="text-xs text-neutral">{r.email}</span>
            </span>
          ),
        },
        { key: "city", header: "City", cell: (r) => <span className="text-neutral">{r.city ?? "—"}</span> },
        { key: "orders", header: "Orders", align: "right", cell: (r) => <span className="tabular-nums">{r.orders}</span>, sortValue: (r) => r.orders },
        { key: "last", header: "Last order", cell: (r) => <span className="whitespace-nowrap text-neutral">{d(r.lastOrder)}</span>, sortValue: (r) => r.lastOrder ?? "" },
        { key: "spent", header: "Spent", align: "right", cell: (r) => <span className="font-bold text-ink tabular-nums">{money(r.spent)}</span>, sortValue: (r) => r.spent },
      ]}
      mobile={(r) => ({
        title: r.name,
        subtitle: [r.phone, r.city].filter(Boolean).join(" · ") || r.email || "No contact details",
        value: money(r.spent),
        badge: <span className="text-xs text-neutral">{r.orders} order{r.orders === 1 ? "" : "s"}</span>,
      })}
      empty={{ title: "No customers yet", description: "Customers are added automatically at checkout and when booking, or add one manually." }}
    />
  );
}
