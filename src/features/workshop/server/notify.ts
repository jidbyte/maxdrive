// Server-only. Never throws — a failed email must not undo a booking.
import { eq } from "drizzle-orm";

import { db } from "@/shared/db";
import { serviceBooking } from "@/shared/db/schema";
import { siteConfig } from "@/shared/config/site";
import { getStoreSettings } from "@/shared/store/settings";
import { formatInZone } from "@/shared/lib/zoned-time";
import { getResendClient, fromAddress } from "@/features/app/notifications/server/resend";

type Kind = "created" | "confirmed" | "cancelled" | "rescheduled";

export async function sendBookingNotifications(bookingId: string, kind: Kind): Promise<void> {
  try {
    const b = await db.query.serviceBooking.findFirst({
      where: eq(serviceBooking.id, bookingId),
      with: { items: true },
    });
    if (!b) return;
    const s = await getStoreSettings();
    if (!s.emailNotificationsEnabled) return;

    const when = formatInZone(b.scheduledAt, s.timezone, {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    const services = b.items.map((i) => `• ${i.serviceName}`).join("\n");
    const url = `${siteConfig.url.replace(/\/$/, "")}/services/booking/${b.bookingNumber}?t=${b.accessToken}`;
    const where = [s.address, s.city].filter(Boolean).join(", ");
    const resend = getResendClient();

    const subject: Record<Kind, string> = {
      created: `Booking confirmed — ${when}`,
      confirmed: `Booking confirmed — ${when}`,
      rescheduled: `Booking moved to ${when}`,
      cancelled: `Booking ${b.bookingNumber} cancelled`,
    };

    if (b.customerEmail) {
      const lead =
        kind === "cancelled"
          ? `Your booking ${b.bookingNumber} has been cancelled.`
          : `Your workshop booking is confirmed for ${when}${where ? ` at ${where}` : ""}.`;
      await resend.emails
        .send({
          from: fromAddress(s.name),
          to: b.customerEmail,
          replyTo: s.email ?? undefined,
          subject: subject[kind],
          text: `Hi ${b.customerName.split(" ")[0]},\n\n${lead}\n\nVehicle: ${b.vehicleDescription}\nServices:\n${services}\n\nView or cancel your booking: ${url}\n\n${s.phone ? `Questions? Call us on ${s.phone}.\n` : ""}— ${s.name}`,
        })
        .catch((err) => console.error("[booking notify] customer email", err));
    }

    const staffEmail = s.orderAlertEmail || s.email;
    if (staffEmail && (kind === "created" || kind === "cancelled")) {
      await resend.emails
        .send({
          from: fromAddress(s.name),
          to: staffEmail,
          subject: kind === "created" ? `New booking ${b.bookingNumber} — ${when}` : `Booking ${b.bookingNumber} cancelled by customer`,
          text: `${b.customerName} · ${b.customerPhone}${b.customerEmail ? ` · ${b.customerEmail}` : ""}\n${when}\nVehicle: ${b.vehicleDescription}\nServices:\n${services}\n${b.customerNotes ? `\nNotes: ${b.customerNotes}\n` : ""}\nOpen: ${siteConfig.url.replace(/\/$/, "")}/admin/bookings/${b.id}`,
        })
        .catch((err) => console.error("[booking notify] staff email", err));
    }
  } catch (err) {
    console.error("[sendBookingNotifications]", err);
  }
}
