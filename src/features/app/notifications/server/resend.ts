import { Resend } from "resend";

import { siteConfig } from "@/shared/config/site";

let client: Resend | null = null;

/** Lazily constructed so a missing RESEND_API_KEY only breaks email sending, not module import. */
export function getResendClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set. Copy .env.example to .env and fill it in.");
    }
    client = new Resend(apiKey);
  }
  return client;
}

/** "<displayName> <RESEND_FROM_EMAIL>" — address must be on a Resend-verified domain. */
export function fromAddress(displayName: string = siteConfig.name): string {
  const address = process.env.RESEND_FROM_EMAIL || "orders@resend.dev";
  return `${displayName} <${address}>`;
}
