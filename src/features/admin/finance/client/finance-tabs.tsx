"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/shared/lib/utils";

const TABS = [
  { href: "/admin/finance", label: "Overview" },
  { href: "/admin/finance/income", label: "Income" },
  { href: "/admin/finance/expenses", label: "Expenses" },
  { href: "/admin/finance/invoices", label: "Invoices" },
  { href: "/admin/finance/coupons", label: "Coupons" },
];

export function FinanceTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Finance" className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3.5 pb-3 text-sm font-semibold transition-colors",
              active ? "border-primary text-ink" : "border-transparent text-neutral hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
