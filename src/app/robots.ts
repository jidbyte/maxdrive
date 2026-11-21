import type { MetadataRoute } from "next";

import { siteConfig } from "@/shared/config/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");
  // Keep Vercel preview deployments (and anything explicitly opted out)
  // out of search results entirely.
  const blockAll =
    process.env.VERCEL_ENV === "preview" || process.env.ALLOW_INDEXING === "false";

  if (blockAll) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/api/",
        "/invite/",
        "/shop/cart",
        "/shop/checkout",
        "/shop/order/",
        "/services/booking/",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/*?*q=", // internal search results
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
