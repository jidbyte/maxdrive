import Link from "next/link";
import { desc } from "drizzle-orm";
import { LayoutDashboard, Plus, ShieldAlert } from "lucide-react";

import { db } from "@/shared/db";
import { sale } from "@/shared/db/schema";
import { getStaffContext } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { getCurrencySymbol } from "@/shared/config/currencies";
import { resolveDateRange } from "@/features/admin/analytics/server/date-range";
import {
  getRangeSalesStats,
  getRangePurchasesStats,
  getRevenueProfitSeries,
  getCurrentPurchasesStats,
  getInventoryOverview,
  getTopProductsBySales,
} from "@/features/admin/analytics/server/queries";
import { RevenueProfitChartCard } from "@/features/admin/analytics/client/revenue-profit-chart";
import { DateRangeFilter } from "@/features/admin/analytics/client/date-range-filter";
import {
  LowStockCard,
  RecentSalesCard,
  BestSellingProductsCard,
} from "@/features/admin/analytics/client/dashboard-cards";
import { DashboardStats } from "@/features/admin/analytics/client/dashboard-stats";
import { PageAction, PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { Button } from "@/shared/components/ui/button";
import { Message } from "@/shared/components/common/message";

export const metadata = { title: "Overview" };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; denied?: string }>;
}) {
  const sp = await searchParams;
  const staff = (await getStaffContext())!;
  const store = await getStoreSettings();
  const range = resolveDateRange(sp);
  const canSeeNumbers = staff.permissions.has("reports.view") || staff.permissions.has("finance.view");

  // const firstName = staff.user.name?.split(" ")[0];
  // const greeting = (() => {
  //   const h = new Date().getHours();
  //   return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  // })();

  const header = (
    <PageHeader>
      <PageTitle
        icon={LayoutDashboard}
        description={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      >
        {/* {greeting}
        {firstName ? `, ${firstName}` : ""} */}
        Dashboard
      </PageTitle>
      <PageAction>
        {canSeeNumbers && <DateRangeFilter basePath="/admin" range={range} />}
        {staff.permissions.has("orders.manage") && (
          <Button asChild>
            <Link href="/admin/orders/new">
              <Plus /> New sale
            </Link>
          </Button>
        )}
      </PageAction>
    </PageHeader>
  );

  const denied = sp.denied ? (
    <Message variant="warning">
      <span className="inline-flex items-center gap-1.5">
        <ShieldAlert className="size-4" /> Your role doesn&apos;t have access to that page.
      </span>
    </Message>
  ) : null;

  if (!canSeeNumbers) {
    return (
      <div className="space-y-6">
        {header}
        {denied}
        <p className="text-neutral">Use the menu to get to the areas your role ({staff.role}) can access.</p>
      </div>
    );
  }

  const [rangeSales, rangePurchases, series, currentPurchases, inventory, recentSales, topProducts] = await Promise.all(
    [
      getRangeSalesStats(range.start, range.end),
      getRangePurchasesStats(range.start, range.end),
      getRevenueProfitSeries(range.start, range.end, range.granularity),
      getCurrentPurchasesStats(),
      getInventoryOverview(),
      db.query.sale.findMany({ orderBy: [desc(sale.createdAt)], limit: 6 }),
      getTopProductsBySales(range.start, range.end, 5),
    ],
  );

  const currencySymbol = getCurrencySymbol(store.currency);
  const netProfit = series.reduce((sum, d) => sum + d.profit, 0);

  return (
    <div className="space-y-6">
      {header}
      {denied}

      <DashboardStats
        currencySymbol={currencySymbol}
        totalSalesRevenue={rangeSales.totalRevenue}
        netProfit={netProfit}
        totalSalesCount={rangeSales.totalSalesCount}
        inventorySpend={rangePurchases.totalSpent}
        pendingPurchaseOrders={currentPurchases.pendingCount}
        totalInventoryValue={inventory.totalInventoryValue}
        totalStockQuantity={inventory.totalStockQuantity}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueProfitChartCard data={series} currency={currencySymbol} />
        </div>
        <LowStockCard products={inventory.lowStockProducts} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentSalesCard sales={recentSales} currencySymbol={currencySymbol} />
        <BestSellingProductsCard products={topProducts} currencySymbol={currencySymbol} />
      </div>
    </div>
  );
}
