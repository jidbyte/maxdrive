import Link from "next/link";
import { eq } from "drizzle-orm";
import { MailCheck, ShieldX } from "lucide-react";

import { db } from "@/shared/db";
import { invitation } from "@/shared/db/schema";
import { getCurrentUser } from "@/shared/authz/session";
import { Button } from "@/shared/components/ui/button";
import { Logo } from "@/shared/components/app/logo";
import { acceptInvitation } from "@/features/admin/team/server/actions";

export const metadata = { title: "Team invitation", robots: { index: false } };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-horizon grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-pop">
        <Logo height={30} className="mb-8" />
        {children}
      </div>
    </div>
  );
}

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await db.query.invitation.findFirst({
    where: eq(invitation.token, token),
    with: { role: { columns: { name: true } } },
  });

  if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
    return (
      <Shell>
        <ShieldX className="mb-4 size-10 text-danger" />
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Invitation unavailable</h1>
        <p className="mt-2 text-sm text-neutral">
          This invitation is invalid, already used, or has expired. Ask a MAXDRIVE admin to send a new one.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">Go to homepage</Link>
        </Button>
      </Shell>
    );
  }

  const user = await getCurrentUser();
  const next = encodeURIComponent(`/invite/${token}`);

  if (!user) {
    return (
      <Shell>
        <MailCheck className="mb-4 size-10 text-primary" />
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Join the MAXDRIVE team</h1>
        <p className="mt-2 text-sm text-neutral">
          You&apos;ve been invited as <b className="text-ink">{invite.role.name}</b>. Sign in or create an
          account with <b className="text-ink">{invite.email}</b> to accept.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href={`/sign-up?next=${next}&email=${encodeURIComponent(invite.email)}`}>Create account</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/sign-in?next=${next}`}>Sign in</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const result = await acceptInvitation(token);
  return (
    <Shell>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        {result.success ? "Welcome aboard 🎉" : "Couldn't accept invitation"}
      </h1>
      <p className="mt-2 text-sm text-neutral">
        {result.success ? "You now have access to the MAXDRIVE admin." : result.error}
      </p>
      {result.success ? (
        <Button asChild className="mt-6 w-full">
          <Link href="/admin">Open the dashboard</Link>
        </Button>
      ) : (
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link href="/account/security">Check your account</Link>
        </Button>
      )}
    </Shell>
  );
}
