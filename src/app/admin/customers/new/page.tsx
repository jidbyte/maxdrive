import { UserPlus } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { BackLink, Panel } from "@/shared/components/admin/panel";
import { CustomerForm } from "@/features/admin/customers/client/customer-form";

export const metadata = { title: "Add customer" };

export default async function NewCustomerPage() {
  await requireStaffPage("customers.manage");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href="/admin/customers">Customers</BackLink>
      <PageHeader>
        <PageTitle icon={UserPlus}>Add customer</PageTitle>
      </PageHeader>
      <Panel>
        <CustomerForm />
      </Panel>
    </div>
  );
}
