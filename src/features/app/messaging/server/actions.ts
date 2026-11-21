"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/shared/db";
import { message } from "@/shared/db/schema";
import { requireStaff } from "@/shared/authz/can";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { siteConfig } from "@/shared/config/site";
import { getStoreSettings } from "@/shared/store/settings";
import { getResendClient, fromAddress } from "@/features/app/notifications/server/resend";
import { createMessageSchema, type CreateMessageInput } from "./schema";

export type { ActionResult };

/**
 * Public contact form. The message is always stored first; the staff email
 * alert is best-effort on top, so an email outage never loses an enquiry.
 */
export async function createMessage(
  input: CreateMessageInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createMessageSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const d = parsed.data;
  // Honeypot tripped: pretend success, store nothing.
  if (d.website) return ok({ id: "ok" });

  const [created] = await db
    .insert(message)
    .values({
      senderName: d.senderName,
      senderEmail: d.senderEmail,
      senderPhone: d.senderPhone || null,
      subject: d.subject || null,
      body: d.body,
    })
    .returning({ id: message.id });

  try {
    const store = await getStoreSettings();
    const to = store.email || siteConfig.contactEmail;
    await getResendClient().emails.send({
      from: fromAddress(store.name),
      to,
      replyTo: d.senderEmail,
      subject: `Website enquiry: ${d.subject || "(no subject)"}`,
      text: `From: ${d.senderName} <${d.senderEmail}>${d.senderPhone ? ` · ${d.senderPhone}` : ""}\n\n${d.body}`,
    });
    await db.update(message).set({ emailedAt: new Date() }).where(eq(message.id, created.id));
  } catch (err) {
    console.error("[createMessage] notification email failed:", created.id, err);
  }

  revalidatePath("/admin/messages");
  return ok({ id: created.id });
}

export async function listMessages() {
  const auth = await requireStaff();
  if (!auth.ok) return [];
  return db.query.message.findMany({ orderBy: [desc(message.createdAt)], limit: 200 });
}

export async function markMessageRead(messageId: string, isRead = true): Promise<ActionResult> {
  const auth = await requireStaff();
  if (!auth.ok) return fail(auth.error);
  await db.update(message).set({ isRead }).where(eq(message.id, messageId));
  revalidatePath("/admin/messages");
  return ok();
}
