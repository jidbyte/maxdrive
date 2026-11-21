/**
 * Static brand configuration for MAXDRIVE.
 *
 * Business details that staff can edit at runtime (phone, address, opening
 * hours, currency, notification toggles, …) live in the `store_settings`
 * table instead — see src/shared/db/schema/store.ts.
 */
export const siteConfig = {
  name: "MAXDRIVE",
  legalName: "MAXDRIVE Autoparts & Service",
  tagline: "Parts that fit. Service you trust.",
  description:
    "MAXDRIVE — genuine and OEM-grade auto parts matched to your vehicle, plus certified workshop servicing. Shop online or book a service.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://maxdrive.com",
  contactEmail: "hello@maxdrive.com",
  supportEmail: "support@maxdrive.com",
  social: {
    x: "https://x.com/maxdrive",
    facebook: "https://facebook.com/maxdrive",
    instagram: "https://instagram.com/maxdrive",
    tiktok: "https://tiktok.com/@maxdrive",
  },
} as const;
