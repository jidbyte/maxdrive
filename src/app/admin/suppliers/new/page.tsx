import { Factory } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { BackLink, Panel } from "@/shared/components/admin/panel";
import { SupplierForm } from "@/features/admin/suppliers/client/supplier-form";

export const metadata = { title: "Add supplier" };

export default async function NewSupplierPage() {
  await requireStaffPage("suppliers.manage");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href="/admin/suppliers">Suppliers</BackLink>
      <PageHeader>
        <PageTitle icon={Factory}>Add supplier</PageTitle>
      </PageHeader>
      <Panel>
        <SupplierForm />
      </Panel>
    </div>
  );
}
