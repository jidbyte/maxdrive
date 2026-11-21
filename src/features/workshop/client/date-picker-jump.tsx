"use client";

import { useRouter } from "next/navigation";

export function DatePickerJump({ value }: { value: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      aria-label="Jump to date"
      value={value}
      onChange={(e) => e.target.value && router.push(`/admin/bookings?date=${e.target.value}`)}
      className="h-10 rounded-full border border-input bg-surface px-4 text-sm text-ink outline-none focus-visible:border-primary"
    />
  );
}
