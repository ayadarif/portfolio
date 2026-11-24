// Link preview card (LinkedIn, Slack and so on). Next builds this PNG at build time and adds the og:image tag.
import { ImageResponse } from "next/og";
import { intro } from "@/data/content";

export const alt = `${intro.name} | Product Manager`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 96, background: "#f7f7fb", color: "#1c1c26" }}>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700 }}>{intro.name}</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 44, color: "#34247f" }}>{intro.headline}</div>
        <div style={{ display: "flex", marginTop: 56, fontSize: 32, color: "#4a4a5e" }}>Karachi, PKT (UTC+5). Case studies and AI tools.</div>
      </div>
    ),
    { ...size },
  );
}
