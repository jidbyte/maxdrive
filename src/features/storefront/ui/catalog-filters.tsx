"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { cn } from "@/shared/lib/utils";

type Category = { slug: string; name: string; productCount: number };
type Brand = { name: string; count: number };

const SORTS = [
  { value: "", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name A–Z" },
];

function useParamUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    const qs = next.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }
  return { params, update, pending };
}

function FilterPanel({
  categories,
  brands,
  activeCategory,
  hasVehicle,
}: {
  categories: Category[];
  brands: Brand[];
  activeCategory: string | null;
  hasVehicle: boolean;
}) {
  const { params, update } = useParamUpdater();
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");
  const qs = (() => {
    const p = new URLSearchParams(params.toString());
    p.delete("page");
    const s = p.toString();
    return s ? `?${s}` : "";
  })();

  return (
    <div className="space-y-8">
      {hasVehicle && (
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-primary-soft p-3.5">
          <Checkbox
            checked={params.get("fits") === "1"}
            onCheckedChange={(v) => update({ fits: v ? "1" : null })}
          />
          <span className="text-sm font-semibold text-ink">Only parts that fit my vehicle</span>
        </label>
      )}

      <div>
        <h3 className="mb-3 text-xs font-bold tracking-[0.1em] text-neutral uppercase">Category</h3>
        <ul className="space-y-0.5">
          <li>
            <Link
              href={`/shop${qs}`}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2 text-sm",
                !activeCategory ? "bg-surface-2 font-bold text-ink" : "text-neutral hover:text-ink",
              )}
            >
              All parts
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/shop/c/${c.slug}${qs}`}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-sm",
                  activeCategory === c.slug ? "bg-surface-2 font-bold text-ink" : "text-neutral hover:text-ink",
                )}
              >
                {c.name}
                <span className="text-xs tabular-nums">{c.productCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {brands.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-bold tracking-[0.1em] text-neutral uppercase">Brand</h3>
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {brands.map((b) => {
              const checked = params.get("brand")?.toLowerCase() === b.name.toLowerCase();
              return (
                <li key={b.name}>
                  <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
                    <Checkbox checked={checked} onCheckedChange={(v) => update({ brand: v ? b.name : null })} />
                    <span className="flex-1">{b.name}</span>
                    <span className="text-xs text-neutral tabular-nums">{b.count}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-xs font-bold tracking-[0.1em] text-neutral uppercase">Price</h3>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ min: min || null, max: max || null });
          }}
        >
          <Input aria-label="Minimum price" placeholder="Min" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} className="h-10" />
          <span className="text-neutral">–</span>
          <Input aria-label="Maximum price" placeholder="Max" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} className="h-10" />
          <Button type="submit" variant="outline" size="sm" className="h-10">Go</Button>
        </form>
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
        <Checkbox
          checked={params.get("stock") === "1"}
          onCheckedChange={(v) => update({ stock: v ? "1" : null })}
        />
        In stock only
      </label>
    </div>
  );
}

export function CatalogToolbar(props: {
  categories: Category[];
  brands: Brand[];
  activeCategory: string | null;
  hasVehicle: boolean;
  total: number;
}) {
  const { params, update, pending } = useParamUpdater();
  const [open, setOpen] = useState(false);
  const activeCount = ["brand", "min", "max", "stock", "fits"].filter((k) => params.get(k)).length;

  return (
    <div className="flex items-center justify-between gap-3">
      <p className={cn("text-sm text-neutral transition-opacity", pending && "opacity-50")}>
        {props.total.toLocaleString()} result{props.total === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setOpen(true)}>
          <SlidersHorizontal /> Filters{activeCount ? ` (${activeCount})` : ""}
        </Button>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => update({ brand: null, min: null, max: null, stock: null, fits: null })}
          >
            <X /> Clear filters
          </Button>
        )}
        <select
          aria-label="Sort by"
          value={params.get("sort") ?? ""}
          onChange={(e) => update({ sort: e.target.value || null })}
          className="h-9 rounded-full border border-input bg-surface px-3.5 text-sm font-medium text-ink outline-none focus-visible:border-primary"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <FilterPanel {...props} />
          </div>
          <div className="sticky bottom-0 border-t border-border bg-card p-4">
            <Button className="w-full" onClick={() => setOpen(false)}>
              Show {props.total} results
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function CatalogSidebar(props: {
  categories: Category[];
  brands: Brand[];
  activeCategory: string | null;
  hasVehicle: boolean;
}) {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-24">
        <FilterPanel {...props} />
      </div>
    </aside>
  );
}
