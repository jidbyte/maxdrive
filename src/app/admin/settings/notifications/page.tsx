import { getStoreSettings } from "@/shared/store/settings";
import { NotificationSettingsForm, Section } from "@/features/admin/settings/client/settings-forms";

export const metadata = { title: "Notifications" };

export default async function NotificationsSettingsPage() {
  const s = await getStoreSettings();
  return (
    <Section title="Order notifications" description="Who gets told about new orders, and how.">
      <NotificationSettingsForm
        defaultValues={{
          emailNotificationsEnabled: s.emailNotificationsEnabled,
          whatsappNotificationsEnabled: s.whatsappNotificationsEnabled,
          orderAlertEmail: s.orderAlertEmail ?? "",
        }}
      />
    </Section>
  );
}
