// Server-only. Never throws: a notification failure must not undo or block
// an order. Each channel/recipient is isolated and failures are logged.
import { getSaleById } from "@/features/admin/sales/server/queries";
import { getStoreSettings } from "@/shared/store/settings";
import { siteConfig } from "@/shared/config/site";
import { sendWhatsAppTemplate } from "@/shared/lib/whatsapp";
import { normalizePhoneForWhatsApp } from "@/shared/utils/phone";
import {
  WHATSAPP_TEMPLATE_ORDER_CONFIRMATION_BUYER,
  WHATSAPP_TEMPLATE_NEW_ORDER_SHOP_OWNER,
  WHATSAPP_LANGUAGE_CODE,
} from "@/shared/config/whatsapp";
import { getResendClient, fromAddress } from "./resend";
import { OrderConfirmationBuyerEmail } from "../emails/order-confirmation-buyer";
import { NewOrderStaffEmail } from "../emails/new-order-shop-owner";

async function attempt(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (err) {
    console.error(`[sendOrderNotifications] ${label} failed:`, err);
  }
}

export async function sendOrderNotifications(saleId: string): Promise<void> {
  try {
    const sale = await getSaleById(saleId);
    if (!sale) return console.error("[sendOrderNotifications] sale not found:", saleId);

    const store = await getStoreSettings();
    const appUrl = siteConfig.url.replace(/\/$/, "");
    const paid = sale.paymentStatus === "paid";
    const items = sale.items.map((i) => ({
      name: i.productName,
      quantity: i.quantity,
      subtotal: i.subtotal,
    }));
    const buyerEmail = sale.customerEmail ?? sale.customer?.email ?? null;
    const buyerPhone = sale.customerPhone ?? sale.customer?.phone ?? null;
    const staffEmail = store.orderAlertEmail || store.email;

    if (store.emailNotificationsEnabled && buyerEmail) {
      await attempt("buyer email", () =>
        getResendClient().emails.send({
          from: fromAddress(store.name),
          to: buyerEmail,
          replyTo: store.email ?? undefined,
          subject: `Order ${sale.saleNumber} ${paid ? "confirmed" : "received"} — ${store.name}`,
          react: OrderConfirmationBuyerEmail({
            storeName: store.name,
            buyerName: sale.customerName,
            saleNumber: sale.saleNumber,
            currency: store.currency,
            items,
            subtotal: sale.subtotal,
            discountAmount: sale.discountAmount,
            deliveryFee: sale.deliveryFee,
            total: sale.totalAmount,
            fulfilment: sale.fulfilment,
            paid,
            orderUrl: `${appUrl}/shop/order/${sale.saleNumber}?t=${sale.accessToken}`,
            supportEmail: store.email,
          }),
        }),
      );
    }

    if (store.emailNotificationsEnabled && staffEmail) {
      await attempt("staff email", () =>
        getResendClient().emails.send({
          from: fromAddress(store.name),
          to: staffEmail,
          subject: `New ${paid ? "paid " : ""}order ${sale.saleNumber}`,
          react: NewOrderStaffEmail({
            saleNumber: sale.saleNumber,
            buyerName: sale.customerName,
            buyerEmail: buyerEmail ?? "—",
            buyerPhone: buyerPhone ?? "—",
            fulfilment: sale.fulfilment,
            deliveryAddress: [sale.deliveryAddress, sale.deliveryCity].filter(Boolean).join(", ") || null,
            paid,
            currency: store.currency,
            items,
            total: sale.totalAmount,
            adminUrl: `${appUrl}/admin/orders/${sale.id}`,
            notes: sale.notes,
          }),
        }),
      );
    }

    if (store.whatsappNotificationsEnabled && buyerPhone) {
      const to = normalizePhoneForWhatsApp(buyerPhone, store.currency);
      if (to) {
        await attempt("buyer WhatsApp", async () => {
          const r = await sendWhatsAppTemplate({
            to,
            templateName: WHATSAPP_TEMPLATE_ORDER_CONFIRMATION_BUYER,
            languageCode: WHATSAPP_LANGUAGE_CODE,
            bodyParams: [
              sale.customerName,
              sale.saleNumber,
              store.name,
              store.currency,
              sale.totalAmount.toLocaleString(),
            ],
          });
          if (!r.ok) throw new Error(r.error);
        });
      }
    }

    const staffPhone = store.whatsappPhone || store.phone;
    if (store.whatsappNotificationsEnabled && staffPhone) {
      const to = normalizePhoneForWhatsApp(staffPhone, store.currency);
      if (to) {
        await attempt("staff WhatsApp", async () => {
          const r = await sendWhatsAppTemplate({
            to,
            templateName: WHATSAPP_TEMPLATE_NEW_ORDER_SHOP_OWNER,
            languageCode: WHATSAPP_LANGUAGE_CODE,
            bodyParams: [
              sale.saleNumber,
              sale.customerName,
              store.currency,
              sale.totalAmount.toLocaleString(),
              buyerPhone ?? "—",
            ],
          });
          if (!r.ok) throw new Error(r.error);
        });
      }
    }
  } catch (err) {
    console.error("[sendOrderNotifications] unexpected failure:", err);
  }
}
