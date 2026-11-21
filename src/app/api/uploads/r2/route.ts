import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireCan } from "@/shared/authz/can";
import { createPresignedUploadUrl, publicUrlForKey } from "@/shared/lib/r2";

export const runtime = "nodejs";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

const bodySchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.enum(ALLOWED, { message: "Upload a JPG, PNG, WebP or AVIF image" }),
  folder: z.enum(["products", "brand", "categories"]).default("products"),
});

/** Presigned direct-to-R2 upload URL for staff image uploads. */
export async function POST(req: NextRequest) {
  const auth = await requireCan("products.manage");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { fileName, contentType, folder } = parsed.data;

  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-80);
  const fileKey = `assets/${folder}/${crypto.randomUUID()}-${safeName}`;

  try {
    const uploadUrl = await createPresignedUploadUrl(fileKey, contentType);
    return NextResponse.json({ uploadUrl, fileKey, publicUrl: publicUrlForKey(fileKey) });
  } catch (err) {
    console.error("[api/uploads/r2] presign failed:", err);
    return NextResponse.json(
      { error: "Image storage isn't configured yet. Check your R2 env vars." },
      { status: 500 },
    );
  }
}
