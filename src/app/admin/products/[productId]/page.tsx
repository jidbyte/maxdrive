import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Box, ExternalLink, EyeOff, SquarePen, Star } from "lucide-react";

import { getStoreSettings } from "@/shared/store/settings";
import { requireStaffPage } from "@/shared/authz/session";
import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { PageAction, PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { getProductById } from "@/features/admin/products/server/queries";
import { ProductImageGallery } from "@/features/admin/products/client/image-gallery";
import { AdjustStockDialog, DeleteProductDialog } from "@/features/admin/products/client/product-actions";
import { MOVEMENT_LABEL } from "@/features/admin/inventory/movement-labels";

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-card sm:p-6", className)}>
      <h2 className="mb-4 text-sm font-bold tracking-wide text-neutral uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default async function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const staff = await requireStaffPage("products.read");
  const [settings, product] = await Promise.all([getStoreSettings(), getProductById(productId)]);
  if (!product) notFound();

  const money = (n: number) => formatPrice(n, settings.currency);
  const margin = product.sellingPrice > 0 ? ((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100 : 0;
  const stock =
    product.quantity <= 0
      ? { label: "Out of stock", variant: "destructive" as const }
      : product.quantity <= product.restockLevel
        ? { label: "Low stock", variant: "warning" as const }
        : { label: "In stock", variant: "success" as const };
  const canManage = staff.permissions.has("products.manage");

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle
          icon={Box}
          description={
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono">SKU {product.sku}</span>
              {product.partNumber && <span className="font-mono">· Part # {product.partNumber}</span>}
              <Badge variant={stock.variant}>{stock.label}</Badge>
              {!product.isActive && (
                <Badge variant="secondary"><EyeOff /> Hidden</Badge>
              )}
              {product.isFeatured && (
                <Badge><Star /> Featured</Badge>
              )}
            </span>
          }
        >
          {product.name}
        </PageTitle>
        <PageAction>
          {product.isActive && (
            <Button asChild variant="ghost">
              <Link href={`/shop/p/${product.slug}`} target="_blank">
                <ExternalLink /> View in shop
              </Link>
            </Button>
          )}
          {staff.permissions.has("inventory.adjust") && (
            <AdjustStockDialog productId={product.id} productName={product.name} currentQuantity={product.quantity} />
          )}
          {canManage && (
            <>
              <Button asChild>
                <Link href={`/admin/products/${product.id}/edit`}>
                  <SquarePen /> Edit
                </Link>
              </Button>
              <DeleteProductDialog productId={product.id} />
            </>
          )}
        </PageAction>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="space-y-6">
          <ProductImageGallery
            images={product.images.map((i) => ({ id: i.id, url: i.url, isPrimary: i.isPrimary }))}
            productName={product.name}
          />
          <Card title="Stock">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-neutral">On hand</dt>
                <dd className="text-3xl font-extrabold text-ink tabular-nums">{product.quantity}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral">Reorder at</dt>
                <dd className="text-3xl font-extrabold text-ink tabular-nums">{product.restockLevel}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-neutral">Stock value (at cost)</dt>
                <dd className="text-lg font-bold text-ink tabular-nums">{money(product.quantity * product.costPrice)}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Pricing">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-neutral">Selling</dt>
                <dd className="text-xl font-extrabold text-ink tabular-nums">{money(product.sellingPrice)}</dd>
                {product.compareAtPrice && product.compareAtPrice > product.sellingPrice && (
                  <dd className="text-xs text-neutral line-through">{money(product.compareAtPrice)}</dd>
                )}
              </div>
              <div>
                <dt className="text-xs text-neutral">Cost</dt>
                <dd className="text-xl font-extrabold text-ink tabular-nums">{money(product.costPrice)}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral">Profit / unit</dt>
                <dd className="text-xl font-extrabold text-ink tabular-nums">{money(product.sellingPrice - product.costPrice)}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral">Margin</dt>
                <dd className={cn("text-xl font-extrabold tabular-nums", margin > 0 ? "text-success" : "text-danger")}>
                  {margin.toFixed(1)}%
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Details">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ["Brand", product.brand],
                ["Model / line", product.model],
                ["Condition", product.condition],
                ["Warranty", product.warrantyMonths ? `${product.warrantyMonths} months` : null],
                ["OEM numbers", product.oemNumbers.join(", ") || null],
                ["Categories", product.productCategories.map((pc) => pc.category.name).join(", ") || null],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border pb-2 sm:block sm:border-0 sm:pb-0">
                  <dt className="text-neutral">{k}</dt>
                  <dd className="text-right font-medium text-ink capitalize sm:text-left">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            {product.description && <p className="mt-5 text-sm whitespace-pre-line text-neutral">{product.description}</p>}
          </Card>

          <Card title="Vehicle fitment">
            {product.isUniversal ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-success">
                <BadgeCheck className="size-4" /> Universal fit
              </p>
            ) : product.fitments.length === 0 ? (
              <p className="text-sm text-neutral">
                No vehicles listed — this part won&apos;t show a “Fits your vehicle” badge.{" "}
                {canManage && (
                  <Link href={`/admin/products/${product.id}/edit`} className="font-semibold text-primary">Add fitment</Link>
                )}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-neutral">
                    <tr>
                      <th className="pb-2 font-semibold">Make</th>
                      <th className="pb-2 font-semibold">Model</th>
                      <th className="pb-2 font-semibold">Years</th>
                      <th className="pb-2 font-semibold">Engine</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {product.fitments.map((f) => (
                      <tr key={f.id}>
                        <td className="py-2 text-ink">{f.make.name}</td>
                        <td className="py-2 text-ink">{f.model?.name ?? "All"}</td>
                        <td className="py-2 whitespace-nowrap text-ink tabular-nums">
                          {f.yearFrom || f.yearTo ? `${f.yearFrom ?? "…"}–${f.yearTo ?? "…"}` : "All"}
                        </td>
                        <td className="py-2 text-neutral">{f.engine ?? "All"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Recent stock movements">
            {product.inventoryLogs.length === 0 ? (
              <p className="text-sm text-neutral">No movements yet.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {product.inventoryLogs.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="font-semibold text-ink">{MOVEMENT_LABEL[l.reason]}</span>
                      {l.note && <span className="block truncate text-xs text-neutral">{l.note}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-4">
                      <span className={cn("font-bold tabular-nums", l.delta > 0 ? "text-success" : "text-danger")}>
                        {l.delta > 0 ? `+${l.delta}` : l.delta}
                      </span>
                      <span className="hidden text-xs text-neutral sm:inline">
                        {l.createdAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/admin/inventory?product=${product.id}`} className="mt-3 inline-block text-sm font-semibold text-primary">
              Full history →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
