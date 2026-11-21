import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/shared/authz/session";
import { AuthForm } from "@/features/auth/client/auth-form";
import { safeNext } from "@/shared/lib/safe-next";

export const metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(safeNext(next ?? null));

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-2 mb-8 text-neutral">Sign in to track orders, manage your garage and check out faster.</p>
      <Suspense>
        <AuthForm mode="sign-in" />
      </Suspense>
    </>
  );
}
