import { notFound, redirect } from "next/navigation";
import { SquarePen } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { BackLink, Panel } from "@/shared/components/admin/panel";
import { getSaleById } from "@/features/admin/sales/server/queries";
import { listCustomers } from "@/features/admin/customers/server/queries";
import { SaleEditForm } from "@/features/admin/sales/client/sale-edit-form";

export const metadata = { title: "Edit order" };

export default async function EditSalePage({ params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = await params;
  await requireStaffPage("orders.manage");
  const [sale, customers] = await Promise.all([getSaleById(saleId), listCustomers()]);
  if (!sale) notFound();
  if (sale.status === "cancelled" || sale.status === "refunded") redirect(`/admin/orders/${saleId}`);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href={`/admin/orders/${saleId}`}>{sale.saleNumber}</BackLink>
      <PageHeader>
        <PageTitle icon={SquarePen} description="Items can't change after a sale — cancel and re-record it if needed.">
          Edit order
        </PageTitle>
      </PageHeader>
      <Panel>
        <SaleEditForm
          saleId={sale.id}
          customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          defaultValues={{
            customerId: sale.customerId ?? "",
            customerName: sale.customerName,
            saleDate: sale.saleDate.toISOString().slice(0, 10),
            discountAmount: sale.discountAmount,
            notes: sale.notes ?? "",
          }}
        />
      </Panel>
    </div>
  );
}
