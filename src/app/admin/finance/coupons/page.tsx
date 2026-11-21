import { Plus } from "lucide-react";

import { getStaffContext } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { Button } from "@/shared/components/ui/button";
import { listCoupons } from "@/features/admin/coupons/server/actions";
import { CouponFormDialog } from "@/features/admin/coupons/client/coupon-form-dialog";
import { CouponsList } from "@/features/admin/finance/client/finance-lists";

export const metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const [s, staff, rows] = await Promise.all([getStoreSettings(), getStaffContext(), listCoupons()]);
  const canManage = !!staff?.permissions.has("finance.manage");
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral">Discount codes customers enter at checkout. Redemptions are counted when an order is paid.</p>
        {canManage && <CouponFormDialog trigger={<Button><Plus /> New coupon</Button>} />}
      </div>
      <CouponsList
        currency={s.currency}
        canManage={canManage}
        rows={rows.map((r) => ({
          id: r.id,
          code: r.code,
          discountType: r.discountType,
          discountValue: r.discountValue,
          minOrderAmount: r.minOrderAmount,
          maxRedemptions: r.maxRedemptions,
          redemptionCount: r.redemptionCount,
          startsAt: r.startsAt?.toISOString() ?? null,
          expiresAt: r.expiresAt?.toISOString() ?? null,
          isActive: r.isActive,
        }))}
      />
    </div>
  );
}
