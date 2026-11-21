import Link from "next/link";
import { CalendarRange } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";
import { RANGE_PRESETS, type ResolvedRange } from "@/features/admin/analytics/server/date-range";

const LABEL: Record<(typeof RANGE_PRESETS)[number], string> = {
  D: "Today",
  W: "Week",
  M: "Month",
  Y: "Year",
  "30D": "30d",
  "90D": "90d",
  MAX: "All",
};

export function DateRangeFilter({ basePath, range }: { basePath: string; range: ResolvedRange }) {
  return (
    <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-surface-2 p-1">
      {RANGE_PRESETS.map((preset) => (
        <Link
          key={preset}
          href={`${basePath}?range=${preset}`}
          scroll={false}
          className={cn(
            "flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-semibold transition-colors sm:text-sm",
            range.preset === preset ? "bg-card text-ink shadow-card" : "text-neutral hover:text-ink",
          )}
        >
          {LABEL[preset]}
        </Link>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold sm:text-sm",
              range.preset === "custom" ? "bg-card text-ink shadow-card" : "text-neutral hover:text-ink",
            )}
          >
            <CalendarRange className="size-4" /> Custom
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64">
          <form action={basePath} method="GET" className="space-y-3">
            <input type="hidden" name="range" value="custom" />
            <label className="block space-y-1 text-xs text-neutral">
              From
              <Input type="date" name="from" defaultValue={range.fromParam} />
            </label>
            <label className="block space-y-1 text-xs text-neutral">
              To
              <Input type="date" name="to" defaultValue={range.toParam} />
            </label>
            <p className="text-xs text-neutral">Up to 10 years, capped at today.</p>
            <Button type="submit" size="sm" className="w-full">Apply</Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
