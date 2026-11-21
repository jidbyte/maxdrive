import Link from "next/link";
import { Factory, Plus } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { Button } from "@/shared/components/ui/button";
import { PageAction, PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { listSuppliersWithStats } from "@/features/admin/suppliers/server/queries";
import { SuppliersList } from "@/features/admin/suppliers/client/suppliers-list";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  await requireStaffPage("suppliers.manage");
  const [s, rows] = await Promise.all([getStoreSettings(), listSuppliersWithStats()]);
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle icon={Factory} description="The companies you buy stock from.">Suppliers</PageTitle>
        <PageAction>
          <Button asChild variant="ghost"><Link href="/admin/purchases">Purchases</Link></Button>
          <Button asChild><Link href="/admin/suppliers/new"><Plus /> Add supplier</Link></Button>
        </PageAction>
      </PageHeader>
      <SuppliersList
        currency={s.currency}
        suppliers={rows.map((r) => ({ ...r, lastOrder: r.lastOrder ? new Date(r.lastOrder).toISOString() : null }))}
      />
    </div>
  );
}
