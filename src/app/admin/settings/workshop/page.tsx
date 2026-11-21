import { getStoreSettings } from "@/shared/store/settings";
import { Section } from "@/features/admin/settings/client/settings-forms";
import { WorkshopSettingsForm } from "@/features/admin/settings/client/workshop-settings-form";

export const metadata = { title: "Workshop & bookings" };

export default async function WorkshopSettingsPage() {
  const s = await getStoreSettings();
  return (
    <Section
      title="Workshop & bookings"
      description="Controls which time slots customers can book online. Opening hours also show on the website."
    >
      <WorkshopSettingsForm
        defaultValues={{
          onlineBookingEnabled: s.onlineBookingEnabled,
          timezone: s.timezone,
          bookingSlotMinutes: s.bookingSlotMinutes,
          workshopBays: s.workshopBays,
          bookingLeadMinutes: s.bookingLeadMinutes,
          bookingWindowDays: s.bookingWindowDays,
          openingHours: s.openingHours,
        }}
      />
    </Section>
  );
}
