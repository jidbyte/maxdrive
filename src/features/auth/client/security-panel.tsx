"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { BadgeCheck, KeyRound, LogOut, MailWarning } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FormField } from "@/shared/components/common/form-field";
import { authErrorMessage, endSession, firebaseAuth } from "@/shared/lib/firebase/client";
import { resendVerificationEmail, updateProfile } from "@/features/auth/server/actions";

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-neutral">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function SecurityPanel({
  user,
}: {
  user: { name: string | null; email: string | null; phone: string | null; emailVerified: boolean; lastSignInAt: string | null };
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [savingProfile, startProfile] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Card title="Profile">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            startProfile(async () => {
              const r = await updateProfile({ name, phone });
              if (r.success) {
                toast.success("Profile updated");
                router.refresh();
              } else toast.error(r.error);
            });
          }}
        >
          <FormField label="Full name" htmlFor="name">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </FormField>
          <FormField label="Phone" htmlFor="phone">
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </FormField>
          <div className="sm:col-span-2">
            <Button type="submit" loading={savingProfile}>Save profile</Button>
          </div>
        </form>
      </Card>

      <Card title="Email">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm">
            {user.emailVerified ? (
              <BadgeCheck className="size-5 text-success" />
            ) : (
              <MailWarning className="size-5 text-warning" />
            )}
            <span className="font-semibold text-ink">{user.email}</span>
            <span className="text-neutral">{user.emailVerified ? "· verified" : "· not verified"}</span>
          </p>
          {!user.emailVerified && (
            <Button
              variant="outline"
              loading={busy === "verify"}
              onClick={async () => {
                setBusy("verify");
                const r = await resendVerificationEmail();
                setBusy(null);
                if (r.success) toast.success("Verification email sent");
                else toast.error(r.error);
              }}
            >
              Resend verification
            </Button>
          )}
        </div>
      </Card>

      <Card title="Password" description="We'll email you a secure link to set a new password.">
        <Button
          variant="outline"
          loading={busy === "reset"}
          disabled={!user.email}
          onClick={async () => {
            setBusy("reset");
            try {
              await sendPasswordResetEmail(await firebaseAuth(), user.email!);
              toast.success("Password reset link sent to your email");
            } catch (err) {
              toast.error(authErrorMessage(err));
            } finally {
              setBusy(null);
            }
          }}
        >
          <KeyRound /> Send password reset link
        </Button>
      </Card>

      <Card
        title="Sessions"
        description={`Last sign-in: ${user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : "—"}. Signing out everywhere ends your session on every device, including this one.`}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            loading={busy === "out"}
            onClick={async () => {
              setBusy("out");
              await endSession(false);
              router.push("/");
              router.refresh();
            }}
          >
            <LogOut /> Sign out
          </Button>
          <Button
            variant="destructive"
            loading={busy === "all"}
            onClick={async () => {
              if (!confirm("Sign out of MAXDRIVE on all devices?")) return;
              setBusy("all");
              await endSession(true);
              router.push("/sign-in");
              router.refresh();
            }}
          >
            Sign out everywhere
          </Button>
        </div>
      </Card>
    </div>
  );
}
