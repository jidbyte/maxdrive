"use server";

import { and, eq, gt, ilike, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/shared/db";
import { appUser, auditLog, invitation, role, staffMember } from "@/shared/db/schema";
import { ROLE_NAMES, type RoleName } from "@/shared/db/schema/users";
import { requireCan, requireUser } from "@/shared/authz/can";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { siteConfig } from "@/shared/config/site";
import { getStoreSettings } from "@/shared/store/settings";
import { getResendClient, fromAddress } from "@/features/app/notifications/server/resend";

export type { ActionResult };

const INVITATION_TTL_DAYS = 7;

const inviteSchema = z.object({
  email: z.email("Enter a valid email").max(160),
  roleName: z.enum(ROLE_NAMES),
});

const revalidateTeam = () => revalidatePath("/admin/settings/team");

/** Only an Owner may grant or change the Owner role. */
function canAssign(actorRole: RoleName, target: RoleName) {
  return target !== "Owner" || actorRole === "Owner";
}

export async function createInvitation(
  email: string,
  roleName: RoleName,
): Promise<ActionResult<{ inviteUrl: string; emailed: boolean }>> {
  const auth = await requireCan("users.invite");
  if (!auth.ok) return fail(auth.error);

  const parsed = inviteSchema.safeParse({ email: email?.trim().toLowerCase(), roleName });
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const d = parsed.data;
  if (!canAssign(auth.staff.role, d.roleName)) return fail("Only an Owner can invite another Owner.");

  const targetRole = await db.query.role.findFirst({ where: eq(role.name, d.roleName) });
  if (!targetRole) return fail("Roles aren't set up yet — run `npm run db:seed`.");

  const existingUser = await db.query.appUser.findFirst({
    where: ilike(appUser.email, d.email),
    with: { staff: true },
  });
  if (existingUser?.staff) return fail("That person is already on the team.");

  const pending = await db.query.invitation.findFirst({
    where: and(
      ilike(invitation.email, d.email),
      eq(invitation.status, "pending"),
      gt(invitation.expiresAt, new Date()),
    ),
  });
  if (pending) return fail("There's already a pending invitation for that email.");

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await db.insert(invitation).values({
    email: d.email,
    roleId: targetRole.id,
    token,
    invitedByUserId: auth.userId,
    expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 86_400_000),
  });

  const inviteUrl = `${siteConfig.url.replace(/\/$/, "")}/invite/${token}`;
  let emailed = false;
  try {
    const store = await getStoreSettings();
    await getResendClient().emails.send({
      from: fromAddress(store.name),
      to: d.email,
      subject: `You've been invited to join ${store.name}`,
      text: `${auth.staff.user.name ?? "A teammate"} invited you to join the ${store.name} team as ${d.roleName}.\n\nAccept the invitation (valid for ${INVITATION_TTL_DAYS} days):\n${inviteUrl}`,
    });
    emailed = true;
  } catch (err) {
    console.error("[createInvitation] email failed:", err);
  }

  await db.insert(auditLog).values({
    actorUid: auth.uid,
    action: "staff.invite",
    entityType: "invitation",
    entityId: null,
    metadata: { email: d.email, role: d.roleName },
  });

  revalidateTeam();
  return ok({ inviteUrl, emailed });
}

/** Called by /invite/[token] once the invitee is signed in. */
export async function acceptInvitation(token: string): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth.ok) return fail("Sign in to accept this invitation.");
  if (typeof token !== "string" || token.length > 128) return fail("That invitation is invalid.");

  const invite = await db.query.invitation.findFirst({ where: eq(invitation.token, token) });
  if (!invite) return fail("That invitation is invalid.");
  if (invite.status !== "pending") return fail("That invitation has already been used.");
  if (invite.expiresAt < new Date()) {
    await db.update(invitation).set({ status: "expired" }).where(eq(invitation.id, invite.id));
    return fail("That invitation has expired. Ask for a new one.");
  }
  // The invite is bound to an email address.
  if (!auth.user.email || auth.user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return fail(`This invitation was sent to ${invite.email}. Sign in with that email to accept it.`);
  }
  if (!auth.user.emailVerified) {
    return fail("Please verify your email address first, then accept the invitation.");
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(staffMember)
      .values({ userId: auth.user.id, roleId: invite.roleId })
      .onConflictDoUpdate({ target: staffMember.userId, set: { roleId: invite.roleId } });
    await tx.update(invitation).set({ status: "accepted" }).where(eq(invitation.id, invite.id));
    await tx.insert(auditLog).values({
      actorUid: auth.uid,
      action: "staff.join",
      entityType: "staff_member",
      entityId: auth.user.id,
      metadata: { invitationId: invite.id },
    });
  });

  revalidateTeam();
  return ok();
}

