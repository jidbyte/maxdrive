import { Suspense } from "react";

import { AuthForm } from "@/features/auth/client/auth-form";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Reset your password</h1>
      <p className="mt-2 mb-8 text-neutral">Enter your email and we&apos;ll send you a link to choose a new password.</p>
      <Suspense>
        <AuthForm mode="forgot" />
      </Suspense>
    </>
  );
}
