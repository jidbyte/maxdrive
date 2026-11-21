import { Settings } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { SettingsNav } from "@/features/admin/shared/client/settings-nav";

export const metadata = { title: "Settings" };

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireStaffPage("settings.manage");
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle icon={Settings} description="Manage how MAXDRIVE runs — business details, checkout, alerts and your team.">
          Settings
        </PageTitle>
      </PageHeader>
      <div className="flex flex-col gap-6 lg:flex-row">
        <SettingsNav />
        <div className="min-w-0 flex-1 space-y-6">{children}</div>
      </div>
    </div>
  );
}
