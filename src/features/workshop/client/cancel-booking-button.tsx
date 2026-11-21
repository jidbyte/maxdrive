"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { XCircle } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { cancelMyBooking } from "@/features/workshop/server/actions";

export function CancelBookingButton({ bookingNumber, token }: { bookingNumber: string; token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      className="text-danger hover:text-danger"
      loading={pending}
      onClick={() => {
        if (!confirm("Cancel this booking?")) return;
        start(async () => {
          const r = await cancelMyBooking(bookingNumber, token);
          if (!r.success) toast.error(r.error);
          else toast.success("Booking cancelled");
          router.refresh();
        });
      }}
    >
      {!pending && <XCircle />} Cancel booking
    </Button>
  );
}
