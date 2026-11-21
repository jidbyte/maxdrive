// Server-only Paystack client. MAXDRIVE is a single merchant, so payments
// settle straight into MAXDRIVE's Paystack account (no subaccounts/splits).
import { createHmac, timingSafeEqual } from "crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  return value;
}

type PaystackResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<PaystackResult<T>> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requiredEnv("PAYSTACK_SECRET_KEY")}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.status) {
    return { ok: false, error: json?.message ?? `Paystack request failed (${res.status}).` };
  }
  return { ok: true, data: json.data as T };
}

/** Our prices are whole currency units; Paystack wants the minor unit (pesewas/kobo/cents). */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export type PaystackInitializeResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export async function initializeTransaction(params: {
  email: string;
  amount: number; // whole currency units
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: { saleId: string; saleNumber: string };
}) {
  return paystackFetch<PaystackInitializeResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: toMinorUnits(params.amount),
      currency: params.currency,
      reference: params.reference,
      callback_url: params.callbackUrl,
      // Paystack documents metadata as a stringified JSON object.
      metadata: JSON.stringify(params.metadata),
    }),
  });
}

export type PaystackVerifyResult = {
  status: "success" | "failed" | "abandoned" | string;
  reference: string;
  amount: number; // minor units
  currency: string;
  channel?: string;
  paid_at?: string | null;
};

export async function verifyTransaction(reference: string) {
  return paystackFetch<PaystackVerifyResult>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
}

export async function refundTransaction(reference: string, amount?: number) {
  return paystackFetch<{ status: string }>("/refund", {
    method: "POST",
    body: JSON.stringify({
      transaction: reference,
      ...(amount !== undefined ? { amount: toMinorUnits(amount) } : {}),
    }),
  });
}

/**
 * HMAC-SHA512 of the RAW request body with the secret key, compared in
 * constant time. Must be computed over the exact bytes Paystack sent.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha512", requiredEnv("PAYSTACK_SECRET_KEY"))
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
