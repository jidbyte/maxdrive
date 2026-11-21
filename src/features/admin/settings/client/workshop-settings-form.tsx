"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { FormField } from "@/shared/components/common/form-field";
import { Message } from "@/shared/components/common/message";
import { useActionTransition } from "@/shared/hooks/use-action-transition";
import { cn } from "@/shared/lib/utils";
import { updateWorkshopSettings } from "@/features/admin/settings/server/actions";
import type { WorkshopSettingsInput } from "@/features/admin/settings/server/schema";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ZONES = ["Africa/Accra", "Africa/Lagos", "Africa/Johannesburg", "Africa/Nairobi", "Europe/London", "UTC"];
const selectClass = "h-11 w-full rounded-md border border-input bg-surface px-4 text-sm text-ink";

export function WorkshopSettingsForm({ defaultValues }: { defaultValues: WorkshopSettingsInput }) {
  const router = useRouter();
  const [v, setV] = useState(defaultValues);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useActionTransition();
  const set = <K extends keyof WorkshopSettingsInput>(k: K, val: WorkshopSettingsInput[K]) => setV((x) => ({ ...x, [k]: val }));
  const setDay = (day: number, patch: Partial<WorkshopSettingsInput["openingHours"][number]>) =>
    set("openingHours", v.openingHours.map((h) => (h.day === day ? { ...h, ...patch } : h)));

  const zones = ZONES.includes(v.timezone) ? ZONES : [v.timezone, ...ZONES];
  // Show Monday first.
  const ordered = [1, 2, 3, 4, 5, 6, 0].map((d) => v.openingHours.find((h) => h.day === d)!).filter(Boolean);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await updateWorkshopSettings(v);
          if (!r.success) return setError(r.error);
          toast.success("Workshop settings saved");
          router.refresh();
        }, "Saving…");
      }}
      className="space-y-8"
    >
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 p-4">
        <Checkbox checked={v.onlineBookingEnabled} onCheckedChange={(c) => set("onlineBookingEnabled", !!c)} className="mt-0.5" />
        <span className="text-sm">
          <span className="font-semibold text-ink">Accept online bookings</span>
          <span className="block text-neutral">Turn off to pause the /services/book page (staff can still add bookings).</span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label="Workshop bays (cars at once)" htmlFor="bays">
          <Input id="bays" type="number" min={1} value={v.workshopBays} onChange={(e) => set("workshopBays", Number(e.target.value) || 1)} />
        </FormField>
        <FormField label="Slot length" htmlFor="slot">
          <select id="slot" className={selectClass} value={v.bookingSlotMinutes} onChange={(e) => set("bookingSlotMinutes", Number(e.target.value))}>
            {[15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>Every {n} minutes</option>)}
          </select>
        </FormField>
        <FormField label="Timezone" htmlFor="tz">
          <select id="tz" className={selectClass} value={v.timezone} onChange={(e) => set("timezone", e.target.value)}>
            {zones.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </FormField>
        <FormField label="Minimum notice (hours)" htmlFor="lead">
          <Input id="lead" type="number" min={0} step={0.5} value={v.bookingLeadMinutes / 60} onChange={(e) => set("bookingLeadMinutes", Math.round((Number(e.target.value) || 0) * 60))} />
        </FormField>
        <FormField label="Book up to (days ahead)" htmlFor="window">
          <Input id="window" type="number" min={1} max={180} value={v.bookingWindowDays} onChange={(e) => set("bookingWindowDays", Number(e.target.value) || 1)} />
        </FormField>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-ink">Opening hours</h3>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {ordered.map((h) => (
            <li key={h.day} className="grid grid-cols-[1fr_auto] items-center gap-3 p-3 sm:grid-cols-[140px_1fr_auto]">
              <span className="font-semibold text-ink">{DAYS[h.day]}</span>
              <div className={cn("col-span-2 flex items-center gap-2 sm:col-span-1", h.closed && "opacity-40")}>
                <input
                  type="time"
                  aria-label={`${DAYS[h.day]} opens`}
                  disabled={h.closed}
                  value={h.open}
                  onChange={(e) => setDay(h.day, { open: e.target.value })}
                  className="h-10 rounded-full border border-input bg-surface px-3 text-sm text-ink"
                />
                <span className="text-neutral">to</span>
                <input
                  type="time"
                  aria-label={`${DAYS[h.day]} closes`}
                  disabled={h.closed}
                  value={h.close}
                  onChange={(e) => setDay(h.day, { close: e.target.value })}
                  className="h-10 rounded-full border border-input bg-surface px-3 text-sm text-ink"
                />
              </div>
              <label className="row-start-1 flex items-center gap-2 justify-self-end text-sm text-neutral sm:col-start-3">
                <Checkbox checked={h.closed} onCheckedChange={(c) => setDay(h.day, { closed: !!c })} /> Closed
              </label>
            </li>
          ))}
        </ul>
      </div>

      {error && <Message variant="error">{error}</Message>}
      <div className="flex justify-end border-t border-border pt-5">
        <Button type="submit" loading={pending}>Save changes</Button>
      </div>
    </form>
  );
}
