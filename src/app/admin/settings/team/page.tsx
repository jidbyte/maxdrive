import { getStaffContext } from "@/shared/authz/session";
import { Message } from "@/shared/components/common/message";
import { listTeam } from "@/features/admin/team/server/actions";
import { TeamPanel } from "@/features/admin/team/client/team-panel";
import { Section } from "@/features/admin/settings/client/settings-forms";

export const metadata = { title: "Team & roles" };

export default async function TeamSettingsPage() {
  const staff = (await getStaffContext())!;
  if (!staff.permissions.has("users.invite")) {
    return (
      <Section title="Team & roles">
        <Message variant="info">Your role can&apos;t manage the team.</Message>
      </Section>
    );
  }

  const { members, invitations, currentStaffId } = await listTeam();
  return (
    <Section title="Team & roles" description="Invite staff and control what each person can access.">
      <TeamPanel
        members={members.map((m) => ({
          id: m.id,
          role: m.role.name,
          user: {
            name: m.user.name,
            email: m.user.email,
            photoUrl: m.user.photoUrl,
            lastSignInAt: m.user.lastSignInAt,
          },
        }))}
        invitations={invitations.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role.name,
          expiresAt: i.expiresAt,
        }))}
        currentStaffId={currentStaffId}
        canManage={staff.permissions.has("users.remove")}
        isOwner={staff.role === "Owner"}
      />
    </Section>
  );
}
