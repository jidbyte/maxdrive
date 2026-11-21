"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Ban, CheckCircle2, LogIn, PlayCircle, RotateCcw, UserX, XCircle } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { setBookingStatus } from "@/features/workshop/server/actions";
import type { BOOKING_STATUSES } from "@/shared/db/schema/services";

type Status = (typeof BOOKING_STATUSES)[number];

const ACTIONS: Record<Status, Array<{ to: Status; label: string; icon: typeof CheckCircle2; variant?: "default" | "outline" | "ghost" }>> = {
  requested: [
    { to: "confirmed", label: "Confirm", icon: CheckCircle2 },
    { to: "cancelled", label: "Cancel", icon: XCircle, variant: "ghost" },
  ],
  confirmed: [
    { to: "checked_in", label: "Check in", icon: LogIn },
    { to: "no_show", label: "No-show", icon: UserX, variant: "ghost" },
    { to: "cancelled", label: "Cancel", icon: Ban, variant: "ghost" },
  ],
  checked_in: [
    { to: "in_progress", label: "Start work", icon: PlayCircle },
    { to: "cancelled", label: "Cancel", icon: Ban, variant: "ghost" },
  ],
  in_progress: [{ to: "completed", label: "Complete", icon: CheckCircle2 }],
  completed: [],
  cancelled: [{ to: "confirmed", label: "Re-open", icon: RotateCcw, variant: "outline" }],
  no_show: [{ to: "confirmed", label: "Re-open", icon: RotateCcw, variant: "outline" }],
};

export function BookingStatusActions({ bookingId, status, size = "sm" }: { bookingId: string; status: Status; size?: "sm" | "default" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const actions = ACTIONS[status];
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((a) => (
        <Button
          key={a.to}
          size={size}
          variant={a.variant ?? "default"}
          disabled={pending}
          className={a.to === "cancelled" || a.to === "no_show" ? "text-danger hover:text-danger" : undefined}
          onClick={() => {
            if ((a.to === "cancelled" || a.to === "no_show") && !confirm(`Mark this booking as ${a.label.toLowerCase()}?`)) return;
            start(async () => {
              const r = await setBookingStatus(bookingId, a.to);
              if (!r.success) toast.error(r.error);
              else toast.success(`Booking ${a.to.replace("_", " ")}`);
              router.refresh();
            });
          }}
        >
          <a.icon /> {a.label}
        </Button>
      ))}
    </div>
  );
}
