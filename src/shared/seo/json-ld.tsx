import { siteConfig } from "@/shared/config/site";
import type { OpeningHours } from "@/shared/db/schema/store";

/**
 * Renders a schema.org JSON-LD block. `<` is escaped so user-supplied text
 * (product names, descriptions) can never close the script tag.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

const base = () => siteConfig.url.replace(/\/$/, "");
export const absoluteUrl = (path: string) => `${base()}${path.startsWith("/") ? path : `/${path}`}`;

/** BreadcrumbList from [name, path] pairs, e.g. [["Home","/"],["Shop","/shop"]]. */
export function breadcrumbLd(items: Array<[name: string, path: string]>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: absoluteUrl(path),
    })),
  };
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type StoreLike = {
  name: string;
  legalName: string | null;
  description: string | null;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  openingHours: OpeningHours;
  socials: Record<string, string>;
};

/** AutoPartsStore (a LocalBusiness subtype) + WebSite with sitelinks search. */
export function storeLd(s: StoreLike) {
  const sameAs = Object.values(s.socials ?? {}).filter((u) => /^https?:\/\//.test(u));
  return [
    {
      "@context": "https://schema.org",
      "@type": ["AutoPartsStore", "AutoRepair"],
      "@id": absoluteUrl("/#store"),
      name: s.name,
      legalName: s.legalName ?? siteConfig.legalName,
      description: s.description ?? siteConfig.description,
      url: absoluteUrl("/"),
      logo: s.logoUrl ?? absoluteUrl("/icon.svg"),
      image: absoluteUrl("/opengraph-image"),
      email: s.email ?? siteConfig.contactEmail,
      telephone: s.phone ?? undefined,
      address:
        s.address || s.city
          ? {
              "@type": "PostalAddress",
              streetAddress: s.address ?? undefined,
              addressLocality: s.city ?? undefined,
              addressCountry: s.country,
            }
          : undefined,
      openingHoursSpecification: (s.openingHours ?? [])
        .filter((h) => !h.closed)
        .map((h) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: `https://schema.org/${DAYS[h.day]}`,
          opens: h.open,
          closes: h.close,
        })),
      sameAs: sameAs.length ? sameAs : Object.values(siteConfig.social),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      name: s.name,
      url: absoluteUrl("/"),
      publisher: { "@id": absoluteUrl("/#store") },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/shop")}?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ];
}
