import { Truck } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { BackLink } from "@/shared/components/admin/panel";
import { listProductOptions } from "@/features/admin/products/server/queries";
import { listSuppliers } from "@/features/admin/suppliers/server/queries";
import { PurchaseForm } from "@/features/admin/purchases/client/purchase-form";

export const metadata = { title: "New purchase order" };

export default async function NewPurchasePage() {
  await requireStaffPage("purchases.manage");
  const [s, products, suppliers] = await Promise.all([getStoreSettings(), listProductOptions(), listSuppliers()]);
  return (
    <div className="space-y-6">
      <BackLink href="/admin/purchases">Purchases</BackLink>
      <PageHeader>
        <PageTitle icon={Truck} description="Order stock from a supplier.">New purchase order</PageTitle>
      </PageHeader>
      <PurchaseForm currency={s.currency} products={products} suppliers={suppliers.map((x) => ({ id: x.id, companyName: x.companyName }))} />
    </div>
  );
}
