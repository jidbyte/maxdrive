import Link from "next/link";
import { and, gte, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { ArrowRight } from "lucide-react";

import { db } from "@/shared/db";
import { expense, income, invoice, purchase, sale } from "@/shared/db/schema";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { Panel, Stat, StatGrid } from "@/shared/components/admin/panel";

export const metadata = { title: "Finance" };

export default async function FinanceOverviewPage() {
  const s = await getStoreSettings();
  const money = (n: number) => formatPrice(n, s.currency);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthLabel = monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const [[sales], [otherIncome], expenseByCat, [receivable], [unpaidInvoices], [payable]] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${sale.totalAmount}), 0)::int`, n: sql<number>`count(*)::int` })
      .from(sale)
      .where(and(gte(sale.saleDate, monthStart), sql`${sale.paymentStatus} = 'paid'`, notInArray(sale.status, ["cancelled", "refunded"]))),
    db
      .select({ total: sql<number>`coalesce(sum(${income.amount}), 0)::int` })
      .from(income)
      .where(and(gte(income.incomeDate, monthStart), isNull(income.deletedAt))),
    db
      .select({ category: expense.category, total: sql<number>`coalesce(sum(${expense.amount}), 0)::int` })
      .from(expense)
      .where(and(gte(expense.expenseDate, monthStart), isNull(expense.deletedAt)))
      .groupBy(expense.category),
    db
      .select({ total: sql<number>`coalesce(sum(${sale.balance}), 0)::int`, n: sql<number>`count(*) filter (where ${sale.balance} > 0)::int` })
      .from(sale)
      .where(notInArray(sale.status, ["cancelled", "refunded"])),
    db
      .select({ total: sql<number>`coalesce(sum(${invoice.totalAmount}), 0)::int`, n: sql<number>`count(*)::int` })
      .from(invoice)
      .where(inArray(invoice.status, ["draft", "sent", "overdue"])),
    db
      .select({ total: sql<number>`coalesce(sum(${purchase.totalAmount}), 0)::int` })
      .from(purchase)
      .where(and(sql`${purchase.paymentStatus} <> 'paid'`, notInArray(purchase.purchaseStatus, ["draft", "cancelled"]))),
  ]);

  const expensesTotal = expenseByCat.reduce((a, r) => a + r.total, 0);
  const net = sales.total + otherIncome.total - expensesTotal;

  return (
    <div className="space-y-6">
      <p className="text-sm font-semibold text-neutral">{monthLabel}</p>
      <StatGrid>
        <Stat label="Sales (paid)" value={money(sales.total)} hint={`${sales.n} orders`} />
        <Stat label="Other income" value={money(otherIncome.total)} />
        <Stat label="Expenses" value={money(expensesTotal)} />
        <Stat label="Net (before stock cost)" value={money(net)} tone={net >= 0 ? "success" : "danger"} />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="To collect & to pay">
          <ul className="divide-y divide-border text-sm">
            <li className="flex items-center justify-between py-3">
              <span><span className="block font-semibold text-ink">Customer balances</span><span className="text-xs text-neutral">{receivable.n} orders with money due</span></span>
              <span className="font-bold text-warning tabular-nums">{money(receivable.total)}</span>
            </li>
            <li className="flex items-center justify-between py-3">
              <span><span className="block font-semibold text-ink">Unpaid invoices</span><span className="text-xs text-neutral">{unpaidInvoices.n} open</span></span>
              <span className="font-bold text-ink tabular-nums">{money(unpaidInvoices.total)}</span>
            </li>
            <li className="flex items-center justify-between py-3">
              <span><span className="block font-semibold text-ink">Owed to suppliers</span><span className="text-xs text-neutral">Ordered or received, not yet paid</span></span>
              <span className="font-bold text-ink tabular-nums">{money(payable.total)}</span>
            </li>
          </ul>
        </Panel>

        <Panel title="Expenses by category" actions={<Link href="/admin/finance/expenses" className="flex items-center gap-1 text-sm font-semibold text-primary">All <ArrowRight className="size-4" /></Link>}>
          {expenseByCat.length === 0 ? (
            <p className="text-sm text-neutral">No expenses this month.</p>
          ) : (
            <ul className="space-y-3">
              {expenseByCat.sort((a, b) => b.total - a.total).map((r) => (
                <li key={r.category}>
                  <div className="flex justify-between text-sm">
                    <span className="capitalize text-ink">{r.category}</span>
                    <span className="font-semibold text-ink tabular-nums">{money(r.total)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${expensesTotal ? (r.total / expensesTotal) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="text-xs text-neutral">
        For profit after cost of goods, see <Link href="/admin/reports" className="font-semibold text-primary">Reports</Link>.
      </p>
    </div>
  );
}
