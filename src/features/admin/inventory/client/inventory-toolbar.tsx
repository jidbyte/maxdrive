"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

export function InventoryToolbar({ counts }: { counts: { all: number; low: number; out: number } }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();
  const filter = params.get("filter") ?? "all";

  function push(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === "all") next.delete(k);
      else next.set(k, v);
    }
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  const chips = [
    { key: "all", label: "All", n: counts.all },
    { key: "low", label: "Low stock", n: counts.low },
    { key: "out", label: "Out of stock", n: counts.out },
  ];

  return (
    <div className={cn("flex flex-col gap-3 transition-opacity lg:flex-row lg:items-center lg:justify-between", pending && "opacity-70")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: q.trim() || null });
        }}
        className="lg:w-96"
      >
        <Input
          icon={Search}
          placeholder="Search name, SKU, part number, brand…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onBlur={() => q !== (params.get("q") ?? "") && push({ q: q.trim() || null })}
        />
      </form>
      <div className="flex gap-1 overflow-x-auto rounded-full bg-surface-2 p-1">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => push({ filter: c.key })}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
              filter === c.key ? "bg-card text-ink shadow-card" : "text-neutral hover:text-ink",
            )}
          >
            {c.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[11px] tabular-nums",
                c.key === "out" && c.n > 0 ? "bg-danger/15 text-danger" : c.key === "low" && c.n > 0 ? "bg-warning/15 text-warning" : "bg-surface text-neutral",
              )}
            >
              {c.n}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
