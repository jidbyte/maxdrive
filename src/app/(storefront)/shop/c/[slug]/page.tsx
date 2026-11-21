import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCategoryBySlug } from "@/features/storefront/catalog/server/queries";
import { CatalogView, type CatalogSearchParams } from "@/features/storefront/ui/catalog-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).slug);
  if (!category) return { title: "Category not found" };
  return {
    title: `${category.name} — auto parts`,
    description: category.description ?? `Shop ${category.name.toLowerCase()} for your vehicle at MAXDRIVE.`,
    alternates: { canonical: `/shop/c/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CatalogSearchParams>;
}) {
  const category = await getCategoryBySlug((await params).slug);
  if (!category) notFound();
  return <CatalogView category={category} searchParams={await searchParams} />;
}
