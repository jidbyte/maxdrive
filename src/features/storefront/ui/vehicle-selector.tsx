"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Car, Search, X } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { clearVehicle, getModelsForMake, selectVehicle } from "@/features/storefront/catalog/server/actions";

type Option = { id: string; name: string };

const selectClass =
  "h-12 w-full appearance-none rounded-[14px] border border-input bg-surface px-4 text-base text-ink sm:text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-50 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%238b98ab%22 stroke-width=%222%22><path d=%22m4 6 4 4 4-4%22/></svg>')] bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10";

const YEARS = Array.from(
  { length: new Date().getFullYear() + 1 - 1985 + 1 },
  (_, i) => new Date().getFullYear() + 1 - i,
);

export function VehicleSelector({
  makes,
  current,
  redirectTo = "/shop?fits=1",
  className,
  compact,
}: {
  makes: Option[];
  current: { label: string } | null;
  redirectTo?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [makeId, setMakeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [year, setYear] = useState("");
  const [models, setModels] = useState<Option[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [pending, start] = useTransition();

  function changeMake(next: string) {
    setMakeId(next);
    setModelId("");
    setModels([]);
    if (!next) return;
    setLoadingModels(true);
    getModelsForMake(next)
      .then(setModels)
      .finally(() => setLoadingModels(false));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!makeId) {
      toast.error("Choose your vehicle's make first.");
      return;
    }
    start(async () => {
      const r = await selectVehicle({ makeId, modelId: modelId || null, year: year ? Number(year) : null });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(`Shopping for your ${r.data.label}`);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  function clear() {
    start(async () => {
      await clearVehicle();
      router.refresh();
    });
  }

  return (
    <div className={cn("space-y-3", className)}>
      {current && (
        <div className="flex items-center gap-3 rounded-md bg-primary-soft px-4 py-3 text-sm">
          <Car className="size-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-neutral">Shopping for</span>
            <span className="block truncate font-bold text-ink">{current.label}</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Clear vehicle"
            onClick={clear}
            disabled={pending}
          >
            <X />
          </Button>
        </div>
      )}
      <form onSubmit={submit} className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-2")}>
        <select aria-label="Year" className={selectClass} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">Year</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select aria-label="Make" className={selectClass} value={makeId} onChange={(e) => changeMake(e.target.value)}>
          <option value="">Make</option>
          {makes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Model"
          className={cn(selectClass, !compact && "col-span-2")}
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          disabled={!makeId || loadingModels}
        >
          <option value="">{loadingModels ? "Loading models…" : "Model (optional)"}</option>
          {models.map((m) => (
            <option key={m.id} value={m.id} className="text-accent">
              {m.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="lg" className={cn(!compact && "col-span-2")} loading={pending}>
          {!pending && <Search />} {current ? "Update vehicle" : "Find parts that fit"}
        </Button>
      </form>
    </div>
  );
}
