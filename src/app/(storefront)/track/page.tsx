import { PackageSearch } from "lucide-react";

import { TrackOrderForm } from "@/features/storefront/ui/track-order-form";
import { Container } from "@/features/storefront/ui/section";

export const metadata = { title: "Track your order", alternates: { canonical: "/track" } };

export default function TrackPage() {
  return (
    <Container className="py-12 sm:py-20">
      <div className="mx-auto max-w-md">
        <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
          <PackageSearch className="size-7" />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">Track your order</h1>
        <p className="mt-2 mb-8 text-neutral">
          Enter the order number from your confirmation email and the email address you used at checkout.
        </p>
        <TrackOrderForm />
      </div>
    </Container>
  );
}
