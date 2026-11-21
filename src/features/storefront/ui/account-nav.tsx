"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutGrid, Package, ShieldCheck } from "lucide-react";

import { cn } from "@/shared/lib/utils";

const LINKS = [
  { href: "/account", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/account/security", label: "Sign-in & security", icon: ShieldCheck },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="lg:w-56 lg:shrink-0">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
        {LINKS.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-full px-4 text-sm font-semibold whitespace-nowrap lg:rounded-xl",
                  active ? "bg-primary-soft text-primary" : "text-neutral hover:bg-surface-2 hover:text-ink",
                )}
              >
                <l.icon className="size-4" /> {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
