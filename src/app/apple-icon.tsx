import { ImageResponse } from "next/og";

/**
 * Home-screen icon for iOS.
 *
 * Generated so there is no binary asset in the repository to keep in sync with the brand. The
 * tick is drawn as SVG geometry rather than written as a "✓" character, because the image
 * renderer would have to fetch a font to shape a glyph and a build must not depend on a
 * network request succeeding.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#1d63d8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="112" height="112" viewBox="0 0 32 32" fill="none">
        <path d="M6 12h13M6 17.5h8" stroke="#bfe2fe" strokeWidth="2.4" strokeLinecap="round" />
        <path
          d="M8 23 13 27.5 26 9.5"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>,
    size,
  );
}
