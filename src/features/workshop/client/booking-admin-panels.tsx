"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import type { DayAvailability } from "@/features/workshop/server/availability";
import { getAvailableSlots, rescheduleBooking, updateBookingNotes } from "@/features/workshop/server/actions";

export function ReschedulePanel({
  bookingId,
  serviceIds,
  currentStart,
}: {
  bookingId: string;
  serviceIds: string[];
  currentStart: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [day, setDay] = useState<DayAvailability | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [saving, startSave] = useTransition();

  function load(d: string) {
    setDate(d);
    setPicked(null);
    setDay(null);
    if (d) startLoad(async () => setDay(await getAvailableSlots(d, serviceIds, true)));
  }

  return (
    <div className="space-y-4">
      <input
        type="date"
        aria-label="New date"
        value={date}
        onChange={(e) => load(e.target.value)}
        className="h-11 w-full rounded-md border border-input bg-surface px-4 text-sm text-ink"
      />
      {loading && (
        <p className="flex items-center gap-2 text-sm text-neutral"><Loader2 className="size-4 animate-spin" /> Checking…</p>
      )}
      {day && !day.open && <p className="text-sm text-neutral">{day.reason}</p>}
      {day?.open && (
        <div className="grid grid-cols-4 gap-1.5">
          {day.slots.map((s) => (
            <button
              key={s.start}
              type="button"
              disabled={!s.available || s.start === currentStart}
              onClick={() => setPicked(s.start)}
              className={cn(
                "h-9 rounded-full border text-xs font-semibold tabular-nums disabled:border-transparent disabled:bg-surface-2 disabled:text-neutral/50",
                picked === s.start ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary",
              )}
            >
              {s.time}
            </button>
          ))}
        </div>
      )}
      <Button
        className="w-full"
        disabled={!picked}
        loading={saving}
        onClick={() =>
          startSave(async () => {
            const r = await rescheduleBooking(bookingId, picked!);
            if (!r.success) return void toast.error(r.error);
            toast.success("Booking moved — customer notified");
            setPicked(null);
            setDay(null);
            setDate("");
            router.refresh();
          })
        }
      >
        <CalendarClock /> Move booking
      </Button>
    </div>
  );
}

export function NotesPanel({ bookingId, initial }: { bookingId: string; initial: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Visible to staff only" />
      <Button
        variant="outline"
        size="sm"
        disabled={notes === initial}
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await updateBookingNotes(bookingId, notes);
            if (!r.success) toast.error(r.error);
            else toast.success("Notes saved");
            router.refresh();
          })
        }
      >
        Save notes
      </Button>
    </div>
  );
}
