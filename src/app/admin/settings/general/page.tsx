import { getStoreSettings } from "@/shared/store/settings";
import { ThemeSelector } from "@/features/admin/shared/client/theme-selector";
import { GeneralSettingsForm, Section } from "@/features/admin/settings/client/settings-forms";

export const metadata = { title: "General settings" };

export default async function GeneralSettingsPage() {
  const s = await getStoreSettings();
  return (
    <>
      <Section title="Business details" description="Shown on the storefront, receipts, invoices and emails.">
        <GeneralSettingsForm
          defaultValues={{
            name: s.name,
            legalName: s.legalName ?? "",
            tagline: s.tagline ?? "",
            description: s.description ?? "",
            email: s.email ?? "",
            phone: s.phone ?? "",
            whatsappPhone: s.whatsappPhone ?? "",
            address: s.address ?? "",
            city: s.city ?? "",
            currency: s.currency,
          }}
        />
      </Section>
      <Section title="Appearance" description="How the dashboard looks on this device.">
        <ThemeSelector />
      </Section>
    </>
  );
}
