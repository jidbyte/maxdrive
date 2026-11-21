import { getStaffContext } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { Stat, StatGrid } from "@/shared/components/admin/panel";
import { listInvoices } from "@/features/admin/invoices/server/actions";
import { listSales } from "@/features/admin/sales/server/queries";
import { CreateInvoiceDialog } from "@/features/admin/invoices/client/create-invoice-dialog";
import { InvoicesList } from "@/features/admin/finance/client/finance-lists";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const [s, staff, invoices, sales] = await Promise.all([getStoreSettings(), getStaffContext(), listInvoices(), listSales()]);
  const canManage = !!staff?.permissions.has("finance.manage");
  const invoiced = new Set(invoices.map((i) => i.saleId).filter(Boolean));
  const open = invoices.filter((i) => ["draft", "sent", "overdue"].includes(i.status));
  const money = (n: number) => formatPrice(n, s.currency);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <StatGrid className="flex-1 lg:grid-cols-3">
          <Stat label="Unpaid" value={money(open.reduce((a, i) => a + i.totalAmount, 0))} hint={`${open.length} invoices`} tone={open.length ? "warning" : undefined} />
          <Stat label="Paid" value={money(invoices.filter((i) => i.status === "paid").reduce((a, i) => a + i.totalAmount, 0))} />
          <Stat label="Invoices" value={invoices.length} />
        </StatGrid>
        {canManage && (
          <CreateInvoiceDialog
            sales={sales
              .filter((x) => !invoiced.has(x.id) && x.status !== "cancelled")
              .map((x) => ({ id: x.id, saleNumber: x.saleNumber, customerName: x.customerName }))}
          />
        )}
      </div>
      <InvoicesList
        currency={s.currency}
        canManage={canManage}
        rows={invoices.map((i) => ({
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          customerName: i.customerName,
          customerEmail: i.customerEmail,
          customerPhone: i.customerPhone,
          totalAmount: i.totalAmount,
          status: i.status,
          issueDate: i.issueDate.toISOString(),
          dueDate: i.dueDate?.toISOString() ?? null,
          pdfUrl: i.pdfUrl,
          saleId: i.saleId,
        }))}
      />
    </div>
  );
}
