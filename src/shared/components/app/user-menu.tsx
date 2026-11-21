"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, LogOut, Package, ShieldCheck, User } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { endSession } from "@/shared/lib/firebase/client";
import { cn } from "@/shared/lib/utils";

export type MenuUser = {
  name: string | null;
  email: string | null;
  photoUrl: string | null;
  isStaff: boolean;
  role?: string | null;
};

export function initials(name: string | null, email: string | null) {
  const src = (name || email || "?").trim();
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function Avatar({ user, className }: { user: Pick<MenuUser, "name" | "email" | "photoUrl">; className?: string }) {
  if (user.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.photoUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={cn("size-9 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-primary-foreground",
        className,
      )}
    >
      {initials(user.name, user.email)}
    </span>
  );
}

export function UserMenu({ user, align = "end" }: { user: MenuUser; align?: "start" | "end" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await endSession();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const links = [
    ...(user.isStaff ? [{ href: "/admin", label: "Admin dashboard", icon: LayoutDashboard }] : []),
    { href: "/account", label: "My account", icon: User },
    { href: "/account/orders", label: "My orders", icon: Package },
    { href: "/account/security", label: "Sign-in & security", icon: ShieldCheck },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="rounded-full outline-none ring-offset-2 ring-offset-surface focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          <Avatar user={user} />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-64 p-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar user={user} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{user.name || "Your account"}</p>
            <p className="truncate text-xs text-neutral">
              {user.email}
              {user.role ? ` · ${user.role}` : ""}
            </p>
          </div>
        </div>
        <div className="my-1 h-px bg-border" />
        <nav className="flex flex-col">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-ink hover:bg-surface-2"
            >
              <l.icon className="size-4 text-neutral" />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="my-1 h-px bg-border" />
        <Button
          variant="ghost"
          shape="round"
          className="w-full justify-start px-2.5 text-danger hover:text-danger"
          onClick={signOut}
          loading={signingOut}
        >
          {!signingOut && <LogOut />} Sign out
        </Button>
      </PopoverContent>
    </Popover>
  );
}
