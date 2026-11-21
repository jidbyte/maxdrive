import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold cursor-pointer select-none transition-[background-color,border-color,color,box-shadow,filter,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:ring-danger/20 aria-invalid:border-danger",
  {
    variants: {
      variant: {
        // Main call to action — sky-blue (dark) / blue (light).
        default:
          "bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_var(--primary)] hover:brightness-110",
        // Softer brand action.
        primary: "bg-primary-soft text-primary hover:bg-primary/15",
        // High-contrast neutral (ink on surface).
        secondary: "bg-ink text-surface hover:bg-ink/85",
        ghost: "text-ink hover:bg-surface-2",
        link: "text-primary underline-offset-4 hover:underline",
        destructive:
          "bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger/30",
        outline:
          "border border-border bg-card text-ink hover:bg-surface-2 hover:border-input",
      },
      size: {
        default: "h-10 px-5 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 px-3.5 text-[13px] has-[>svg]:px-3",
        lg: "h-12 px-7 text-[15px] has-[>svg]:px-6",
        icon: "size-10",
      },
      shape: {
        square: "rounded-none",
        circle: "rounded-full",
        round: "rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "circle",
    },
  },
);

function Button({
  className,
  variant,
  size,
  shape,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Shows a spinning indicator and disables the button — for any submit/action button while its request is in flight. Ignored when asChild (those wrap navigation links, not actions). */
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  if (asChild) {
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, shape, className }))}
        disabled={disabled}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, shape, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </Comp>
  );
}

export { Button, buttonVariants };
