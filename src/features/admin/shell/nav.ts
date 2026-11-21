import type { PermissionKey } from "@/shared/db/schema/users";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: string; // key into ICONS in admin-shell.tsx
  permission?: PermissionKey;
  exact?: boolean;
};

export type AdminNavGroup = { label: string | null; items: AdminNavItem[] };

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: null,
    items: [
      { href: "/admin", label: "Overview", icon: "home", exact: true },
      { href: "/admin/products", label: "Products", icon: "box", permission: "products.read" },
      { href: "/admin/inventory", label: "Inventory", icon: "boxes", permission: "products.read" },
      { href: "/admin/orders", label: "Orders", icon: "bag", permission: "orders.read" },
      { href: "/admin/customers", label: "Customers", icon: "users", permission: "customers.manage" },
    ],
  },
  // {
  //   label: "Workshop",
  //   items: [
  //     { href: "/admin/bookings", label: "Bookings", icon: "calendar", permission: "bookings.manage" },
  //     { href: "/admin/services", label: "Services", icon: "wrench", permission: "services.manage" },
  //   ],
  // },
  {
    label: "Supply",
    items: [
      { href: "/admin/purchases", label: "Purchases", icon: "truck", permission: "purchases.manage" },
      { href: "/admin/suppliers", label: "Suppliers", icon: "factory", permission: "suppliers.manage" },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/admin/finance", label: "Finance", icon: "wallet", permission: "finance.view" },
      { href: "/admin/reports", label: "Reports", icon: "chart", permission: "reports.view" },
      { href: "/admin/analytics", label: "Analytics", icon: "trend", permission: "reports.view" },
      { href: "/admin/reviews", label: "Reviews", icon: "star", permission: "reviews.moderate" },
    ],
  },
];

export function visibleNav(permissions: ReadonlySet<string>): AdminNavGroup[] {
  return ADMIN_NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.permission || permissions.has(i.permission)),
  })).filter((g) => g.items.length > 0);
}
