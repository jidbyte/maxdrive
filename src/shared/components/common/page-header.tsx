import { type ComponentType, type ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/** Admin page header: title (+ optional description) on the left, actions on the right. */
export function PageHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-2 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageTitle({
  children,
  icon: Icon,
  description,
  className,
}: {
  children: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <h1 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
        {Icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <Icon className="size-[18px]" />
          </span>
        )}
        <span className="truncate">{children}</span>
      </h1>
      {description && <p className="mt-1.5 text-sm text-neutral">{description}</p>}
    </div>
  );
}

export function PageAction({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}
