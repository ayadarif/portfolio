import Hero from "@/components/Hero";
import IndexTable from "@/components/IndexTable";
import WorkSections from "@/components/WorkSections";
import { PROVENANCE, intro, SITE_URL, contactLinks } from "@/data/content";

// Fails the build if anything dynamic slips into this route.
export const ensureStatic = "navigation";

// Structured data for search engines. "<" is escaped so the JSON can never close the script tag.
const personJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Person",
  name: intro.name,
  jobTitle: "Product Manager",
  url: SITE_URL,
  address: { "@type": "PostalAddress", addressLocality: "Karachi", addressCountry: "PK" },
  sameAs: contactLinks.filter((l) => l.href.startsWith("http")).map((l) => l.href),
}).replace(/</g, "\\u003c");

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: personJsonLd }} />
      <Hero />
      <IndexTable />
      <WorkSections />
      <p className="border-t border-border-token pt-6 text-sm text-muted">The tools above: {PROVENANCE}</p>
    </main>
  );
}
