import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/shared/lib/utils";

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel = "View all",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <div>
        {eyebrow && <p className="mb-2 text-sm font-semibold text-primary">{eyebrow}</p>}
        <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl lg:text-4xl">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:underline sm:inline-flex"
        >
          {linkLabel} <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
