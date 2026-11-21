import { notFound } from "next/navigation";

import { getStoreSettings } from "@/shared/store/settings";
import { requireStaffPage } from "@/shared/authz/session";
import { getProductById, listVehicleOptions } from "@/features/admin/products/server/queries";
import { ProductForm } from "@/features/admin/products/client/product-form";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const staff = await requireStaffPage("products.manage");
  const [settings, product, vehicles] = await Promise.all([
    getStoreSettings(),
    getProductById(productId),
    listVehicleOptions(),
  ]);
  if (!product) notFound();

  return (
    <ProductForm
      currency={settings.currency}
      productId={product.id}
      vehicles={vehicles}
      canAdjustStock={staff.permissions.has("inventory.adjust")}
      defaultValues={{
        name: product.name,
        sku: product.sku,
        partNumber: product.partNumber ?? "",
        oemNumbers: product.oemNumbers,
        brand: product.brand ?? "",
        model: product.model ?? "",
        description: product.description ?? "",
        condition: product.condition,
        warrantyMonths: product.warrantyMonths,
        sellingPrice: product.sellingPrice,
        compareAtPrice: product.compareAtPrice,
        costPrice: product.costPrice,
        quantity: product.quantity,
        restockLevel: product.restockLevel,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        isUniversal: product.isUniversal,
        categories: product.productCategories.map((pc) => pc.category.name),
        images: product.images.map((img) => ({ url: img.url, fileKey: img.fileKey, isPrimary: img.isPrimary })),
        fitments: product.fitments.map((f) => ({
          makeId: f.makeId,
          modelId: f.modelId ?? "",
          yearFrom: f.yearFrom,
          yearTo: f.yearTo,
          engine: f.engine ?? "",
          notes: f.notes ?? "",
        })),
      }}
    />
  );
}
