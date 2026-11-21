import { getStoreSettings } from "@/shared/store/settings";
import { requireStaffPage } from "@/shared/authz/session";
import { listProducts } from "@/features/admin/products/server/queries";
import { ProductsPageClient } from "@/features/admin/products/client/products-page";
import type { ProductRow } from "@/features/admin/products/client/products-table";
import { ProductsEmptyState } from "@/features/admin/products/client/no-products";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  await requireStaffPage("products.read");
  const [settings, products] = await Promise.all([getStoreSettings(), listProducts()]);

  if (products.length === 0) return <ProductsEmptyState />;

  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    brand: p.brand ?? undefined,
    model: p.model ?? undefined,
    partNumber: p.partNumber,
    oemNumbers: p.oemNumbers,
    isFeatured: p.isFeatured,
    sellingPrice: p.sellingPrice,
    quantity: p.quantity,
    restockLevel: p.restockLevel,
    isActive: p.isActive,
    primaryImageUrl: p.images.find((i) => i.isPrimary)?.url ?? p.images[0]?.url ?? null,
    categories: p.productCategories.map((pc) => pc.category.name),
  }));

  return <ProductsPageClient currency={settings.currency} products={rows} />;
}
