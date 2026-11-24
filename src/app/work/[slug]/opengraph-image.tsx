// Per-item link preview: the item name and its headline result, so a shared link carries the proof.
import { ImageResponse } from "next/og";
import { bySlug, work } from "@/data/work";

export const alt = "Ayad Arif: work";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return work.map((w) => ({ slug: w.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = bySlug(slug);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#f7f7fb", color: "#1c1c26" }}>
        <div style={{ display: "flex", fontSize: 32, color: "#4a4a5e" }}>{w ? `${w.kind} · ${w.year}` : "Ayad Arif"}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700 }}>{w?.name ?? "Ayad Arif"}</div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 40, lineHeight: 1.25, color: "#34247f" }}>{w?.headline ?? ""}</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#4a4a5e" }}>Ayad Arif, product manager</div>
      </div>
    ),
    { ...size },
  );
}
