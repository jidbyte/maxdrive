import type { NextConfig } from "next";

// Allow product images served from the R2 public bucket domain.
const r2Host = (() => {
  try {
    return process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : null;
  } catch {
    return null;
  }
})();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      ...(r2Host ? [{ protocol: "https" as const, hostname: r2Host }] : []),
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google profile photos
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // Old AREA multi-store URLs → MAXDRIVE equivalents.
    return [
      { source: "/stores", destination: "/shop", permanent: true },
      { source: "/stores/:store", destination: "/shop", permanent: true },
      { source: "/stores/:store/cart", destination: "/shop/cart", permanent: true },
      { source: "/stores/:store/checkout", destination: "/shop/checkout", permanent: true },
      { source: "/all-orders", destination: "/account/orders", permanent: true },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "127.0.0.1:3000", "maxdrive.com", "www.maxdrive.com"],
    },
  },
};

export default nextConfig;
