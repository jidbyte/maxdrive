import { getCurrentUser, getStaffContext } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { getCartIdentity } from "@/features/storefront/cart/server/identity";
import { getCartView } from "@/features/storefront/cart/server/queries";
import { getSelectedVehicle } from "@/features/storefront/catalog/server/vehicle";
import { SiteHeaderClient } from "./site-header-client";

export async function SiteHeader() {
  const [user, staff, settings, cart, vehicle] = await Promise.all([
    getCurrentUser(),
    getStaffContext(),
    getStoreSettings(),
    getCartIdentity().then(getCartView),
    getSelectedVehicle(),
  ]);

  const announcement =
    settings.deliveryEnabled && settings.freeDeliveryThreshold
      ? `Free delivery on orders over ${formatPrice(settings.freeDeliveryThreshold, settings.currency)} · Genuine & OEM-grade parts`
      : "Genuine & OEM-grade parts · Expert workshop service";

  return (
    <SiteHeaderClient
      user={
        user
          ? {
              name: user.name,
              email: user.email,
              photoUrl: user.photoUrl,
              isStaff: !!staff,
              role: staff?.role ?? null,
            }
          : null
      }
      cartCount={cart.itemCount}
      vehicleLabel={vehicle?.label ?? null}
      currency={settings.currency}
      announcement={announcement}
    />
  );
}
