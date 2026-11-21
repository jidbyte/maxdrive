"use client";

import { useMemo, useState } from "react";
import { PackageSearch, Search } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";

export type PickerProduct = {
  id: string;
  name: string;
  sku: string;
  code: string | null;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
};

/** Searchable product picker (name / SKU / code), showing stock and price. */
export function ProductPicker({
  products,
  currency,
  onSelect,
  priceField = "sellingPrice",
  label = "Add product",
  excludeIds = [],
}: {
  products: PickerProduct[];
  currency: string;
  onSelect: (p: PickerProduct) => void;
  priceField?: "sellingPrice" | "costPrice";
  label?: string;
  excludeIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products
      .filter((p) => !excludeIds.includes(p.id))
      .filter((p) => !t || `${p.name} ${p.sku} ${p.code ?? ""}`.toLowerCase().includes(t))
      .slice(0, 50);
  }, [products, q, excludeIds]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ("");
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="outline">
          <PackageSearch /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,420px)] p-0">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 text-neutral" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, SKU or code"
            className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-neutral"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-neutral">No products found.</li>}
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(p);
                  setOpen(false);
                  setQ("");
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                  <span className="block truncate font-mono text-xs text-neutral">{p.sku}</span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-bold text-ink tabular-nums">{formatPrice(p[priceField], currency)}</span>
                  <span className={cn("block text-xs tabular-nums", p.quantity <= 0 ? "text-danger" : "text-neutral")}>
                    {p.quantity <= 0 ? "Out of stock" : `${p.quantity} in stock`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