export async function revokeInvitation(invitationId: string): Promise<ActionResult> {
  const auth = await requireCan("users.invite");
  if (!auth.ok) return fail(auth.error);
  await db
    .update(invitation)
    .set({ status: "revoked" })
    .where(and(eq(invitation.id, invitationId), eq(invitation.status, "pending")));
  revalidateTeam();
  return ok();
}

export async function changeStaffRole(staffId: string, roleName: RoleName): Promise<ActionResult> {
  const auth = await requireCan("users.remove");
  if (!auth.ok) return fail(auth.error);
  if (!ROLE_NAMES.includes(roleName)) return fail("Invalid role.");
  if (!canAssign(auth.staff.role, roleName)) return fail("Only an Owner can grant the Owner role.");
  if (staffId === auth.staff.staffId) return fail("You can't change your own role.");

  const member = await db.query.staffMember.findFirst({
    where: eq(staffMember.id, staffId),
    with: { role: true },
  });
  if (!member) return fail("Team member not found.");
  if (member.role.name === "Owner" && auth.staff.role !== "Owner") {
    return fail("Only an Owner can change another Owner's role.");
  }
  if (member.role.name === "Owner" && roleName !== "Owner" && (await ownerCount()) <= 1) {
    return fail("There must always be at least one Owner.");
  }

  const target = await db.query.role.findFirst({ where: eq(role.name, roleName) });
  if (!target) return fail("Invalid role.");
  await db.update(staffMember).set({ roleId: target.id }).where(eq(staffMember.id, staffId));
  await db.insert(auditLog).values({
    actorUid: auth.uid,
    action: "staff.role_change",
    entityType: "staff_member",
    entityId: staffId,
    metadata: { from: member.role.name, to: roleName },
  });

  revalidateTeam();
  return ok();
}

export async function removeStaff(staffId: string): Promise<ActionResult> {
  const auth = await requireCan("users.remove");
  if (!auth.ok) return fail(auth.error);
  if (staffId === auth.staff.staffId) return fail("You can't remove yourself.");

  const member = await db.query.staffMember.findFirst({
    where: eq(staffMember.id, staffId),
    with: { role: true },
  });
  if (!member) return fail("Team member not found.");
  if (member.role.name === "Owner" && auth.staff.role !== "Owner") {
    return fail("Only an Owner can remove another Owner.");
  }
  if (member.role.name === "Owner" && (await ownerCount()) <= 1) {
    return fail("There must always be at least one Owner.");
  }

  await db.delete(staffMember).where(eq(staffMember.id, staffId));
  await db.insert(auditLog).values({
    actorUid: auth.uid,
    action: "staff.remove",
    entityType: "staff_member",
    entityId: staffId,
  });

  revalidateTeam();
  return ok();
}

async function ownerCount() {
  const owners = await db
    .select({ id: staffMember.id })
    .from(staffMember)
    .innerJoin(role, eq(role.id, staffMember.roleId))
    .where(eq(role.name, "Owner"));
  return owners.length;
}

export async function listTeam() {
  const auth = await requireCan("users.invite");
  if (!auth.ok) return { members: [], invitations: [], currentStaffId: null };
  const [members, invitations] = await Promise.all([
    db.query.staffMember.findMany({
      with: {
        role: { columns: { name: true } },
        user: { columns: { id: true, name: true, email: true, photoUrl: true, lastSignInAt: true } },
      },
      orderBy: (s, { asc }) => [asc(s.createdAt)],
    }),
    db.query.invitation.findMany({
      where: and(eq(invitation.status, "pending"), ne(invitation.email, "")),
      with: { role: { columns: { name: true } } },
      orderBy: (i, { desc }) => [desc(i.createdAt)],
    }),
  ]);
  return { members, invitations, currentStaffId: auth.staff.staffId };
}
