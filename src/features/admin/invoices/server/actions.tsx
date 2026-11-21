"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";

import { db } from "@/shared/db";
import { invoice, invoiceItem } from "@/shared/db/schema";
import { requireCan } from "@/shared/authz/can";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { documentNumber, NUMBER_PREFIX } from "@/shared/lib/numbers";
import { uploadBufferToR2 } from "@/shared/lib/r2";
import { sendWhatsAppTemplate } from "@/shared/lib/whatsapp";
import { normalizePhoneForWhatsApp } from "@/shared/utils/phone";
import { WHATSAPP_TEMPLATE_INVOICE_READY, WHATSAPP_LANGUAGE_CODE } from "@/shared/config/whatsapp";
import { getStoreSettings } from "@/shared/store/settings";
import { getSaleById } from "@/features/admin/sales/server/queries";
import { getResendClient, fromAddress } from "@/features/app/notifications/server/resend";
import { InvoiceDocument, type InvoicePdfData } from "./pdf";
import { createInvoiceFromSaleSchema, type CreateInvoiceFromSaleInput } from "./schema";

export type { ActionResult };

const revalidate = () => revalidatePath("/admin/finance/invoices");

export async function listInvoices() {
  const auth = await requireCan("finance.view");
  if (!auth.ok) return [];
  return db.query.invoice.findMany({ orderBy: [desc(invoice.createdAt)] });
}

export async function createInvoiceFromSale(
  input: CreateInvoiceFromSaleInput,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCan("finance.manage");
  if (!auth.ok) return fail(auth.error);

  const parsed = createInvoiceFromSaleSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));

  const sale = await getSaleById(parsed.data.saleId);
  if (!sale) return fail("Sale not found.");

  const existing = await db.query.invoice.findFirst({
    where: eq(invoice.saleId, sale.id),
    columns: { id: true },
  });
  if (existing) return fail("This sale already has an invoice.");

  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(invoice)
      .values({
        invoiceNumber: documentNumber(NUMBER_PREFIX.invoice),
        saleId: sale.id,
        customerId: sale.customerId,
        customerName: sale.customerName,
        customerEmail: sale.customerEmail ?? sale.customer?.email ?? null,
        customerPhone: sale.customerPhone ?? sale.customer?.phone ?? null,
        issueDate: new Date(),
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        subtotal: sale.subtotal,
        discountAmount: sale.discountAmount,
        totalAmount: sale.totalAmount,
        status: sale.paymentStatus === "paid" ? "paid" : "draft",
        notes: parsed.data.notes || null,
      })
      .returning({ id: invoice.id });

    await tx.insert(invoiceItem).values(
      sale.items.map((item) => ({
        invoiceId: created.id,
        description: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
    );
    return created.id;
  });

  revalidate();
  return ok({ id });
}

async function renderAndStorePdf(invoiceId: string): Promise<ActionResult<{ pdfUrl: string }>> {
  const record = await db.query.invoice.findFirst({
    where: eq(invoice.id, invoiceId),
    with: { items: true },
  });
  if (!record) return fail("Invoice not found.");

  const store = await getStoreSettings();
  const data: InvoicePdfData = {
    shopName: store.legalName || store.name,
    shopEmail: store.email,
    shopPhone: store.phone,
    shopAddress: [store.address, store.city].filter(Boolean).join(", ") || null,
    invoiceNumber: record.invoiceNumber,
    issueDate: record.issueDate,
    dueDate: record.dueDate,
    customerName: record.customerName,
    customerEmail: record.customerEmail,
    customerPhone: record.customerPhone,
    items: record.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
    })),
    subtotal: record.subtotal,
    discountAmount: record.discountAmount,
    totalAmount: record.totalAmount,
    currency: store.currency,
    notes: record.notes,
  };

  const key = `invoices/${record.invoiceNumber}.pdf`;
  let pdfUrl: string;
  try {
    const buffer = await renderToBuffer(<InvoiceDocument data={data} />);
    pdfUrl = await uploadBufferToR2(key, buffer, "application/pdf");
  } catch (err) {
    console.error("[invoice pdf] failed:", err);
    return fail("Couldn't generate the PDF. Please try again.");
  }

  await db.update(invoice).set({ pdfUrl, pdfFileKey: key }).where(eq(invoice.id, invoiceId));
  return ok({ pdfUrl });
}

