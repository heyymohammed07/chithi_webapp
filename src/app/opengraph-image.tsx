import { ImageResponse } from "next/og";
import { THEME_COLORS } from "@/lib/theme";

export const runtime = "nodejs";
export const alt = "Chithi · চিঠি — Anonymous Ephemeral Letters";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: THEME_COLORS.canvas.dark,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
          border: `2px solid ${THEME_COLORS.edge.dark}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "24px",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              fontSize: 96,
              fontFamily: "serif",
              fontWeight: 700,
              color: THEME_COLORS.inkHeading.dark,
            }}
          >
            Chithi
          </span>
          <span
            style={{
              fontSize: 64,
              fontFamily: "serif",
              color: THEME_COLORS.wax.dark,
            }}
          >
            চিঠি
          </span>
        </div>

        <div
          style={{
            fontSize: 28,
            color: THEME_COLORS.inkMuted.dark,
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.5,
          }}
        >
          Anonymous Ephemeral Letters · Quiet thoughts that dissolve into the night.
        </div>

        <div
          style={{
            marginTop: "48px",
            padding: "8px 24px",
            border: `1px solid ${THEME_COLORS.wax.dark}`,
            borderRadius: "4px",
            fontSize: 20,
            color: THEME_COLORS.wax.dark,
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Self-destructing Mailboxes
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
