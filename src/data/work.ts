// One list for the index table, the home sections and the /work/[slug] pages, built from content.ts.
import { caseStudies, projects, type CaseStudy, type Project } from "./content";

export type WorkItem = {
  slug: string;
  name: string;
  kind: "Case study" | "Tool" | "AI pipeline" | "Prototype";
  status: string;
  year: string;
  metric: string;
  headline: string;
  role: string;
  tldr: [string, string, string];
  href?: string; // the live tool, for projects
  study?: CaseStudy;
  project?: Project;
};

const cases: WorkItem[] = caseStudies.map((c) => ({
  slug: c.slug, name: c.title.split(":")[0], kind: "Case study", status: "Shipped", year: c.year, metric: c.metric,
  headline: c.headline, role: c.role, tldr: c.tldr, study: c,
}));

const tools: WorkItem[] = projects.map((p) => ({
  slug: p.slug, name: p.name, kind: p.type as WorkItem["kind"], status: p.status.startsWith("Prototype") ? "Prototype" : p.status, year: p.year, metric: p.metric,
  headline: p.headline, role: "Designed, specified and verified by Ayad; built with Claude Code.", tldr: p.tldr, href: p.href, project: p,
}));

export const work: WorkItem[] = [...cases, ...tools];
export const bySlug = (slug: string) => work.find((w) => w.slug === slug);
