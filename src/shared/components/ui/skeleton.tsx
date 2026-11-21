import { cn } from "@/shared/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-skeleton rounded-md bg-surface-2 motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
