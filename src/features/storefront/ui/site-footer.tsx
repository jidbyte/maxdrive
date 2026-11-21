import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { Logo } from "@/shared/components/app/logo";
import { getStoreSettings } from "@/shared/store/settings";
import { listCategoriesWithCounts } from "@/features/storefront/catalog/server/queries";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function SiteFooter() {
  const [s, categories] = await Promise.all([getStoreSettings(), listCategoriesWithCounts()]);
  const open = s.openingHours.filter((h) => !h.closed);

  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <Logo height={32} />
          <p className="max-w-xs text-sm text-neutral">
            {s.tagline || "Parts that fit. Service you trust."} Genuine and OEM-grade auto parts with expert
            workshop servicing.
          </p>
          <ul className="space-y-2 text-sm text-neutral">
            {s.phone && (
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-primary" />
                <a href={`tel:${s.phone}`} className="hover:text-ink">{s.phone}</a>
              </li>
            )}
            {s.email && (
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-primary" />
                <a href={`mailto:${s.email}`} className="hover:text-ink">{s.email}</a>
              </li>
            )}
            {(s.address || s.city) && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 text-primary" />
                {[s.address, s.city].filter(Boolean).join(", ")}
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold text-ink">Shop</h3>
          <ul className="space-y-2.5 text-sm text-neutral">
            {categories.slice(0, 7).map((c) => (
              <li key={c.id}>
                <Link href={`/shop/c/${c.slug}`} className="hover:text-ink">{c.name}</Link>
              </li>
            ))}
            <li>
              <Link href="/shop" className="font-semibold text-primary">All parts →</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold text-ink">Help</h3>
          <ul className="space-y-2.5 text-sm text-neutral">
            <li><Link href="/track" className="hover:text-ink">Track your order</Link></li>
            <li><Link href="/services" className="hover:text-ink">Workshop services</Link></li>
            <li><Link href="/contact" className="hover:text-ink">Contact us</Link></li>
            <li><Link href="/account" className="hover:text-ink">My account</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold text-ink">Opening hours</h3>
          <ul className="space-y-1.5 text-sm text-neutral">
            {open.map((h) => (
              <li key={h.day} className="flex justify-between gap-6">
                <span>{DAYS[h.day]}</span>
                <span className="text-ink tabular-nums">{h.open} – {h.close}</span>
              </li>
            ))}
            {s.openingHours.filter((h) => h.closed).map((h) => (
              <li key={h.day} className="flex justify-between gap-6">
                <span>{DAYS[h.day]}</span>
                <span>Closed</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-neutral sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} {s.legalName || s.name}. All rights reserved.</p>
          <p>Secure payments by Paystack</p>
        </div>
      </div>
    </footer>
  );
}
