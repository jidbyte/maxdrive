import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Factory } from "lucide-react";

import { db } from "@/shared/db";
import { purchase } from "@/shared/db/schema";
import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { BackLink, Panel } from "@/shared/components/admin/panel";
import { StatusBadge } from "@/shared/components/admin/status-badge";
import { getSupplierById } from "@/features/admin/suppliers/server/queries";
import { SupplierForm } from "@/features/admin/suppliers/client/supplier-form";

export const metadata = { title: "Supplier" };

export default async function EditSupplierPage({ params }: { params: Promise<{ supplierId: string }> }) {
  const { supplierId } = await params;
  await requireStaffPage("suppliers.manage");
  const [s, sup] = await Promise.all([getStoreSettings(), getSupplierById(supplierId)]);
  if (!sup) notFound();
  const pos = await db.query.purchase.findMany({
    where: eq(purchase.supplierId, sup.id),
    orderBy: [desc(purchase.purchaseDate)],
    limit: 20,
  });

  return (
    <div className="space-y-6">
      <BackLink href="/admin/suppliers">Suppliers</BackLink>
      <PageHeader>
        <PageTitle icon={Factory}>{sup.companyName}</PageTitle>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Panel title="Details">
          <SupplierForm
            supplierId={sup.id}
            defaultValues={{
              companyName: sup.companyName,
              contactName: sup.contactName ?? "",
              phone: sup.phone ?? "",
              email: sup.email ?? "",
              website: sup.website ?? "",
              address: sup.address ?? "",
            }}
          />
        </Panel>
        <Panel title="Recent purchase orders">
          {pos.length === 0 ? (
            <p className="text-sm text-neutral">No purchase orders yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pos.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/purchases/${p.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2">
                    <span>
                      <span className="block font-mono text-sm font-semibold text-ink">{p.purchaseNumber}</span>
                      <span className="text-xs text-neutral">{p.purchaseDate.toLocaleDateString()}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge kind="purchase" value={p.purchaseStatus} />
                      <span className="text-sm font-bold text-ink tabular-nums">{formatPrice(p.totalAmount, s.currency)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
