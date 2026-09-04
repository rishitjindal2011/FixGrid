import { ImageResponse } from "next/og";

/**
 * The iOS home-screen icon.
 *
 * Rendered at build time via ImageResponse for high-DPI iOS home screens.
 * Design: Option 1 Clean 3B — silk sunset gradient (#0284c7 -> #0f3d4c -> #ea580c)
 * with the pure white Lucide Wrench glyph.
 */

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
          background: "linear-gradient(135deg, #0284c7 0%, #0f3d4c 45%, #c2410c 85%, #ea580c 100%)",
        }}
      >
        <svg
          width="112"
          height="112"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </div>
    ),
    size,
  );
}
