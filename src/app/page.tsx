import Hero from "@/components/Hero";
import IndexTable from "@/components/IndexTable";
import WorkSections from "@/components/WorkSections";
import { PROVENANCE } from "@/data/content";

// Fails the build if anything dynamic slips into this route.
export const ensureStatic = "navigation";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <Hero />
      <IndexTable />
      <WorkSections />
      <p className="border-t border-border-token pt-6 text-sm text-muted">The tools above: {PROVENANCE}</p>
    </main>
  );
}
