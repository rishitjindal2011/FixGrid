import { ImageResponse } from "next/og";

/**
 * The iOS home-screen icon.
 *
 * A generated PNG rather than a second copy of `icon.svg`, because the
 * `apple-icon` convention accepts only `.jpg`, `.jpeg` and `.png` — Safari will
 * not take an SVG here. `ImageResponse` renders the same mark at build time, so
 * there is no binary asset in the repo to drift out of step with the header.
 *
 * The design differs from `icon.svg` in one respect on purpose: iOS masks the
 * icon to its own rounded rectangle and draws it against the wallpaper, so the
 * tile is drawn edge-to-edge with no radius of its own. Rounding it here would
 * show as a dark halo inside Apple's mask.
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
          // --color-enamel. Hard-coded because this renders outside the
          // document, where the @theme custom properties do not exist.
          background: "#123b4a",
        }}
      >
        <svg
          width="112"
          height="112"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#eef1f4"
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
