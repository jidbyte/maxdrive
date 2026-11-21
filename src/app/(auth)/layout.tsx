import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Logo } from "@/shared/components/app/logo";
import { ThemeToggle } from "@/shared/components/app/theme-toggle";

export const metadata = { robots: { index: false, follow: true } };

const PERKS = [
  "Track every order from checkout to doorstep",
  "Save your vehicles for parts that fit, first time",
  "Faster checkout with saved details",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <aside className="bg-horizon relative hidden flex-col justify-between overflow-hidden border-r border-border p-12 lg:flex">
        <Link href="/" aria-label="MAXDRIVE home">
          <Logo height={34} />
        </Link>
        <div className="max-w-md">
          <h2 className="text-4xl leading-[1.1] font-extrabold tracking-tight text-ink">
            Parts that fit.
            <br />
            <span className="text-primary">Service you trust.</span>
          </h2>
          <ul className="mt-8 space-y-3">
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-neutral">
                <CheckCircle2 className="size-5 shrink-0 text-primary" /> {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-neutral">© {new Date().getFullYear()} MAXDRIVE Autoparts &amp; Service</p>
      </aside>

      <main className="flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Link href="/" className="lg:invisible" aria-label="MAXDRIVE home">
            <Logo height={28} />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
