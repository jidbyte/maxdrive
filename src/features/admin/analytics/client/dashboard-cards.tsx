import { AlertTriangle, Package, PackageCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import Link from "next/link";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function LowStockCard({ products }: { products: { name: string; quantity: number; restockLevel: number }[] }) {
  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Low Stock</CardTitle>
        </CardHeader>
        <CardContent className="-mt-4">
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success">
              <PackageCheck className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-ink">No low stock products</p>
              <p className="text-xs text-neutral">Every product is above its restock level.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-base">Low Stock</CardTitle>

        <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
          <AlertTriangle className="size-3" />
          {products.length} Products
        </span>
      </CardHeader>

      <CardContent className="-mt-4 space-y-1">
        {products.map((p) => {
          const pct = p.restockLevel > 0 ? Math.min(100, (p.quantity / p.restockLevel) * 100) : 0;
          return (
            <div key={p.name} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-neutral">
                <Package className="size-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <span className="shrink-0 text-sm font-medium text-warning">{p.quantity} left</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function RecentSalesCard({
  sales,
  currencySymbol,
}: {
  sales: {
    id: string;
    saleNumber: string;
    customerName: string;
    totalAmount: number;
  }[];
  currencySymbol: string;
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-base">Recent Sales</CardTitle>
      </CardHeader>

      <CardContent className="-mt-4 space-y-2.5">
        {sales.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral">No sales recorded yet.</p>
        ) : (
          sales.map((s) => (
            <Link
              key={s.id}
              href={`/admin/orders/${s.id}`}
              className="-mx-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-2"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                {initials(s.customerName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{s.customerName}</p>
                <p className="truncate text-xs text-neutral">{s.saleNumber}</p>
              </div>
              <span className="shrink-0 rounded-full bg-success/10 px-2 py-1 text-sm font-semibold tracking-wider text-success">
                +{currencySymbol}
                {s.totalAmount.toLocaleString()}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function BestSellingProductsCard({
  products,
  currencySymbol,
}: {
  products: { productName: string; quantity: number; revenue: number }[];
  currencySymbol: string;
}) {
  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Best Sellers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-neutral">No sales in this period yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Best selling products</CardTitle>
      </CardHeader>

      <CardContent className="-mt-4 space-y-0.5">
        {products.map((p, i) => (
          <div
            key={p.productName}
            className="-mx-2 mb-2 flex items-start gap-4 rounded-md px-2 py-2 hover:bg-surface-2"
          >
            <span className="grid h-6 w-6 shrink-0 place-content-center rounded-full bg-primary-soft text-sm font-bold text-primary tabular-nums">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{p.productName}</p>
              <p className="text-semibold text-xs text-neutral">{p.quantity} sold</p>
            </div>

            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
              {currencySymbol}
              {p.revenue.toLocaleString()}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
