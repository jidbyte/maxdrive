import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/shared/db";
import { appUser, staffMember } from "@/shared/db/schema";
import type { PermissionKey, RoleName } from "@/shared/db/schema/users";
import { adminAuth } from "@/shared/lib/firebase/admin";

export const SESSION_COOKIE = "__session";

export type SessionClaims = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
  phone: string | null;
};

/**
 * Verifies the httpOnly session cookie (including revocation) once per
 * request. Returns null when signed out or the session is invalid/expired.
 */
export const getSession = cache(async (): Promise<SessionClaims | null> => {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    const d = await adminAuth().verifySessionCookie(value, true);
    return {
      uid: d.uid,
      email: d.email ?? null,
      emailVerified: d.email_verified ?? false,
      name: (d.name as string | undefined) ?? null,
      picture: d.picture ?? null,
      phone: d.phone_number ?? null,
    };
  } catch {
    return null;
  }
});

export type CurrentUser = {
  id: string;
  authUid: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  emailVerified: boolean;
};

/**
 * Upserts the local app_user mirror for a verified Firebase identity.
 * Called on sign-in (session route) and lazily on first request.
 */
export async function syncAppUser(claims: SessionClaims): Promise<CurrentUser> {
  const [row] = await db
    .insert(appUser)
    .values({
      authUid: claims.uid,
      email: claims.email,
      name: claims.name,
      phone: claims.phone,
      photoUrl: claims.picture,
      lastSignInAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appUser.authUid,
      set: {
        email: claims.email,
        // Don't overwrite a name/phone the user set in their profile with null.
        ...(claims.name ? { name: claims.name } : {}),
        ...(claims.phone ? { phone: claims.phone } : {}),
        ...(claims.picture ? { photoUrl: claims.picture } : {}),
      },
    })
    .returning();
  return {
    id: row.id,
    authUid: row.authUid,
    name: row.name,
    email: row.email,
    phone: row.phone,
    photoUrl: row.photoUrl,
    emailVerified: claims.emailVerified,
  };
}

/** The signed-in user (customer or staff), or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const claims = await getSession();
  if (!claims) return null;

  const existing = await db.query.appUser.findFirst({
    where: eq(appUser.authUid, claims.uid),
  });
  if (!existing) return syncAppUser(claims);
  return {
    id: existing.id,
    authUid: existing.authUid,
    name: existing.name,
    email: existing.email,
    phone: existing.phone,
    photoUrl: existing.photoUrl,
    emailVerified: claims.emailVerified,
  };
});

export type StaffContext = {
  user: CurrentUser;
  staffId: string;
  role: RoleName;
  jobTitle: string | null;
  permissions: ReadonlySet<PermissionKey>;
};

/** Staff membership + effective permissions for the signed-in user, or null. */
export const getStaffContext = cache(async (): Promise<StaffContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const member = await db.query.staffMember.findFirst({
    where: eq(staffMember.userId, user.id),
    with: {
      role: {
        with: { rolePermissions: { with: { permission: { columns: { key: true } } } } },
      },
    },
  });
  if (!member) return null;

  return {
    user,
    staffId: member.id,
    role: member.role.name,
    jobTitle: member.jobTitle,
    permissions: new Set(
      member.role.rolePermissions.map((rp) => rp.permission.key as PermissionKey),
    ),
  };
});

// ─── Page guards (redirect) ──────────────────────────────────────────────

function signInUrl(next?: string) {
  return next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in";
}

/** For pages: signed-in user or redirect to /sign-in. */
export async function requireUserPage(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(signInUrl(next));
  return user;
}

/**
 * For admin pages: staff (optionally with a permission) or redirect.
 * Non-staff are sent to their customer account; staff lacking the
 * permission are sent back to the dashboard with a notice.
 */
export async function requireStaffPage(
  permission?: PermissionKey,
  next?: string,
): Promise<StaffContext> {
  const user = await getCurrentUser();
  if (!user) redirect(signInUrl(next ?? "/admin"));
  const staff = await getStaffContext();
  if (!staff) redirect("/account?notice=staff-only");
  if (permission && !staff.permissions.has(permission)) {
    redirect(`/admin?denied=${encodeURIComponent(permission)}`);
  }
  return staff;
}
