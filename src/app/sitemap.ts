import type { MetadataRoute } from "next";
import { SITE_URL } from "@/data/content";
import { work } from "@/data/work";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/experiment-readout", "/feedback-triage", "/pmex-calculator", ...work.map((w) => `/work/${w.slug}`)];
  return pages.map((p) => ({ url: `${SITE_URL}${p}` }));
}
