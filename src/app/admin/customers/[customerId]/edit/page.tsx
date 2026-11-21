import { notFound } from "next/navigation";
import { SquarePen } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { BackLink, Panel } from "@/shared/components/admin/panel";
import { getCustomerById } from "@/features/admin/customers/server/queries";
import { CustomerForm } from "@/features/admin/customers/client/customer-form";

export const metadata = { title: "Edit customer" };

export default async function EditCustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  await requireStaffPage("customers.manage");
  const c = await getCustomerById(customerId);
  if (!c) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href={`/admin/customers/${c.id}`}>{c.name}</BackLink>
      <PageHeader>
        <PageTitle icon={SquarePen}>Edit customer</PageTitle>
      </PageHeader>
      <Panel>
        <CustomerForm
          customerId={c.id}
          defaultValues={{
            name: c.name,
            customerType: c.customerType,
            email: c.email ?? "",
            phone: c.phone ?? "",
            address: c.address ?? "",
            city: c.city ?? "",
            notes: c.notes ?? "",
          }}
        />
      </Panel>
    </div>
  );
}
