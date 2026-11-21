import { ImageResponse } from "next/og";

import { siteConfig } from "@/shared/config/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social share card (pages with their own image override it). */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "radial-gradient(900px 500px at 85% 20%, rgba(56,189,248,0.35), transparent 65%), #000",
          color: "#f4f8ff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="9" fill="#38bdf8" />
            <path d="M17.5 6 9 18h6l-1.5 8L23 14h-6l.5-8z" fill="#001726" />
          </svg>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, letterSpacing: 3 }}>
            MAX<span style={{ color: "#38bdf8" }}>DRIVE</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Parts that fit.</div>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, color: "#38bdf8" }}>
            Service you trust.
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#8b98ab" }}>
            Genuine &amp; OEM-grade auto parts · Expert workshop servicing
          </div>
        </div>
      </div>
    ),
    size,
  );
}
