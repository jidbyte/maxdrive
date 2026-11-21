import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 Proxy (formerly middleware). Runs on the Node.js runtime
 * before private routes render, and bounces signed-out visitors to
 * /sign-in, keeping where they were headed in ?next=.
 *
 * It only checks that a session cookie EXISTS. Real verification
 * (signature, expiry, revocation, staff role, permission) happens
 * server-side in every page, action and route handler via shared/authz.
 * Proxy is an optimistic gate, never the security boundary.
 */
const SESSION_COOKIE = "__session";

export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
