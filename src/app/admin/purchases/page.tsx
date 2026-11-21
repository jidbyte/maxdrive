import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { Plus, Truck } from "lucide-react";

import { db } from "@/shared/db";
import { purchase, purchaseItem } from "@/shared/db/schema";
import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { Button } from "@/shared/components/ui/button";
import { PageAction, PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { Stat, StatGrid } from "@/shared/components/admin/panel";
import { PurchasesList } from "@/features/admin/purchases/client/purchases-list";

export const metadata = { title: "Purchases" };

export default async function PurchasesPage() {
  await requireStaffPage("purchases.manage");
  const s = await getStoreSettings();
  const rows = await db
    .select({
      id: purchase.id,
      purchaseNumber: purchase.purchaseNumber,
      supplierName: purchase.supplierName,
      purchaseStatus: purchase.purchaseStatus,
      paymentStatus: purchase.paymentStatus,
      totalAmount: purchase.totalAmount,
      purchaseDate: purchase.purchaseDate,
      eta: purchase.eta,
      itemCount: sql<number>`(select coalesce(sum(${purchaseItem.quantity}), 0)::int from ${purchaseItem} where ${purchaseItem.purchaseId} = ${purchase.id})`,
    })
    .from(purchase)
    .orderBy(desc(purchase.createdAt))
    .limit(2000);

  const money = (n: number) => formatPrice(n, s.currency);
  const open = rows.filter((r) => ["draft", "ordered", "shipped"].includes(r.purchaseStatus));
  const transit = rows.filter((r) => r.purchaseStatus === "shipped");
  const owed = rows.filter((r) => r.paymentStatus !== "paid" && r.purchaseStatus !== "cancelled" && r.purchaseStatus !== "draft");
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const received = rows.filter((r) => r.purchaseStatus === "received" && r.purchaseDate >= monthStart);

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle icon={Truck} description="Stock ordered from suppliers. Receiving an order adds it to inventory.">
          Purchases
        </PageTitle>
        <PageAction>
          <Button asChild variant="ghost"><Link href="/admin/suppliers">Suppliers</Link></Button>
          <Button asChild><Link href="/admin/purchases/new"><Plus /> New purchase order</Link></Button>
        </PageAction>
      </PageHeader>

      <StatGrid>
        <Stat label="Open orders" value={open.length} hint={money(open.reduce((a, r) => a + r.totalAmount, 0))} />
        <Stat label="In transit" value={transit.length} hint={money(transit.reduce((a, r) => a + r.totalAmount, 0))} />
        <Stat label="Owed to suppliers" value={money(owed.reduce((a, r) => a + r.totalAmount, 0))} tone={owed.length ? "warning" : undefined} hint={`${owed.length} unpaid`} />
        <Stat label="Received this month" value={money(received.reduce((a, r) => a + r.totalAmount, 0))} />
      </StatGrid>

      <PurchasesList
        currency={s.currency}
        purchases={rows.map((r) => ({ ...r, purchaseDate: r.purchaseDate.toISOString(), eta: r.eta?.toISOString() ?? null }))}
      />
    </div>
  );
}
