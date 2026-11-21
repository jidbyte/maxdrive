import { cn } from "@/shared/lib/utils";

/**
 * MAXDRIVE wordmark. Pure SVG + text driven by theme tokens, so it renders
 * on the server and switches with dark/light mode without a flash.
 * Swap the mark for the final brand asset once it exists.
 */
export function Logo({
  className,
  height = 32,
  showWordmark = true,
}: {
  className?: string;
  height?: number;
  showWordmark?: boolean;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5 select-none", className)}
      style={{ height }}
      aria-label="MAXDRIVE"
      role="img"
    >
      <LogoMark size={height} />
      {showWordmark && (
        <span
          aria-hidden
          className="font-extrabold uppercase tracking-[0.06em] text-ink"
          style={{ fontSize: Math.round(height * 0.6) }}
        >
          MAX<span className="text-primary">DRIVE</span>
        </span>
      )}
    </span>
  );
}

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="10" className="fill-primary" />
      <path
        d="M17.5 6 9 18h6l-1.5 8L23 14h-6l.5-8z"
        className="fill-primary-foreground"
      />
    </svg>
  );
}
