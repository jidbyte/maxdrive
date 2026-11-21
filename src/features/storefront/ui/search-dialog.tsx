"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Loader2, Package, Search } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/shared/components/ui/dialog";
import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";
import { quickSearch } from "@/features/storefront/catalog/server/actions";
import type { CatalogProduct } from "@/features/storefront/catalog/server/queries";

export function SearchTrigger({ className, currency }: { className?: string; currency: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-11 w-full items-center gap-2.5 rounded-full border border-input bg-surface px-4 text-left text-sm text-neutral transition-colors hover:border-neutral/40",
          className,
        )}
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate">Search parts, part numbers, OEM…</span>
        <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] lg:inline">⌘K</kbd>
      </button>
      <SearchDialog open={open} onOpenChange={setOpen} currency={currency} />
    </>
  );
}

export function SearchDialog({
  open,
  onOpenChange,
  currency,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currency: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        showCloseButton={false}
        className="top-4 translate-y-0 gap-0 overflow-hidden p-0 sm:top-[12vh]"
      >
        <DialogTitle className="sr-only">Search products</DialogTitle>
        {/* Mounted only while open, so its state resets on every open. */}
        <SearchPanel onNavigate={() => onOpenChange(false)} currency={currency} />
      </DialogContent>
    </Dialog>
  );
}

function SearchPanel({ onNavigate, currency }: { onNavigate: () => void; currency: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [fetched, setFetched] = useState<CatalogProduct[]>([]);
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const reqId = useRef(0);
  const results = q.trim().length < 2 ? [] : fetched;

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const id = ++reqId.current;
    const t = setTimeout(() => {
      start(async () => {
        const r = await quickSearch(term);
        if (id === reqId.current) {
          setFetched(r);
          setActive(0);
        }
      });
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  function go(href: string) {
    onNavigate();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(`/shop/p/${results[active].slug}`);
      else if (q.trim()) go(`/shop?q=${encodeURIComponent(q.trim())}`);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border px-5">
        {pending ? (
          <Loader2 className="size-5 animate-spin text-neutral" />
        ) : (
          <Search className="size-5 text-neutral" />
        )}
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search by name, part number, OEM number or brand"
          className="h-16 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-neutral"
          aria-label="Search products"
        />
        <kbd className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] text-neutral">Esc</kbd>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-2">
        {q.trim().length < 2 ? (
          <p className="px-3 py-8 text-center text-sm text-neutral">
            Try <b className="px-1 text-ink">brake pads</b>, <b className="px-1 text-ink">90915-YZZE1</b> or
            <b className="px-1 text-ink">Bosch</b>
          </p>
        ) : results.length === 0 && !pending ? (
          <p className="px-3 py-8 text-center text-sm text-neutral">No parts found for “{q}”.</p>
        ) : (
          <ul role="listbox">
            {results.map((p, i) => (
              <li key={p.id} role="option" aria-selected={i === active}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(`/shop/p/${p.slug}`)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl p-2.5 text-left",
                    i === active && "bg-surface-2",
                  )}
                >
                  <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2">
                    {p.imageUrl ? (
                      <Image src={p.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                    ) : (
                      <Package className="size-5 text-neutral" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                    <span className="block truncate text-xs text-neutral">
                      {[p.brand, p.partNumber].filter(Boolean).join(" · ")}
                      {p.fits === true && <span className="ml-1 text-success">· Fits your vehicle</span>}
                    </span>
                  </span>
                  <span className="text-sm font-bold text-ink tabular-nums">
                    {formatPrice(p.sellingPrice, currency)}
                  </span>
                </button>
              </li>
            ))}
            <li>
              <button
                onMouseEnter={() => setActive(results.length)}
                onClick={() => go(`/shop?q=${encodeURIComponent(q.trim())}`)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl p-3 text-sm font-semibold text-primary",
                  active === results.length && "bg-surface-2",
                )}
              >
                See all results for “{q.trim()}” <ArrowRight className="size-4" />
              </button>
            </li>
          </ul>
        )}
      </div>
    </>
  );
}
