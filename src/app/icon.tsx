import { ImageResponse } from "next/og";

/**
 * Browser favicon — generated as a PNG at build time via ImageResponse so that
 * every browser (including Safari which does not support SVG favicons) gets a
 * proper raster icon.
 *
 * Design: same mark as the site header — dark enamel tile (#123b4a) with the
 * Lucide Wrench glyph in bench white (#eef1f4). The glyph is scaled up to ~65%
 * of the tile so it survives downsampling to 16 px.
 *
 * Corner radius 6 on a 32-tile reproduces `--radius-machined` at this scale.
 */

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#123b4a",
          borderRadius: 6,
        }}
      >
        {/* Lucide Wrench path, scaled to fill ~65 % of the 32×32 tile */}
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#eef1f4"
          strokeWidth={2.4}
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
