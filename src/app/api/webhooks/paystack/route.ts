import { NextRequest, NextResponse } from "next/server";

import { verifyWebhookSignature } from "@/shared/lib/paystack";
import { completeOnlinePayment } from "@/features/storefront/checkout/server/complete";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Signature is computed over the exact raw bytes Paystack sent.
  const rawBody = await req.text();
  if (!verifyWebhookSignature(rawBody, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  if (event.event === "charge.success" && event.data?.reference) {
    const result = await completeOnlinePayment(event.data.reference);
    if (!result.ok) {
      console.error("[webhooks/paystack] completion failed:", result.error);
      // Non-2xx only for transient failures, so Paystack retries those.
      if (result.retryable) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
