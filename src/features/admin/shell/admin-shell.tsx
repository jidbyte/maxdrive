"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLocalStorageFlag } from "@/shared/hooks/use-mounted";
import {
  BarChart3,
  CalendarDays,
  Box,
  Boxes,
  ChevronsLeft,
  Factory,
  Home,
  Mail,
  Menu,
  Settings,
  ShoppingBag,
  Star,
  Store,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Logo, LogoMark } from "@/shared/components/app/logo";
import { ThemeToggle } from "@/shared/components/app/theme-toggle";
import { UserMenu, type MenuUser } from "@/shared/components/app/user-menu";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/shared/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import type { AdminNavGroup } from "./nav";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  bag: ShoppingBag,
  box: Box,
  boxes: Boxes,
  users: Users,
  truck: Truck,
  factory: Factory,
  wallet: Wallet,
  chart: BarChart3,
  trend: TrendingUp,
  star: Star,
  calendar: CalendarDays,
  wrench: Wrench,
};

const COLLAPSE_KEY = "md-admin-sidebar-collapsed";

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({
  nav,
  collapsed,
  onNavigate,
  badges,
}: {
  nav: AdminNavGroup[];
  collapsed: boolean;
  onNavigate?: () => void;
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Admin">
      {nav.map((group, gi) => (
        <div key={gi} className={cn("flex flex-col gap-0.5", gi > 0 && "mt-4")}>
          {group.label && !collapsed && (
            <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-widest text-neutral uppercase">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const Icon = ICONS[item.icon] ?? Home;
            const active = isActive(pathname, item.href, item.exact);
            const badge = badges?.[item.href];
            const link = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                  active ? "bg-primary-soft text-primary" : "text-neutral hover:bg-surface-2 hover:text-ink",
                  collapsed && "justify-center px-0",
                )}
              >
                <Icon className="size-4.5 shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && !!badge && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                    {badge}
                  </span>
                )}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Icon-only header link with tooltip, active state and optional count badge. */
function HeaderIconLink({
  href,
  label,
  icon: Icon,
  badge,
  className,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  className?: string;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className={cn("relative", active && "bg-primary-soft text-primary hover:text-primary", className)}
        >
          <Link
            href={href}
            aria-label={badge ? `${label} (${badge} unread)` : label}
            aria-current={active ? "page" : undefined}
          >
            <Icon />
            {!!badge && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-primary-foreground ring-2 ring-surface">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function AdminShell({
  user,
  nav,
  badges,
  canManageSettings = false,
  children,
}: {
  user: MenuUser;
  nav: AdminNavGroup[];
  badges?: Record<string, number>;
  canManageSettings?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useLocalStorageFlag(COLLAPSE_KEY);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleCollapsed() {
    setCollapsed(!collapsed);
  }

  return (
    <div className="flex min-h-dvh bg-surface">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className={cn("flex h-16 items-center px-5", collapsed && "justify-center px-0")}>
          <Link href="/admin" aria-label="MAXDRIVE admin">
            {collapsed ? <LogoMark size={30} /> : <Logo height={30} />}
          </Link>
        </div>
        <NavList nav={nav} collapsed={collapsed} badges={badges} />
        <div className={cn("border-t border-border p-3", collapsed && "flex justify-center")}>
          <button
            onClick={toggleCollapsed}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-neutral hover:bg-surface-2 hover:text-ink",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronsLeft className={cn("size-[18px] transition-transform", collapsed && "rotate-180")} />
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[84%] max-w-xs gap-0 p-0">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <div className="flex h-16 items-center px-5">
            <Logo height={28} />
          </div>
          <NavList nav={nav} collapsed={false} badges={badges} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Dashboard header */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-1 border-b border-border bg-surface/80 px-4 backdrop-blur-xl sm:gap-2 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>
          <Link href="/admin" className="lg:hidden" aria-label="MAXDRIVE admin">
            <Logo height={26} />
          </Link>
          <div className="flex-1" />

          {/* View storefront: outline button on lg+, icon below lg */}
          <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex">
            <Link href="/shop">
              <Store /> View storefront
            </Link>
          </Button>
          <HeaderIconLink href="/" label="View storefront" icon={Store} className="lg:hidden" />

          <HeaderIconLink href="/admin/messages" label="Messages" icon={Mail} badge={badges?.["/admin/messages"]} />
          {canManageSettings && <HeaderIconLink href="/admin/settings" label="Settings" icon={Settings} />}

          <ThemeToggle />
          <UserMenu user={user} />
        </header>
        <main className="mx-auto w-full max-w-350 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
