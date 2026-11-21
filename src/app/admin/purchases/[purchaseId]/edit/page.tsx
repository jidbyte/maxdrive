import { notFound, redirect } from "next/navigation";
import { SquarePen } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { BackLink } from "@/shared/components/admin/panel";
import { listProductOptions } from "@/features/admin/products/server/queries";
import { getPurchaseById } from "@/features/admin/purchases/server/queries";
import { listSuppliers } from "@/features/admin/suppliers/server/queries";
import { PurchaseForm } from "@/features/admin/purchases/client/purchase-form";

export const metadata = { title: "Edit purchase order" };

export default async function EditPurchasePage({ params }: { params: Promise<{ purchaseId: string }> }) {
  const { purchaseId } = await params;
  await requireStaffPage("purchases.manage");
  const [s, p, products, suppliers] = await Promise.all([
    getStoreSettings(),
    getPurchaseById(purchaseId),
    listProductOptions(),
    listSuppliers(),
  ]);
  if (!p) notFound();
  if (p.purchaseStatus !== "draft") redirect(`/admin/purchases/${purchaseId}`);

  return (
    <div className="space-y-6">
      <BackLink href={`/admin/purchases/${p.id}`}>{p.purchaseNumber}</BackLink>
      <PageHeader>
        <PageTitle icon={SquarePen} description="Only drafts can be edited.">Edit purchase order</PageTitle>
      </PageHeader>
      <PurchaseForm
        purchaseId={p.id}
        currency={s.currency}
        products={products}
        suppliers={suppliers.map((x) => ({ id: x.id, companyName: x.companyName }))}
        defaultValues={{
          supplierId: p.supplierId ?? "",
          supplierName: p.supplierName,
          purchaseDate: p.purchaseDate.toISOString().slice(0, 10),
          eta: p.eta ? p.eta.toISOString().slice(0, 10) : "",
          shippingCost: p.shippingCost,
          discountAmount: p.discountAmount,
          items: p.items.map((i) => ({
            productId: i.productId ?? "",
            productName: i.productName,
            productCode: i.productCode ?? "",
            productSku: i.productSku,
            quantity: i.quantity,
            unitCost: i.unitCost,
          })),
        }}
      />
    </div>
  );
}
