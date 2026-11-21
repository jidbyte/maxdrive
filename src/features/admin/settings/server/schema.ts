import { z } from "zod";

import { CURRENCIES } from "@/shared/config/currencies";

const currencyCodes = CURRENCIES.map((c) => c.code) as [string, ...string[]];
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const generalSettingsSchema = z.object({
  name: z.string().trim().min(2, "Required").max(80),
  legalName: optionalText(120),
  tagline: optionalText(120),
  description: optionalText(1000),
  email: z.email("Enter a valid email").optional().or(z.literal("")),
  phone: optionalText(30),
  whatsappPhone: optionalText(30),
  address: optionalText(240),
  city: optionalText(80),
  currency: z.enum(currencyCodes),
});
export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;

export const commerceSettingsSchema = z.object({
  taxRateBps: z.number().int().min(0).max(5000),
  taxInclusive: z.boolean(),
  deliveryEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  deliveryFee: z.number().int().min(0),
  freeDeliveryThreshold: z.number().int().min(0).nullable(),
  lowStockThreshold: z.number().int().min(0).max(10000),
});
export type CommerceSettingsInput = z.infer<typeof commerceSettingsSchema>;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const workshopSettingsSchema = z.object({
  onlineBookingEnabled: z.boolean(),
  timezone: z.string().refine(isTimeZone, "Unknown timezone"),
  bookingSlotMinutes: z.number().int().refine((n) => [15, 20, 30, 45, 60].includes(n), "Choose a slot length"),
  workshopBays: z.number().int().min(1, "At least 1 bay").max(50),
  bookingLeadMinutes: z.number().int().min(0).max(7 * 24 * 60),
  bookingWindowDays: z.number().int().min(1).max(180),
  openingHours: z
    .array(
      z
        .object({ day: z.number().int().min(0).max(6), open: time, close: time, closed: z.boolean() })
        .refine((h) => h.closed || h.open < h.close, "Closing time must be after opening time"),
    )
    .length(7),
});
export type WorkshopSettingsInput = z.infer<typeof workshopSettingsSchema>;

export const notificationSettingsSchema = z.object({
  emailNotificationsEnabled: z.boolean(),
  whatsappNotificationsEnabled: z.boolean(),
  orderAlertEmail: z.email("Enter a valid email").optional().or(z.literal("")),
});
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
