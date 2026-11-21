import type { MetadataRoute } from "next";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/shared/db";
import { category, image, product } from "@/shared/db/schema";
import { siteConfig } from "@/shared/config/site";

// Always generated from live data (products change daily); search engines
// fetch it rarely, so rendering on request is cheap.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/services`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/services/book`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/track`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const [categories, products, images] = await Promise.all([
      db.select({ slug: category.slug, updatedAt: category.updatedAt }).from(category),
      db
        .select({ id: product.id, slug: product.slug, updatedAt: product.updatedAt })
        .from(product)
        .where(and(eq(product.isActive, true), isNull(product.deletedAt))),
      db.select({ productId: image.productId, url: image.url }).from(image),
    ]);

    const imagesByProduct = new Map<string, string[]>();
    for (const img of images) {
      const list = imagesByProduct.get(img.productId) ?? [];
      if (list.length < 5) list.push(img.url);
      imagesByProduct.set(img.productId, list);
    }

    return [
      ...pages,
      ...categories.map((c) => ({
        url: `${base}/shop/c/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...products.map((p) => ({
        url: `${base}/shop/p/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        images: imagesByProduct.get(p.id),
      })),
    ];
  } catch (err) {
    // Never fail the sitemap entirely — fall back to the static pages.
    console.error("[sitemap] dynamic entries failed:", err);
    return pages;
  }
}
