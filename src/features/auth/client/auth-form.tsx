"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FormField } from "@/shared/components/common/form-field";
import { Message } from "@/shared/components/common/message";
import { authErrorMessage, establishSession, firebaseAuth } from "@/shared/lib/firebase/client";
import { safeNext } from "@/shared/lib/safe-next";

type Mode = "sign-in" | "sign-up" | "forgot";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function finish() {
    router.replace(next);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy("email");
    try {
      const auth = await firebaseAuth();
      if (mode === "forgot") {
        await sendPasswordResetEmail(auth, email.trim());
        setInfo("If an account exists for that email, a reset link is on its way.");
        return;
      }
      if (mode === "sign-up") {
        if (password.length < 8) throw Object.assign(new Error(), { code: "auth/weak-password" });
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
        await sendEmailVerification(cred.user).catch(() => undefined);
        await establishSession(cred.user);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await establishSession(cred.user);
      }
      await finish();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function onGoogle() {
    setError(null);
    setBusy("google");
    try {
      const auth = await firebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      await establishSession(cred.user);
      await finish();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const nextQs = params.get("next") ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div className="space-y-6">
      {mode !== "forgot" && (
        <>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={onGoogle}
            loading={busy === "google"}
            disabled={!!busy}
          >
            {busy !== "google" && <GoogleIcon />} Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-xs font-medium tracking-wide text-neutral uppercase">
            <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "sign-up" && (
          <FormField label="Full name" htmlFor="name">
            <Input id="name" icon={User} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
        )}
        <FormField label="Email" htmlFor="email" required>
          <Input
            id="email"
            type="email"
            icon={Mail}
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        {mode !== "forgot" && (
          <FormField label="Password" htmlFor="password" required>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                icon={Lock}
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                required
                minLength={mode === "sign-up" ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-neutral hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </FormField>
        )}

        {mode === "sign-in" && (
          <div className="flex justify-end">
            <Link href={`/forgot-password${nextQs}`} className="text-sm font-semibold text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        )}

        {error && <Message variant="error">{error}</Message>}
        {info && <Message variant="success">{info}</Message>}

        <Button type="submit" size="lg" className="w-full" loading={busy === "email"} disabled={!!busy}>
          {mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-neutral">
        {mode === "sign-in" ? (
          <>
            New to MAXDRIVE?{" "}
            <Link href={`/sign-up${nextQs}`} className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            {mode === "sign-up" ? "Already have an account?" : "Remembered it?"}{" "}
            <Link href={`/sign-in${nextQs}`} className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
