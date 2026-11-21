"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** true on the client after hydration, false during SSR — without a setState-in-effect. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** A boolean persisted in localStorage, hydration-safe (server snapshot = false). */
export function useLocalStorageFlag(key: string): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      const handler = (e: Event) => {
        if (e instanceof StorageEvent ? e.key === key : (e as CustomEvent).detail === key) cb();
      };
      window.addEventListener("storage", handler);
      window.addEventListener("md-local-flag", handler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener("md-local-flag", handler);
      };
    },
    () => localStorage.getItem(key) === "1",
    () => false,
  );
  const set = (v: boolean) => {
    localStorage.setItem(key, v ? "1" : "0");
    window.dispatchEvent(new CustomEvent("md-local-flag", { detail: key }));
  };
  return [value, set];
}
