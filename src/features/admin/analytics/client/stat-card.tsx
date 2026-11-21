import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/shared/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  trend?: { value: string; direction: "up" | "down" };
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-neutral sm:text-sm">{label}</p>
        {Icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="truncate text-xl font-extrabold tracking-tight text-ink tabular-nums sm:text-2xl lg:text-[28px]">{value}</p>
      {(hint || trend) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                trend.direction === "up" ? "bg-success/12 text-success" : "bg-danger/12 text-danger",
              )}
            >
              {trend.direction === "up" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {trend.value}
            </span>
          )}
          {hint && <span className="text-neutral">{hint}</span>}
        </div>
      )}
    </div>
  );
}
