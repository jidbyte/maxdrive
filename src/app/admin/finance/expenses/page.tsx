import { Plus } from "lucide-react";

import { getStaffContext } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { Button } from "@/shared/components/ui/button";
import { Stat, StatGrid } from "@/shared/components/admin/panel";
import { listExpenses } from "@/features/admin/expenses/server/actions";
import { ExpenseFormDialog } from "@/features/admin/expenses/client/expense-form-dialog";
import { ExpensesList } from "@/features/admin/finance/client/finance-lists";

export const metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  const [s, staff, rows] = await Promise.all([getStoreSettings(), getStaffContext(), listExpenses()]);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const thisMonth = rows.filter((r) => r.expenseDate >= monthStart).reduce((a, r) => a + r.amount, 0);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const thisYear = rows.filter((r) => r.expenseDate >= yearStart).reduce((a, r) => a + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <StatGrid className="flex-1 lg:grid-cols-3">
          <Stat label="This month" value={formatPrice(thisMonth, s.currency)} />
          <Stat label="This year" value={formatPrice(thisYear, s.currency)} />
          <Stat label="Entries" value={rows.length} />
        </StatGrid>
        {staff?.permissions.has("finance.manage") && (
          <ExpenseFormDialog trigger={<Button><Plus /> Add expense</Button>} />
        )}
      </div>
      <ExpensesList
        currency={s.currency}
        rows={rows.map((r) => ({ id: r.id, category: r.category, description: r.description, amount: r.amount, expenseDate: r.expenseDate.toISOString() }))}
      />
    </div>
  );
}
