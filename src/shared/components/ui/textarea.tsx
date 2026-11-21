import * as React from "react"

import { cn } from "@/shared/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-md border border-input bg-surface py-3 px-4 text-base sm:text-sm text-ink transition-[border-color,box-shadow] outline-none",
        "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20",
        "disabled:cursor-not-allowed disabled:opacity-60 placeholder:text-neutral resize-y",
        "aria-invalid:border-danger aria-invalid:ring-[3px] aria-invalid:ring-danger/15",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea }
