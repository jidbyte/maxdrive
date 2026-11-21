import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Logo } from "@/shared/components/app/logo";

export default function NotFound() {
  return (
    <div className="bg-horizon grid min-h-dvh place-items-center px-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <Logo height={30} />
        <Compass className="mt-10 size-12 text-primary" />
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-ink">Wrong turn</h1>
        <p className="mt-2 text-neutral">We couldn&apos;t find that page. It may have moved, or the link is incorrect.</p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/shop">Shop parts</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
