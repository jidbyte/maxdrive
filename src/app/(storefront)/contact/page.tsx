import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { getStoreSettings } from "@/shared/store/settings";
import { normalizePhoneForWhatsApp } from "@/shared/utils/phone";
import { ContactForm } from "@/features/app/messaging/client/contact-form";
import { Container } from "@/features/storefront/ui/section";

export const metadata = {
  title: "Contact us",
  description: "Questions about a part, an order or a workshop booking? Get in touch with MAXDRIVE.",
  alternates: { canonical: "/contact" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function ContactPage() {
  const s = await getStoreSettings();
  const wa = s.whatsappPhone ? normalizePhoneForWhatsApp(s.whatsappPhone, s.currency) : null;

  const channels = [
    s.phone && { icon: Phone, label: "Call us", value: s.phone, href: `tel:${s.phone}` },
    wa && { icon: MessageCircle, label: "WhatsApp", value: s.whatsappPhone!, href: `https://wa.me/${wa}` },
    s.email && { icon: Mail, label: "Email", value: s.email, href: `mailto:${s.email}` },
    (s.address || s.city) && {
      icon: MapPin,
      label: "Visit",
      value: [s.address, s.city].filter(Boolean).join(", "),
      href: `https://maps.google.com/?q=${encodeURIComponent([s.address, s.city].filter(Boolean).join(", "))}`,
    },
  ].filter(Boolean) as Array<{ icon: typeof Phone; label: string; value: string; href: string }>;

  return (
    <>
      <section className="bg-horizon border-b border-border">
        <Container className="py-12 sm:py-16">
          <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">How can we help?</h1>
          <p className="mt-3 max-w-xl text-lg text-neutral">
            Not sure which part fits? Send us your vehicle details and our parts specialists will find it for you.
          </p>
        </Container>
      </section>
      <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_380px] lg:py-16">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-8">
          <h2 className="mb-6 text-xl font-bold text-ink">Send us a message</h2>
          <ContactForm />
        </div>
        <aside className="space-y-4">
          {channels.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/40"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <c.icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-neutral">{c.label}</span>
                <span className="block truncate font-semibold text-ink">{c.value}</span>
              </span>
            </a>
          ))}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <p className="mb-3 flex items-center gap-2 font-semibold text-ink">
              <Clock className="size-4 text-primary" /> Opening hours
            </p>
            <ul className="space-y-1.5 text-sm">
              {s.openingHours.map((h) => (
                <li key={h.day} className="flex justify-between">
                  <span className="text-neutral">{DAYS[h.day]}</span>
                  <span className="text-ink tabular-nums">{h.closed ? "Closed" : `${h.open} – ${h.close}`}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </Container>
    </>
  );
}
