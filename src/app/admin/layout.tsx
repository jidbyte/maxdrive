import type { Metadata } from "next";
import { and, count, eq, gte, inArray, lt } from "drizzle-orm";

import { db } from "@/shared/db";
import { message, sale, serviceBooking } from "@/shared/db/schema";
import { requireStaffPage } from "@/shared/authz/session";
import { getStoreSettings } from "@/shared/store/settings";
import { addDays, todayIn, zonedToUtc } from "@/shared/lib/zoned-time";
import { AdminShell } from "@/features/admin/shell/admin-shell";
import { visibleNav } from "@/features/admin/shell/nav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · MAXDRIVE Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaffPage(undefined, "/admin");
  const settings = await getStoreSettings();
  const today = todayIn(settings.timezone);
  const dayStart = zonedToUtc(today, "00:00", settings.timezone);
  const dayEnd = zonedToUtc(addDays(today, 1), "00:00", settings.timezone);

  const [[pendingOrders], [unread], [todayBookings]] = await Promise.all([
    staff.permissions.has("orders.read")
      ? db.select({ n: count() }).from(sale).where(eq(sale.status, "processing"))
      : Promise.resolve([{ n: 0 }]),
    db.select({ n: count() }).from(message).where(eq(message.isRead, false)),
    staff.permissions.has("bookings.manage")
      ? db
          .select({ n: count() })
          .from(serviceBooking)
          .where(
            and(
              gte(serviceBooking.scheduledAt, dayStart),
              lt(serviceBooking.scheduledAt, dayEnd),
              inArray(serviceBooking.status, ["requested", "confirmed", "checked_in", "in_progress"]),
            ),
          )
      : Promise.resolve([{ n: 0 }]),
  ]);

  return (
    <AdminShell
      user={{
        name: staff.user.name,
        email: staff.user.email,
        photoUrl: staff.user.photoUrl,
        isStaff: true,
        role: staff.role,
      }}
      nav={visibleNav(staff.permissions)}
      canManageSettings={staff.permissions.has("settings.manage")}
      badges={{
        "/admin/orders": pendingOrders.n,
        "/admin/messages": unread.n,
        "/admin/bookings": todayBookings.n,
      }}
    >
      {children}
    </AdminShell>
  );
}
