import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/shared/authz/session";
import { AuthForm } from "@/features/auth/client/auth-form";
import { safeNext } from "@/shared/lib/safe-next";

export const metadata = { title: "Create account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(safeNext(next ?? null));

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Create your account</h1>
      <p className="mt-2 mb-8 text-neutral">
        It&apos;s optional — you can always check out as a guest.
      </p>
      <Suspense>
        <AuthForm mode="sign-up" />
      </Suspense>
      <p className="mt-6 text-center text-xs text-neutral">
        By creating an account you agree to our terms and privacy policy.
      </p>
    </>
  );
}
