import type { Metadata } from "next";

import { CatalogView, type CatalogSearchParams } from "@/features/storefront/ui/catalog-view";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q}` : "Shop auto parts",
    description: "Genuine and OEM-grade auto parts matched to your vehicle. Fast delivery or store pickup.",
    alternates: { canonical: "/shop" },
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  return <CatalogView searchParams={await searchParams} />;
}
