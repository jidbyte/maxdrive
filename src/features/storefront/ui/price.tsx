import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";

export function Price({
  amount,
  compareAt,
  currency,
  className,
  size = "md",
}: {
  amount: number;
  compareAt?: number | null;
  currency: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const onSale = !!compareAt && compareAt > amount;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span
        className={cn(
          "font-extrabold tracking-tight text-ink tabular-nums",
          size === "sm" && "text-base",
          size === "md" && "text-lg sm:text-xl",
          size === "lg" && "text-3xl sm:text-4xl",
        )}
      >
        {formatPrice(amount, currency)}
      </span>
      {onSale && (
        <s className="text-sm text-neutral tabular-nums">{formatPrice(compareAt!, currency)}</s>
      )}
    </span>
  );
}
