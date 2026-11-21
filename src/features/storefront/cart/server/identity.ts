import { cookies } from "next/headers";

import { getSession } from "@/shared/authz/session";

export const GUEST_CART_COOKIE = "md_guest";
const GUEST_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export type CartIdentity =
  | { kind: "buyer"; buyerUid: string }
  | { kind: "guest"; guestId: string }
  | { kind: "none" };

/** Read-only: safe in Server Components (can't set cookies there). */
export async function getCartIdentity(): Promise<CartIdentity> {
  const session = await getSession();
  if (session) return { kind: "buyer", buyerUid: session.uid };
  const guestId = (await cookies()).get(GUEST_CART_COOKIE)?.value;
  return guestId ? { kind: "guest", guestId } : { kind: "none" };
}

/** Mutating: only from Server Actions / Route Handlers. Mints a guest cookie if needed. */
export async function getOrCreateCartIdentity(): Promise<
  Exclude<CartIdentity, { kind: "none" }>
> {
  const session = await getSession();
  if (session) return { kind: "buyer", buyerUid: session.uid };

  const store = await cookies();
  let guestId = store.get(GUEST_CART_COOKIE)?.value;
  if (!guestId) {
    guestId = crypto.randomUUID();
    store.set(GUEST_CART_COOKIE, guestId, {
      maxAge: GUEST_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  return { kind: "guest", guestId };
}
