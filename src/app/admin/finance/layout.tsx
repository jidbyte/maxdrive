import { Wallet } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { FinanceTabs } from "@/features/admin/finance/client/finance-tabs";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  await requireStaffPage("finance.view");
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle icon={Wallet} description="Money in and out of MAXDRIVE.">Finance</PageTitle>
      </PageHeader>
      <FinanceTabs />
      {children}
    </div>
  );
}
