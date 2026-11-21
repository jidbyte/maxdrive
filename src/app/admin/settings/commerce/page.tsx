import { getStaffContext } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { Message } from "@/shared/components/common/message";
import { CommerceSettingsForm, Section } from "@/features/admin/settings/client/settings-forms";

export const metadata = { title: "Store & checkout" };

export default async function CommerceSettingsPage() {
  const [s, staff] = await Promise.all([getStoreSettings(), getStaffContext()]);
  const canEdit = staff?.permissions.has("billing.manage");

  return (
    <Section
      title="Store & checkout"
      description="Delivery, pickup and tax rules applied to every storefront order. Payments are processed by Paystack."
    >
      {!canEdit && (
        <Message variant="info" className="mb-4">
          Only the Owner can change checkout and tax settings.
        </Message>
      )}
      <fieldset disabled={!canEdit}>
        <CommerceSettingsForm
          defaultValues={{
            taxRateBps: s.taxRateBps,
            taxInclusive: s.taxInclusive,
            deliveryEnabled: s.deliveryEnabled,
            pickupEnabled: s.pickupEnabled,
            deliveryFee: s.deliveryFee,
            freeDeliveryThreshold: s.freeDeliveryThreshold,
            lowStockThreshold: s.lowStockThreshold,
          }}
        />
      </fieldset>
    </Section>
  );
}
