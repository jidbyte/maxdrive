import { NextRequest, NextResponse } from "next/server";

import { adminAuth } from "@/shared/lib/firebase/admin";
import { SESSION_COOKIE, syncAppUser } from "@/shared/authz/session";
import { GUEST_CART_COOKIE } from "@/features/storefront/cart/server/identity";
import { mergeGuestCartIntoBuyer } from "@/features/storefront/cart/server/merge";

export const runtime = "nodejs";

const SESSION_DAYS = Math.min(
  Math.max(Number(process.env.SESSION_COOKIE_DAYS ?? 7) || 7, 1),
  14, // Firebase maximum
);
/** Only mint a session from a sign-in that happened in the last 5 minutes. */
const MAX_AUTH_AGE_SECONDS = 5 * 60;

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/** Exchange a fresh Firebase ID token for an httpOnly session cookie. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { idToken?: unknown } | null;
  const idToken = typeof body?.idToken === "string" ? body.idToken : null;
  if (!idToken) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  try {
    const auth = adminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    if (Date.now() / 1000 - decoded.auth_time > MAX_AUTH_AGE_SECONDS) {
      return NextResponse.json(
        { error: "Please sign in again." },
        { status: 401 },
      );
    }

    const expiresIn = SESSION_DAYS * 24 * 60 * 60 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    await syncAppUser({
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
      name: (decoded.name as string | undefined) ?? null,
      picture: decoded.picture ?? null,
      phone: decoded.phone_number ?? null,
    });

    // Carry the guest's cart over to their account.
    const guestId = req.cookies.get(GUEST_CART_COOKIE)?.value;
    if (guestId) {
      await mergeGuestCartIntoBuyer(guestId, decoded.uid).catch((err) =>
        console.error("[api/auth/session] cart merge failed:", err),
      );
    }

    const res = NextResponse.json({ ok: true });
    if (guestId) res.cookies.set(GUEST_CART_COOKIE, "", { path: "/", maxAge: 0 });
    res.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000,
    });
    return res;
  } catch (err) {
    console.error("[api/auth/session] sign-in failed:", err);
    return NextResponse.json(
      { error: "Could not verify your sign-in. Please try again." },
      { status: 401 },
    );
  }
}

/** Sign out. `?everywhere=1` also revokes every session for this user. */
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const value = req.cookies.get(SESSION_COOKIE)?.value;
  if (value && req.nextUrl.searchParams.get("everywhere") === "1") {
    try {
      const decoded = await adminAuth().verifySessionCookie(value);
      await adminAuth().revokeRefreshTokens(decoded.sub);
    } catch {
      // Already invalid — nothing to revoke.
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
