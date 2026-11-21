"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Car, Menu, Search, ShoppingCart, UserRound } from "lucide-react";

import { Logo } from "@/shared/components/app/logo";
import { ThemeToggle } from "@/shared/components/app/theme-toggle";
import { UserMenu, type MenuUser } from "@/shared/components/app/user-menu";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/shared/components/ui/sheet";
import { cn } from "@/shared/lib/utils";
import { SearchDialog, SearchTrigger } from "./search-dialog";

export const NAV = [
  { href: "/shop", label: "Shop parts" },
  // { href: "/services", label: "Services" },
  // { href: "/services/book", label: "Book a service" },
  { href: "/contact", label: "Contact" },
  { href: "/track", label: "Track order" },
];

export function SiteHeaderClient({
  user,
  cartCount,
  vehicleLabel,
  currency,
  announcement,
}: {
  user: MenuUser | null;
  cartCount: number;
  vehicleLabel: string | null;
  currency: string;
  announcement: string | null;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Longest matching nav item wins (so /services/book doesn't also light up /services).
  const activeHref = NAV.map((n) => n.href)
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <>
      {announcement && (
        <div className="bg-primary-soft px-4 py-2 text-center text-xs font-medium text-ink sm:text-[13px]">
          {announcement}
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:h-18 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 lg:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </Button>

          <Link href="/" aria-label="MAXDRIVE home" className="-mb-2 shrink-0">
            <Logo height={30} />
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:ml-12 lg:flex" aria-label="Main">
            {NAV.map((n) => {
              const active = n.href === activeHref;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                    active ? "text-ink" : "text-neutral hover:text-ink",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto hidden max-w-sm flex-1 md:block">
            <SearchTrigger currency={currency} />
          </div>

          <div className="ml-auto flex items-center gap-0.5 md:ml-0">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <Search />
            </Button>

            <ThemeToggle className="hidden sm:inline-flex" />

            <Button asChild variant="ghost" size="icon" className="relative" aria-label={`Cart, ${cartCount} items`}>
              <Link href="/shop/cart">
                <ShoppingCart />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] leading-5 font-bold text-primary-foreground">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>
            </Button>

            {user ? (
              <div className="px-1">
                <UserMenu user={user} />
              </div>
            ) : (
              <Button asChild variant="ghost" size="icon" aria-label="Sign in">
                <Link href={`/sign-in?next=${encodeURIComponent(pathname)}`}>
                  <UserRound />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} currency={currency} />

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[86%] max-w-sm gap-0 p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="flex h-16 items-center px-5">
            <Logo height={28} />
          </div>
          <nav className="flex flex-col gap-1 px-3" aria-label="Mobile">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMenuOpen(false)}
                className="flex h-12 items-center rounded-2xl px-4 text-base font-semibold text-ink hover:bg-surface-2"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          {vehicleLabel && (
            <Link
              href="/shop?fits=1"
              onClick={() => setMenuOpen(false)}
              className="mx-3 mt-4 flex items-center gap-3 rounded-2xl bg-primary-soft px-4 py-3 text-sm"
            >
              <Car className="size-5 text-primary" />
              <span>
                <span className="block text-xs text-neutral">Shopping for</span>
                <span className="font-bold text-ink">{vehicleLabel}</span>
              </span>
            </Link>
          )}
          <div className="mt-auto space-y-2 border-t border-border p-4">
            {user ? (
              <Button asChild variant="outline" className="w-full">
                <Link href="/account" onClick={() => setMenuOpen(false)}>
                  My account
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild className="w-full">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/sign-up">Create account</Link>
                </Button>
              </>
            )}
            <div className="flex items-center justify-between pt-2 text-sm text-neutral">
              Theme <ThemeToggle />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
