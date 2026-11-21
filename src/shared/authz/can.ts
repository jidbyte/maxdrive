import type { PermissionKey } from "@/shared/db/schema/users";
import {
  getCurrentUser,
  getStaffContext,
  type CurrentUser,
  type StaffContext,
} from "./session";

/**
 * Server-action guards. Server actions are public endpoints — a layout
 * guard does NOT protect them — so every mutating action must call one of
 * these first and bail out on `ok: false`:
 *
 *   const auth = await requireCan("products.manage");
 *   if (!auth.ok) return { success: false, error: auth.error };
 *
 * Hidden buttons are only a convenience; this is the security boundary.
 */

export type StaffAuthResult =
  | { ok: true; staff: StaffContext; uid: string; userId: string }
  | { ok: false; error: string };

export type UserAuthResult =
  | { ok: true; user: CurrentUser; uid: string }
  | { ok: false; error: string };

export async function requireUser(): Promise<UserAuthResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return { ok: true, user, uid: user.authUid };
}

export async function requireStaff(): Promise<StaffAuthResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  const staff = await getStaffContext();
  if (!staff) return { ok: false, error: "This action is only available to MAXDRIVE staff." };
  return { ok: true, staff, uid: user.authUid, userId: user.id };
}

export async function requireCan(permission: PermissionKey): Promise<StaffAuthResult> {
  const result = await requireStaff();
  if (!result.ok) return result;
  if (!result.staff.permissions.has(permission)) {
    return { ok: false, error: "You don't have permission to do that." };
  }
  return result;
}

/** Non-throwing check for UI decisions (show/hide), e.g. in server components. */
export async function can(permission: PermissionKey): Promise<boolean> {
  const staff = await getStaffContext();
  return !!staff?.permissions.has(permission);
}
