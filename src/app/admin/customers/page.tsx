import Link from "next/link";
import { UserPlus, Users } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { Button } from "@/shared/components/ui/button";
import { PageAction, PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { Stat, StatGrid } from "@/shared/components/admin/panel";
import { listCustomersWithStats } from "@/features/admin/customers/server/queries";
import { CustomersList } from "@/features/admin/customers/client/customers-list";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  await requireStaffPage("customers.manage");
  const [s, rows] = await Promise.all([getStoreSettings(), listCustomersWithStats()]);
  const buyers = rows.filter((r) => r.orders > 0);
  const repeat = rows.filter((r) => r.orders > 1);
  const totalSpent = rows.reduce((a, r) => a + r.spent, 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle icon={Users} description="Everyone who has bought, booked or been added by staff.">Customers</PageTitle>
        <PageAction>
          <Button asChild><Link href="/admin/customers/new"><UserPlus /> Add customer</Link></Button>
        </PageAction>
      </PageHeader>
      <StatGrid>
        <Stat label="Customers" value={rows.length.toLocaleString()} hint={`${rows.filter((r) => r.createdAt >= monthStart).length} new this month`} />
        <Stat label="Have purchased" value={buyers.length.toLocaleString()} />
        <Stat label="Repeat rate" value={buyers.length ? `${Math.round((repeat.length / buyers.length) * 100)}%` : "—"} hint={`${repeat.length} repeat customers`} />
        <Stat label="Avg. lifetime value" value={formatPrice(buyers.length ? Math.round(totalSpent / buyers.length) : 0, s.currency)} />
      </StatGrid>
      <CustomersList
        currency={s.currency}
        customers={rows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          city: r.city,
          customerType: r.customerType,
          hasAccount: r.hasAccount,
          orders: r.orders,
          spent: r.spent,
          lastOrder: r.lastOrder ? new Date(r.lastOrder).toISOString() : null,
        }))}
      />
    </div>
  );
}
