"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarClock, Settings2, ShoppingCart, Users } from "lucide-react";

import { cn } from "@/shared/lib/utils";

const SECTIONS = [
  { href: "/admin/settings/general", label: "General", icon: Settings2 },
  { href: "/admin/settings/commerce", label: "Store & checkout", icon: ShoppingCart },
  { href: "/admin/settings/workshop", label: "Workshop & bookings", icon: CalendarClock },
  { href: "/admin/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings/team", label: "Team & roles", icon: Users },
] as const;

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="lg:w-56 lg:shrink-0">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:px-0 lg:pb-0">
        {SECTIONS.map((s) => {
          const active = pathname === s.href;
          return (
            <li key={s.href} className="shrink-0">
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors lg:rounded-xl",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-neutral hover:bg-surface-2 hover:text-ink",
                )}
              >
                <s.icon className="size-4" />
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
