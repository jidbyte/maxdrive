import { Plus } from "lucide-react";

import { getStaffContext } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { Button } from "@/shared/components/ui/button";
import { Stat, StatGrid } from "@/shared/components/admin/panel";
import { listIncome } from "@/features/admin/income/server/actions";
import { IncomeFormDialog } from "@/features/admin/income/client/income-form-dialog";
import { IncomeList } from "@/features/admin/finance/client/finance-lists";

export const metadata = { title: "Income" };

export default async function IncomePage() {
  const [s, staff, rows] = await Promise.all([getStoreSettings(), getStaffContext(), listIncome()]);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const sum = (from: Date) => rows.filter((r) => r.incomeDate >= from).reduce((a, r) => a + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <StatGrid className="flex-1 lg:grid-cols-3">
          <Stat label="This month" value={formatPrice(sum(monthStart), s.currency)} tone="success" />
          <Stat label="This year" value={formatPrice(sum(yearStart), s.currency)} />
          <Stat label="Entries" value={rows.length} />
        </StatGrid>
        {staff?.permissions.has("finance.manage") && <IncomeFormDialog trigger={<Button><Plus /> Add income</Button>} />}
      </div>
      <IncomeList
        currency={s.currency}
        rows={rows.map((r) => ({ id: r.id, source: r.source, description: r.description, amount: r.amount, incomeDate: r.incomeDate.toISOString() }))}
      />
    </div>
  );
}
