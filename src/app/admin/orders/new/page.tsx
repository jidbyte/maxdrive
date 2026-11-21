import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { BackLink } from "@/shared/components/admin/panel";
import { listProductOptions } from "@/features/admin/products/server/queries";
import { listCustomers } from "@/features/admin/customers/server/queries";
import { SaleForm } from "@/features/admin/sales/client/sale-form";

export const metadata = { title: "Record sale" };

export default async function NewSalePage() {
  await requireStaffPage("orders.manage");
  const [s, products, customers] = await Promise.all([getStoreSettings(), listProductOptions(), listCustomers()]);
  return (
    <div className="space-y-6">
      <BackLink href="/admin/orders">Orders</BackLink>
      <SaleForm
        currency={s.currency}
        products={products}
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
      />
    </div>
  );
}
