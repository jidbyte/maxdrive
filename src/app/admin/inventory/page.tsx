import Image from "next/image";
import Link from "next/link";
import { Boxes, History, Package, PackagePlus, Truck } from "lucide-react";

import { getStoreSettings } from "@/shared/store/settings";
import { requireStaffPage } from "@/shared/authz/session";
import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { PageAction, PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { getInventorySummary, listMovements, listStock, type StockFilter } from "@/features/admin/inventory/server/queries";
import { MOVEMENT_LABEL } from "@/features/admin/inventory/movement-labels";
import type { StockReason } from "@/features/admin/inventory/server/stock";
import { InventoryToolbar } from "@/features/admin/inventory/client/inventory-toolbar";
import { AdjustStockDialog } from "@/features/admin/products/client/product-actions";

export const metadata = { title: "Inventory" };

const REASONS = Object.keys(MOVEMENT_LABEL) as StockReason[];

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <p className="text-xs text-neutral sm:text-sm">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl",
          tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; filter?: string; product?: string; reason?: string }>;
}) {
  const sp = await searchParams;
  const staff = await requireStaffPage("products.read");
  const canAdjust = staff.permissions.has("inventory.adjust");
  const view = sp.view === "movements" || sp.product ? "movements" : "stock";
  const filter: StockFilter = sp.filter === "low" || sp.filter === "out" ? sp.filter : "all";
  const reason = REASONS.includes(sp.reason as StockReason) ? (sp.reason as StockReason) : undefined;

  const [settings, summary] = await Promise.all([getStoreSettings(), getInventorySummary()]);
  const money = (n: number) => formatPrice(n, settings.currency);

  const tabClass = (active: boolean) =>
    cn(
      "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
      active ? "bg-primary-soft text-primary" : "text-neutral hover:text-ink",
    );

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle icon={Boxes} description="Stock levels, valuation and every stock movement.">
          Inventory
        </PageTitle>
        <PageAction>
          {staff.permissions.has("purchases.manage") && (
            <Button asChild variant="outline">
              <Link href="/admin/purchases/new">
                <Truck /> New purchase order
              </Link>
            </Button>
          )}
          {staff.permissions.has("products.manage") && (
            <Button asChild>
              <Link href="/admin/products/new">
                <PackagePlus /> Add product
              </Link>
            </Button>
          )}
        </PageAction>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
        <Stat label="Products" value={summary.skus.toLocaleString()} />
        <Stat label="Units on hand" value={summary.units.toLocaleString()} />
        <Stat label="Stock value (cost)" value={money(summary.costValue)} />
        <Stat label="Retail value" value={money(summary.retailValue)} />
        <Stat label="Low stock" value={String(summary.low)} tone={summary.low ? "warning" : undefined} />
        <Stat label="Out of stock" value={String(summary.out)} tone={summary.out ? "danger" : undefined} />
      </div>

      <nav className="flex gap-1" aria-label="Inventory views">
        <Link href="/admin/inventory" className={tabClass(view === "stock")}>
          <Package className="size-4" /> Stock
        </Link>
        <Link href="/admin/inventory?view=movements" className={tabClass(view === "movements")}>
          <History className="size-4" /> Movements
        </Link>
      </nav>

      {view === "stock" ? (
        <StockView q={sp.q} filter={filter} canAdjust={canAdjust} money={money} counts={{ all: summary.skus, low: summary.low, out: summary.out }} />
      ) : (
        <MovementsView productId={sp.product} reason={reason} />
      )}
    </div>
  );
}

