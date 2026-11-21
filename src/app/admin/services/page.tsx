import { Wrench } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { listAllServices } from "@/features/workshop/server/queries";
import { ServicesManager } from "@/features/workshop/client/services-manager";
import type { CategoryIconKey } from "@/features/admin/products/category-icons";

export const metadata = { title: "Services" };

export default async function AdminServicesPage() {
  await requireStaffPage("services.manage");
  const [s, services] = await Promise.all([getStoreSettings(), listAllServices()]);

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle icon={Wrench} description="The workshop menu customers can book online. Duration decides how long a slot is held.">
          Services
        </PageTitle>
      </PageHeader>
      <ServicesManager
        currency={s.currency}
        services={services.map((x) => ({
          id: x.id,
          name: x.name,
          category: x.category ?? "",
          summary: x.summary ?? "",
          description: x.description ?? "",
          durationMinutes: x.durationMinutes,
          basePrice: x.basePrice,
          priceIsFrom: x.priceIsFrom,
          icon: (x.icon as CategoryIconKey | null) ?? null,
          isActive: x.isActive,
          sortOrder: x.sortOrder,
        }))}
      />
    </div>
  );
}
