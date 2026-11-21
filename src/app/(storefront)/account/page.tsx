import Link from "next/link";
import { ArrowRight, Car, LayoutDashboard, Package, ShieldAlert } from "lucide-react";

import { getCurrentUser, getStaffContext } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { Button } from "@/shared/components/ui/button";
import { Message } from "@/shared/components/common/message";
import { listOrdersForBuyer } from "@/features/admin/sales/server/queries";
import { getCustomerByBuyerUid } from "@/features/admin/customers/server/queries";
import { getSelectedVehicle } from "@/features/storefront/catalog/server/vehicle";

export const metadata = { title: "Overview" };

export default async function AccountOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const user = (await getCurrentUser())!;
  const [staff, settings, customer, vehicle] = await Promise.all([
    getStaffContext(),
    getStoreSettings(),
    getCustomerByBuyerUid(user.authUid),
    getSelectedVehicle(),
  ]);
  const orders = await listOrdersForBuyer(user.authUid, customer?.id);
  const recent = orders.slice(0, 3);

  return (
    <div className="space-y-6">
      {notice === "staff-only" && (
        <Message variant="warning">
          <span className="inline-flex items-center gap-1.5">
            <ShieldAlert className="size-4" /> That area is for MAXDRIVE staff only.
          </span>
        </Message>
      )}
      {!user.emailVerified && user.email && (
        <Message variant="info">Please verify your email — check your inbox for the link we sent when you signed up.</Message>
      )}

      {staff && (
        <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink">
            You&apos;re signed in as <b>{staff.role}</b> on the MAXDRIVE team.
          </p>
          <Button asChild>
            <Link href="/admin">
              <LayoutDashboard /> Open admin
            </Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <Package className="size-6 text-primary" />
          <p className="mt-3 text-3xl font-extrabold text-ink">{orders.length}</p>
          <p className="text-sm text-neutral">Orders placed</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <Car className="size-6 text-primary" />
          <p className="mt-3 truncate text-lg font-bold text-ink">{vehicle?.label ?? "No vehicle saved"}</p>
          <Link href={vehicle ? "/shop?fits=1" : "/"} className="text-sm font-semibold text-primary">
            {vehicle ? "Shop parts that fit →" : "Choose your vehicle →"}
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Recent orders</h2>
          {orders.length > 3 && (
            <Link href="/account/orders" className="text-sm font-semibold text-primary">View all</Link>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-neutral">You haven&apos;t placed any orders yet.</p>
            <Button asChild className="mt-4">
              <Link href="/shop">Start shopping <ArrowRight /></Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/shop/order/${o.saleNumber}`}
                  className="-mx-2 flex items-center justify-between gap-4 rounded-2xl px-2 py-3 hover:bg-surface-2"
                >
                  <span>
                    <span className="block font-mono text-sm font-bold text-ink">{o.saleNumber}</span>
                    <span className="text-xs text-neutral">
                      {o.createdAt.toLocaleDateString()} · {o.items.length} item{o.items.length === 1 ? "" : "s"} ·{" "}
                      <span className="capitalize">{o.status}</span>
                    </span>
                  </span>
                  <span className="font-bold text-ink tabular-nums">{formatPrice(o.totalAmount, settings.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
