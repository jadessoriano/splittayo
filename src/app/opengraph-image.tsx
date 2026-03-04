import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SplitTayo — Split expenses with friends";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #d97706 0%, #f59407 30%, #7c1bf2 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 28,
            backgroundColor: "rgba(255,255,255,0.2)",
            marginBottom: 32,
          }}
        >
          <span
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: -2,
            }}
          >
            ST
          </span>
        </div>

        {/* Title */}
        <span
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: -2,
            textShadow: "0 2px 10px rgba(0,0,0,0.15)",
          }}
        >
          SplitTayo
        </span>

        {/* Tagline */}
        <span
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.9)",
            marginTop: 16,
            textShadow: "0 1px 4px rgba(0,0,0,0.1)",
          }}
        >
          Split expenses with friends. No app. No sign-up.
        </span>
      </div>
    ),
    { ...size }
  );
}
