"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";

let authInstance: Auth | null = null;

function getClientApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}

/**
 * The browser SDK is used ONLY to run sign-in flows (email/password,
 * Google, password reset, email verification). It keeps no persistent
 * state of its own (in-memory persistence): once a flow succeeds we swap the
 * ID token for an httpOnly session cookie and sign the SDK out again.
 * The server is the single source of truth for "who is signed in".
 */
export async function firebaseAuth(): Promise<Auth> {
  if (authInstance) return authInstance;
  const auth = getAuth(getClientApp());
  await setPersistence(auth, inMemoryPersistence);
  authInstance = auth;
  return auth;
}

/** Exchanges a freshly signed-in Firebase user for a server session cookie. */
export async function establishSession(user: User): Promise<void> {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const auth = await firebaseAuth();
  await signOut(auth).catch(() => undefined);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Could not start your session. Please try again.");
  }
}

/** Ends the server session. `everywhere` also revokes all refresh tokens. */
export async function endSession(everywhere = false): Promise<void> {
  await fetch(`/api/auth/session${everywhere ? "?everywhere=1" : ""}`, {
    method: "DELETE",
  });
}

/** Human-readable messages for common Firebase Auth error codes. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Please choose a stronger password (at least 8 characters).";
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/network-request-failed":
      return "Network error — check your connection and try again.";
    default:
      return err instanceof Error ? err.message : "Something went wrong. Please try again.";
  }
}
