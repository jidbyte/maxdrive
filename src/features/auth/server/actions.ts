"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/shared/db";
import { appUser, customer } from "@/shared/db/schema";
import { requireUser } from "@/shared/authz/can";
import { adminAuth } from "@/shared/lib/firebase/admin";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { siteConfig } from "@/shared/config/site";
import { getStoreSettings } from "@/shared/store/settings";
import { getResendClient, fromAddress } from "@/features/app/notifications/server/resend";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export async function updateProfile(input: { name: string; phone?: string }): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth.ok) return fail(auth.error);
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));

  await db
    .update(appUser)
    .set({ name: parsed.data.name, phone: parsed.data.phone || null })
    .where(eq(appUser.id, auth.user.id));
  await db
    .update(customer)
    .set({ name: parsed.data.name, ...(parsed.data.phone ? { phone: parsed.data.phone } : {}) })
    .where(eq(customer.buyerUid, auth.uid));
  await adminAuth()
    .updateUser(auth.uid, { displayName: parsed.data.name })
    .catch((err) => console.error("[updateProfile] firebase displayName", err));

  revalidatePath("/account", "layout");
  return ok();
}

/** Emails a fresh verification link (generated server-side, sent via Resend). */
export async function resendVerificationEmail(): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth.ok) return fail(auth.error);
  if (!auth.user.email) return fail("Your account has no email address.");
  if (auth.user.emailVerified) return fail("Your email is already verified.");

  try {
    const link = await adminAuth().generateEmailVerificationLink(auth.user.email, {
      url: `${siteConfig.url.replace(/\/$/, "")}/account`,
    });
    const store = await getStoreSettings();
    await getResendClient().emails.send({
      from: fromAddress(store.name),
      to: auth.user.email,
      subject: `Verify your email for ${store.name}`,
      text: `Hi${auth.user.name ? ` ${auth.user.name.split(" ")[0]}` : ""},\n\nConfirm your email address by opening this link:\n${link}\n\nIf you didn't create a ${store.name} account, you can ignore this email.`,
    });
    return ok();
  } catch (err) {
    console.error("[resendVerificationEmail]", err);
    return fail("Couldn't send the email right now. Please try again later.");
  }
}
