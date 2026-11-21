import * as React from "react";
import { cn } from "@/shared/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconClassName?: string;
  /** Classes for the outer wrapper (e.g. grid placement). */
  wrapperClassName?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", icon: Icon, iconClassName, wrapperClassName, ...props }, ref) => {
    const hasIcon = !!Icon;

    return (
      <div className={cn("relative w-full", wrapperClassName)}>
        {hasIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Icon className={cn("size-4 text-neutral", iconClassName)} />
          </div>
        )}

        <input
          ref={ref}
          type={type}
          data-slot="input"
          className={cn(
            "flex h-11 w-full rounded-md border border-input bg-surface py-2 px-4 text-base sm:text-sm text-ink transition-[border-color,box-shadow] outline-none",
            "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-60 placeholder:text-neutral",
            "aria-invalid:border-danger aria-invalid:ring-[3px] aria-invalid:ring-danger/15",
            hasIcon && "pl-10",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
