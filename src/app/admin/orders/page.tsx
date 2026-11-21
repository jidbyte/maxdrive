import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { Plus, ShoppingBag } from "lucide-react";

import { db } from "@/shared/db";
import { sale, saleItem } from "@/shared/db/schema";
import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { todayIn, zonedToUtc } from "@/shared/lib/zoned-time";
import { Button } from "@/shared/components/ui/button";
import { PageAction, PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { Stat, StatGrid } from "@/shared/components/admin/panel";
import { OrdersList } from "@/features/admin/sales/client/orders-list";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const staff = await requireStaffPage("orders.read");
  const s = await getStoreSettings();
  const startOfToday = zonedToUtc(todayIn(s.timezone), "00:00", s.timezone);

  const rows = await db
    .select({
      id: sale.id,
      saleNumber: sale.saleNumber,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      channel: sale.channel,
      fulfilment: sale.fulfilment,
      status: sale.status,
      paymentStatus: sale.paymentStatus,
      totalAmount: sale.totalAmount,
      balance: sale.balance,
      saleDate: sale.saleDate,
      createdAt: sale.createdAt,
      itemCount: sql<number>`(select coalesce(sum(${saleItem.quantity}), 0)::int from ${saleItem} where ${saleItem.saleId} = ${sale.id})`,
    })
    .from(sale)
    .orderBy(desc(sale.createdAt))
    .limit(2000);

  const live = rows.filter((r) => r.status !== "cancelled" && r.status !== "refunded");
  const toFulfil = live.filter((r) => ["processing", "ready", "shipped"].includes(r.status)).length;
  const unpaid = live.filter((r) => ["pending", "partial", "overdue"].includes(r.paymentStatus));
  const today = live.filter((r) => r.createdAt >= startOfToday && r.paymentStatus === "paid");
  const money = (n: number) => formatPrice(n, s.currency);

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle icon={ShoppingBag} description="Online orders and in-store sales in one place.">
          Orders
        </PageTitle>
        {staff.permissions.has("orders.manage") && (
          <PageAction>
            <Button asChild>
              <Link href="/admin/orders/new">
                <Plus /> Record sale
              </Link>
            </Button>
          </PageAction>
        )}
      </PageHeader>

      <StatGrid>
        <Stat label="To fulfil" value={toFulfil} tone={toFulfil ? "warning" : undefined} hint="Paid, not yet completed" />
        <Stat label="Awaiting payment" value={unpaid.length} hint={money(unpaid.reduce((a, r) => a + r.balance, 0)) + " outstanding"} />
        <Stat label="Paid today" value={money(today.reduce((a, r) => a + r.totalAmount, 0))} hint={`${today.length} order${today.length === 1 ? "" : "s"}`} />
        <Stat label="All orders" value={rows.length.toLocaleString()} />
      </StatGrid>

      <OrdersList
        currency={s.currency}
        orders={rows.map((r) => ({ ...r, saleDate: r.saleDate.toISOString() }))}
      />
    </div>
  );
}