export async function generateInvoicePdf(
  invoiceId: string,
): Promise<ActionResult<{ pdfUrl: string }>> {
  const auth = await requireCan("finance.manage");
  if (!auth.ok) return fail(auth.error);
  const result = await renderAndStorePdf(invoiceId);
  revalidate();
  return result;
}

async function ensurePdf(invoiceId: string): Promise<ActionResult<{ pdfUrl: string }>> {
  const record = await db.query.invoice.findFirst({
    where: eq(invoice.id, invoiceId),
    columns: { pdfUrl: true },
  });
  if (!record) return fail("Invoice not found.");
  if (record.pdfUrl) return ok({ pdfUrl: record.pdfUrl });
  return renderAndStorePdf(invoiceId);
}

export async function sendInvoiceByEmail(invoiceId: string): Promise<ActionResult> {
  const auth = await requireCan("finance.manage");
  if (!auth.ok) return fail(auth.error);

  const record = await db.query.invoice.findFirst({ where: eq(invoice.id, invoiceId) });
  if (!record) return fail("Invoice not found.");
  if (!record.customerEmail) return fail("This invoice's customer has no email on file.");

  const pdf = await ensurePdf(invoiceId);
  if (!pdf.success) return pdf;

  const store = await getStoreSettings();
  try {
    await getResendClient().emails.send({
      from: fromAddress(store.name),
      to: record.customerEmail,
      subject: `Invoice ${record.invoiceNumber} from ${store.name}`,
      text: `Hi ${record.customerName},\n\nYour invoice ${record.invoiceNumber} is ready. View or download it here:\n${pdf.data.pdfUrl}\n\nThank you,\n${store.name}`,
    });
  } catch (err) {
    console.error("[sendInvoiceByEmail] failed:", err);
    return fail("Couldn't send the email. Please try again.");
  }

  await db
    .update(invoice)
    .set({ sentViaEmail: new Date(), status: record.status === "draft" ? "sent" : record.status })
    .where(eq(invoice.id, invoiceId));

  revalidate();
  return ok();
}

export async function sendInvoiceByWhatsapp(invoiceId: string): Promise<ActionResult> {
  const auth = await requireCan("finance.manage");
  if (!auth.ok) return fail(auth.error);

  const record = await db.query.invoice.findFirst({ where: eq(invoice.id, invoiceId) });
  if (!record) return fail("Invoice not found.");
  if (!record.customerPhone) return fail("This invoice's customer has no phone number on file.");

  const store = await getStoreSettings();
  const phone = normalizePhoneForWhatsApp(record.customerPhone, store.currency);
  if (!phone) return fail("This customer's phone number isn't valid for WhatsApp.");

  const pdf = await ensurePdf(invoiceId);
  if (!pdf.success) return pdf;

  const result = await sendWhatsAppTemplate({
    to: phone,
    templateName: WHATSAPP_TEMPLATE_INVOICE_READY,
    languageCode: WHATSAPP_LANGUAGE_CODE,
    bodyParams: [
      record.customerName,
      record.invoiceNumber,
      store.name,
      store.currency,
      String(record.totalAmount),
      pdf.data.pdfUrl,
    ],
  });
  if (!result.ok) return fail(result.error);

  await db
    .update(invoice)
    .set({ sentViaWhatsapp: new Date(), status: record.status === "draft" ? "sent" : record.status })
    .where(eq(invoice.id, invoiceId));

  revalidate();
  return ok();
}

export async function markInvoicePaid(invoiceId: string): Promise<ActionResult> {
  const auth = await requireCan("finance.manage");
  if (!auth.ok) return fail(auth.error);
  const [row] = await db
    .update(invoice)
    .set({ status: "paid" })
    .where(eq(invoice.id, invoiceId))
    .returning({ id: invoice.id });
  if (!row) return fail("Invoice not found.");
  revalidate();
  return ok();
}

export async function voidInvoice(invoiceId: string): Promise<ActionResult> {
  const auth = await requireCan("finance.manage");
  if (!auth.ok) return fail(auth.error);
  const [row] = await db
    .update(invoice)
    .set({ status: "void" })
    .where(eq(invoice.id, invoiceId))
    .returning({ id: invoice.id });
  if (!row) return fail("Invoice not found.");
  revalidate();
  return ok();
}
