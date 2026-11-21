"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, MailPlus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { FormField } from "@/shared/components/common/form-field";
import { Avatar } from "@/shared/components/app/user-menu";
import { useActionTransition } from "@/shared/hooks/use-action-transition";
import { ROLE_DESCRIPTIONS, ROLE_NAMES, type RoleName } from "@/shared/db/schema/users";
import {
  changeStaffRole,
  createInvitation,
  removeStaff,
  revokeInvitation,
} from "@/features/admin/team/server/actions";

export type TeamMember = {
  id: string;
  role: RoleName;
  user: { name: string | null; email: string | null; photoUrl: string | null; lastSignInAt: Date | null };
};
export type TeamInvitation = { id: string; email: string; role: RoleName; expiresAt: Date };

const selectClass =
  "h-9 rounded-full border border-input bg-surface px-3 text-sm text-ink outline-none focus-visible:border-primary";

export function TeamPanel({
  members,
  invitations,
  currentStaffId,
  canManage,
  isOwner,
}: {
  members: TeamMember[];
  invitations: TeamInvitation[];
  currentStaffId: string | null;
  canManage: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [isPending, start] = useActionTransition();

  function run(fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) {
    start(async () => {
      const r = await fn();
      if (!r.success) toast.error(r.error ?? "Something went wrong");
      else toast.success(okMsg);
      router.refresh();
    });
  }

  const assignable = ROLE_NAMES.filter((r) => isOwner || r !== "Owner");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral">
          {members.length} team member{members.length === 1 ? "" : "s"}
        </p>
        <InviteDialog assignable={assignable} />
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {members.map((m) => {
          const isSelf = m.id === currentStaffId;
          return (
            <li key={m.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar user={m.user} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {m.user.name || m.user.email} {isSelf && <span className="text-neutral">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-neutral">
                    {m.user.email}
                    {m.user.lastSignInAt && ` · last active ${new Date(m.user.lastSignInAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManage && !isSelf && (isOwner || m.role !== "Owner") ? (
                  <select
                    aria-label={`Role for ${m.user.email}`}
                    className={selectClass}
                    defaultValue={m.role}
                    disabled={isPending}
                    onChange={(e) =>
                      run(() => changeStaffRole(m.id, e.target.value as RoleName), "Role updated")
                    }
                  >
                    {assignable.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge variant={m.role === "Owner" ? "default" : "secondary"}>{m.role}</Badge>
                )}
                {canManage && !isSelf && (isOwner || m.role !== "Owner") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${m.user.email}`}
                    disabled={isPending}
                    onClick={() => {
                      if (confirm(`Remove ${m.user.name || m.user.email} from the team?`)) {
                        run(() => removeStaff(m.id), "Team member removed");
                      }
                    }}
                  >
                    <Trash2 className="text-danger" />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {invitations.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-ink">Pending invitations</h3>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-dashed border-border">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{inv.email}</p>
                  <p className="text-xs text-neutral">Expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                </div>
                <Badge variant="outline">{inv.role}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Revoke invitation for ${inv.email}`}
                  disabled={isPending}
                  onClick={() => run(() => revokeInvitation(inv.id), "Invitation revoked")}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-bold text-ink">What each role can do</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          {ROLE_NAMES.map((r) => (
            <div key={r} className="rounded-xl bg-surface-2 p-4">
              <dt className="text-sm font-bold text-ink">{r}</dt>
              <dd className="mt-1 text-sm text-neutral">{ROLE_DESCRIPTIONS[r]}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function InviteDialog({ assignable }: { assignable: RoleName[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleName>("Cashier");
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [isPending, start] = useActionTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await createInvitation(email, role);
      if (!r.success) {
        setError(r.error);
        return;
      }
      router.refresh();
      if (r.data.emailed) {
        toast.success(`Invitation sent to ${email}`);
        setOpen(false);
        setEmail("");
      } else {
        setLink(r.data.inviteUrl);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setLink(null);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <MailPlus /> Invite teammate
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>They&apos;ll get an email with a link to join. Invitations expire after 7 days.</DialogDescription>
        </DialogHeader>
        {link ? (
          <div className="space-y-3">
            <p className="text-sm text-neutral">
              We couldn&apos;t send the email (check your Resend settings). Share this link instead:
            </p>
            <div className="flex gap-2">
              <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
              <Button
                variant="outline"
                size="icon"
                aria-label="Copy link"
                onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Copied"))}
              >
                <Copy />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <FormField label="Email" htmlFor="invite-email" required>
              <Input
                id="invite-email"
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>
            <FormField label="Role" htmlFor="invite-role">
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as RoleName)}
                className="h-11 w-full rounded-md border border-input bg-surface px-4 text-sm text-ink"
              >
                {assignable.map((r) => (
                  <option key={r} value={r}>
                    {r} — {ROLE_DESCRIPTIONS[r]}
                  </option>
                ))}
              </select>
            </FormField>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" loading={isPending}>
              Send invitation
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
