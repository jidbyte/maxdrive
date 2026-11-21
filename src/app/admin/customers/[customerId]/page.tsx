import Link from "next/link";
import { notFound } from "next/navigation";
import { Car, Mail, MapPin, MessageCircle, Phone, SquarePen, User } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { formatPrice } from "@/shared/utils/currency";
import { formatInZone } from "@/shared/lib/zoned-time";
import { normalizePhoneForWhatsApp } from "@/shared/utils/phone";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { PageAction, PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { BackLink, Panel, Stat, StatGrid } from "@/shared/components/admin/panel";
import { StatusBadge } from "@/shared/components/admin/status-badge";
import { getCustomerActivity, getCustomerById } from "@/features/admin/customers/server/queries";
import { DeleteCustomerButton } from "@/features/admin/customers/client/delete-customer-button";
import { BOOKING_STATUS_META } from "@/features/workshop/status";

export const metadata = { title: "Customer" };

export default async function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const staff = await requireStaffPage("customers.manage");
  const [s, c] = await Promise.all([getStoreSettings(), getCustomerById(customerId)]);
  if (!c) notFound();
  const { orders, bookings } = await getCustomerActivity(c.id);

  const money = (n: number) => formatPrice(n, s.currency);
  const live = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
  const spent = live.filter((o) => o.paymentStatus === "paid").reduce((a, o) => a + o.totalAmount, 0);
  const owed = live.reduce((a, o) => a + o.balance, 0);
  const wa = c.phone ? normalizePhoneForWhatsApp(c.phone, s.currency) : null;
  const canBook = staff.permissions.has("bookings.manage");

  return (
    <div className="space-y-6">
      <BackLink href="/admin/customers">Customers</BackLink>
      <PageHeader>
        <PageTitle
          icon={User}
          description={
            <span className="flex flex-wrap items-center gap-2">
              Customer since {c.createdAt.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
              {c.customerType === "business" && <Badge variant="secondary">Business</Badge>}
              {c.buyerUid && <Badge variant="outline">Has account</Badge>}
            </span>
          }
        >
          {c.name}
        </PageTitle>
        <PageAction>
          {staff.permissions.has("orders.manage") && <Button asChild variant="outline"><Link href="/admin/orders/new">New sale</Link></Button>}
          <Button asChild><Link href={`/admin/customers/${c.id}/edit`}><SquarePen /> Edit</Link></Button>
          <DeleteCustomerButton customerId={c.id} />
        </PageAction>
      </PageHeader>

      <StatGrid>
        <Stat label="Orders" value={live.length} />
        <Stat label="Lifetime spend" value={money(spent)} />
        <Stat label="Balance owed" value={money(owed)} tone={owed ? "warning" : undefined} />
        <Stat label="Workshop visits" value={bookings.filter((b) => b.status === "completed").length} hint={`${bookings.length} booking${bookings.length === 1 ? "" : "s"}`} />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Panel title="Orders">
            {orders.length === 0 ? (
              <p className="text-sm text-neutral">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-3 hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block font-mono text-sm font-semibold text-ink">{o.saleNumber}</span>
                        <span className="text-xs text-neutral">{o.saleDate.toLocaleDateString()}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="hidden sm:inline"><StatusBadge kind="order" value={o.status} /></span>
                        <StatusBadge kind="payment" value={o.paymentStatus} />
                        <span className="w-24 text-right font-bold text-ink tabular-nums">{money(o.totalAmount)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Workshop bookings">
            {bookings.length === 0 ? (
              <p className="text-sm text-neutral">No bookings.</p>
            ) : (
              <ul className="divide-y divide-border">
                {bookings.map((b) => {
                  const meta = BOOKING_STATUS_META[b.status];
                  const row = (
                    <>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">
                          {formatInZone(b.scheduledAt, s.timezone, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="block truncate text-xs text-neutral">{b.items.map((i) => i.serviceName).join(", ")} · {b.vehicleDescription}</span>
                      </span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </>
                  );
                  return (
                    <li key={b.id}>
                      {canBook ? (
                        <Link href={`/admin/bookings/${b.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-3 hover:bg-surface-2">{row}</Link>
                      ) : (
                        <div className="flex items-center justify-between gap-3 py-3">{row}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Contact">
            <div className="space-y-2 text-sm">
              {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-ink hover:text-primary"><Phone className="size-4 text-neutral" /> {c.phone}</a>}
              {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-ink hover:text-primary"><MessageCircle className="size-4 text-neutral" /> WhatsApp</a>}
              {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-ink hover:text-primary"><Mail className="size-4 text-neutral" /> {c.email}</a>}
              {(c.address || c.city) && <p className="flex items-start gap-2 text-ink"><MapPin className="mt-0.5 size-4 text-neutral" /> {[c.address, c.city].filter(Boolean).join(", ")}</p>}
              {!c.phone && !c.email && !c.address && <p className="text-neutral">No contact details.</p>}
            </div>
            {c.notes && <p className="mt-4 rounded-xl bg-surface-2 px-3 py-2 text-sm whitespace-pre-line text-ink">{c.notes}</p>}
          </Panel>
          <Panel title="Vehicles">
            {c.vehicles.filter((v) => !v.deletedAt).length === 0 ? (
              <p className="text-sm text-neutral">No saved vehicles.</p>
            ) : (
              <ul className="space-y-2">
                {c.vehicles.filter((v) => !v.deletedAt).map((v) => (
                  <li key={v.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
                    <Car className="size-4 text-primary" />
                    <span>
                      <span className="block font-semibold text-ink">{[v.year, v.makeName, v.modelName].filter(Boolean).join(" ")}</span>
                      {v.plateNumber && <span className="font-mono text-xs text-neutral">{v.plateNumber}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
