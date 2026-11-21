import { getStoreSettings } from "@/shared/store/settings";
import { requireStaffPage } from "@/shared/authz/session";
import { listVehicleOptions } from "@/features/admin/products/server/queries";
import { ProductForm } from "@/features/admin/products/client/product-form";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireStaffPage("products.manage");
  const [settings, vehicles] = await Promise.all([getStoreSettings(), listVehicleOptions()]);

  return (
    <ProductForm
      currency={settings.currency}
      vehicles={vehicles}
      defaultValues={{ restockLevel: settings.lowStockThreshold }}
    />
  );
}