async function StockView({
  q,
  filter,
  canAdjust,
  money,
  counts,
}: {
  q?: string;
  filter: StockFilter;
  canAdjust: boolean;
  money: (n: number) => string;
  counts: { all: number; low: number; out: number };
}) {
  const rows = await listStock({ q, filter });
  const status = (r: (typeof rows)[number]) =>
    r.quantity <= 0
      ? { label: "Out", variant: "destructive" as const }
      : r.quantity <= r.restockLevel
        ? { label: "Low", variant: "warning" as const }
        : { label: "OK", variant: "success" as const };
  const suggest = (r: (typeof rows)[number]) => Math.max(r.restockLevel * 2 - r.quantity, 0);

  return (
    <div className="space-y-4">
      <InventoryToolbar counts={counts} />
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-neutral">
          No products match.
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/60 text-left text-xs text-neutral">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">SKU / Part #</th>
                  <th className="px-4 py-3 text-right font-semibold">On hand</th>
                  <th className="px-4 py-3 text-right font-semibold">Reorder at</th>
                  <th className="px-4 py-3 text-right font-semibold">Suggested order</th>
                  <th className="px-4 py-3 text-right font-semibold">Value (cost)</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  {canAdjust && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const s = status(r);
                  return (
                    <tr key={r.id} className="hover:bg-surface-2/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                            {r.imageUrl ? (
                              <Image src={r.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                            ) : (
                              <Package className="absolute inset-0 m-auto size-4 text-neutral" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <Link href={`/admin/products/${r.id}`} className="line-clamp-1 font-semibold text-ink hover:text-primary">
                              {r.name}
                            </Link>
                            <span className="text-xs text-neutral">{r.brand ?? "—"}{!r.isActive && " · hidden"}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral">
                        {r.sku}
                        {r.partNumber && <span className="block">{r.partNumber}</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-base font-extrabold text-ink tabular-nums">{r.quantity}</td>
                      <td className="px-4 py-3 text-right text-neutral tabular-nums">{r.restockLevel}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.quantity <= r.restockLevel ? <b className="text-ink">{suggest(r)}</b> : <span className="text-neutral">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral tabular-nums">{money(r.quantity * r.costPrice)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </td>
                      {canAdjust && (
                        <td className="px-2 py-3 text-right">
                          <AdjustStockDialog productId={r.id} productName={r.name} currentQuantity={r.quantity} trigger="icon" />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card md:hidden">
            {rows.map((r) => {
              const s = status(r);
              return (
                <li key={r.id} className="flex items-center gap-3 p-3">
                  <Link href={`/admin/products/${r.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{r.name}</p>
                    <p className="truncate font-mono text-xs text-neutral">{r.sku}</p>
                  </Link>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-ink tabular-nums">{r.quantity}</p>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </div>
                  {canAdjust && <AdjustStockDialog productId={r.id} productName={r.name} currentQuantity={r.quantity} trigger="icon" />}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

async function MovementsView({ productId, reason }: { productId?: string; reason?: StockReason }) {
  const rows = await listMovements({ productId, reason });
  const productName = productId ? rows[0]?.productName : null;

  const refHref = (type: string | null, id: string | null) =>
    !id ? null : type === "sale" ? `/admin/orders/${id}` : type === "purchase" ? `/admin/purchases/${id}` : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {productId && (
          <Link
            href="/admin/inventory?view=movements"
            className="flex h-9 items-center gap-2 rounded-full bg-primary-soft px-4 text-sm font-semibold text-primary"
          >
            {productName ?? "This product"} <span aria-hidden>×</span>
          </Link>
        )}
        {(["", ...REASONS] as const).map((r) => (
          <Link
            key={r || "all"}
            href={`/admin/inventory?view=movements${productId ? `&product=${productId}` : ""}${r ? `&reason=${r}` : ""}`}
            className={cn(
              "flex h-9 items-center rounded-full border px-3.5 text-xs font-semibold whitespace-nowrap",
              (reason ?? "") === r ? "border-primary bg-primary-soft text-primary" : "border-border text-neutral hover:text-ink",
            )}
          >
            {r ? MOVEMENT_LABEL[r] : "All movements"}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-neutral">No stock movements yet.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
          {rows.map((m) => {
            const href = refHref(m.referenceType, m.referenceId);
            return (
              <li key={m.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 p-4 sm:grid-cols-[1fr_140px_90px_90px] sm:items-center">
                <div className="min-w-0">
                  <Link href={`/admin/products/${m.productId}`} className="line-clamp-1 text-sm font-semibold text-ink hover:text-primary">
                    {m.productName}
                  </Link>
                  <p className="truncate text-xs text-neutral">
                    {MOVEMENT_LABEL[m.reason]}
                    {m.note && ` · ${m.note}`}
                    {href && (
                      <>
                        {" · "}
                        <Link href={href} className="font-semibold text-primary">view {m.referenceType}</Link>
                      </>
                    )}
                  </p>
                </div>
                <p className={cn("text-right text-base font-extrabold tabular-nums sm:order-3", m.delta > 0 ? "text-success" : "text-danger")}>
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </p>
                <p className="text-xs text-neutral sm:order-2">
                  {m.createdAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  <span className="block truncate">{m.actorName || m.actorEmail || "System / storefront"}</span>
                </p>
                <p className="text-right text-xs text-neutral tabular-nums sm:order-4">
                  {m.balanceAfter !== null ? `→ ${m.balanceAfter}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
