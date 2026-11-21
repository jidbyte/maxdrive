"use client";

import { Car, Plus, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import type { FitmentInput } from "@/features/admin/products/server/schema";

export type VehicleOption = { id: string; name: string; models: { id: string; name: string }[] };

const selectClass =
  "h-11 w-full rounded-md border border-input bg-surface px-3 text-base text-ink sm:text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-50";

const EMPTY: FitmentInput = { makeId: "", modelId: "", yearFrom: null, yearTo: null, engine: "", notes: "" };

function yearValue(v: string): number | null {
  const n = Number(v);
  return v && Number.isInteger(n) && n >= 1950 && n <= 2100 ? n : null;
}

export function FitmentEditor({
  value,
  onChange,
  vehicles,
  disabled,
}: {
  value: FitmentInput[];
  onChange: (next: FitmentInput[]) => void;
  vehicles: VehicleOption[];
  disabled?: boolean;
}) {
  const update = (i: number, patch: Partial<FitmentInput>) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  if (disabled) {
    return (
      <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-neutral">
        Marked as a universal part — it shows as fitting every vehicle, so no fitment list is needed.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
          <Car className="size-7 text-neutral" />
          <p className="text-sm text-neutral">
            No vehicles yet. Add the makes/models this part fits so shoppers see a “Fits your vehicle” badge.
          </p>
        </div>
      )}

      {value.map((row, i) => {
        const models = vehicles.find((v) => v.id === row.makeId)?.models ?? [];
        return (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-2xl border border-border p-3 sm:grid-cols-12 sm:items-center">
            <select
              aria-label="Make"
              className={`${selectClass} col-span-1 sm:col-span-3`}
              value={row.makeId}
              onChange={(e) => update(i, { makeId: e.target.value, modelId: "" })}
            >
              <option value="">Make…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Model"
              className={`${selectClass} col-span-1 sm:col-span-3`}
              value={row.modelId ?? ""}
              disabled={!row.makeId}
              onChange={(e) => update(i, { modelId: e.target.value })}
            >
              <option value="">All models</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <Input
              aria-label="From year"
              placeholder="From"
              inputMode="numeric"
              wrapperClassName="sm:col-span-2"
              defaultValue={row.yearFrom ?? ""}
              onBlur={(e) => update(i, { yearFrom: yearValue(e.target.value) })}
            />
            <Input
              aria-label="To year"
              placeholder="To"
              inputMode="numeric"
              wrapperClassName="sm:col-span-2"
              defaultValue={row.yearTo ?? ""}
              onBlur={(e) => update(i, { yearTo: yearValue(e.target.value) })}
            />
            <Input
              aria-label="Engine"
              placeholder="Engine (optional)"
              wrapperClassName="col-span-1 sm:col-span-1"
              defaultValue={row.engine ?? ""}
              onBlur={(e) => update(i, { engine: e.target.value.trim() })}
            />
            <div className="col-span-1 flex justify-end sm:col-span-1">
              <Button type="button" variant="ghost" size="icon" aria-label="Remove vehicle" onClick={() => remove(i)}>
                <Trash2 className="text-danger" />
              </Button>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { ...EMPTY }])}>
        <Plus /> Add vehicle
      </Button>
    </div>
  );
}
