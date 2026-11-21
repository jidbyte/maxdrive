"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/shared/db";
import { auditLog, storeSettings, STORE_SETTINGS_ID } from "@/shared/db/schema";
import { requireCan } from "@/shared/authz/can";
import type { PermissionKey } from "@/shared/db/schema/users";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import {
  commerceSettingsSchema,
  generalSettingsSchema,
  notificationSettingsSchema,
  workshopSettingsSchema,
  type CommerceSettingsInput,
  type GeneralSettingsInput,
  type NotificationSettingsInput,
  type WorkshopSettingsInput,
} from "./schema";

export type { ActionResult };

async function save(
  permission: PermissionKey,
  section: string,
  values: Partial<typeof storeSettings.$inferInsert>,
): Promise<ActionResult> {
  const auth = await requireCan(permission);
  if (!auth.ok) return fail(auth.error);

  await db
    .insert(storeSettings)
    .values({ id: STORE_SETTINGS_ID, ...values })
    .onConflictDoUpdate({ target: storeSettings.id, set: values });
  await db.insert(auditLog).values({
    actorUid: auth.uid,
    action: `settings.${section}`,
    entityType: "store_settings",
    entityId: STORE_SETTINGS_ID,
    metadata: values as Record<string, unknown>,
  });

  revalidatePath("/", "layout");
  return ok();
}

const orNull = (v: string | undefined) => (v ? v : null);

export async function updateGeneralSettings(input: GeneralSettingsInput) {
  const parsed = generalSettingsSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const d = parsed.data;
  return save("settings.manage", "general", {
    name: d.name,
    legalName: orNull(d.legalName),
    tagline: orNull(d.tagline),
    description: orNull(d.description),
    email: orNull(d.email),
    phone: orNull(d.phone),
    whatsappPhone: orNull(d.whatsappPhone),
    address: orNull(d.address),
    city: orNull(d.city),
    currency: d.currency,
  });
}

export async function updateCommerceSettings(input: CommerceSettingsInput) {
  const parsed = commerceSettingsSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  if (!parsed.data.deliveryEnabled && !parsed.data.pickupEnabled) {
    return fail("Enable at least one of delivery or pickup.");
  }
  return save("billing.manage", "commerce", parsed.data);
}

export async function updateWorkshopSettings(input: WorkshopSettingsInput) {
  const parsed = workshopSettingsSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  return save("settings.manage", "workshop", parsed.data);
}

export async function updateNotificationSettings(input: NotificationSettingsInput) {
  const parsed = notificationSettingsSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  return save("settings.manage", "notifications", {
    emailNotificationsEnabled: parsed.data.emailNotificationsEnabled,
    whatsappNotificationsEnabled: parsed.data.whatsappNotificationsEnabled,
    orderAlertEmail: orNull(parsed.data.orderAlertEmail),
  });
}

/** Read for settings forms (staff only). */
export async function readStoreSettings() {
  const auth = await requireCan("settings.manage");
  if (!auth.ok) return null;
  return db.query.storeSettings.findFirst({ where: eq(storeSettings.id, STORE_SETTINGS_ID) });
}
