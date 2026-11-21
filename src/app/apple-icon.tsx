import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="9" fill="#38bdf8" />
          <path d="M17.5 6 9 18h6l-1.5 8L23 14h-6l.5-8z" fill="#001726" />
        </svg>
      </div>
    ),
    size,
  );
}
