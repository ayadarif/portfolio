import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { bySlug, work } from "@/data/work";
import CaseStudyCard from "@/components/CaseStudyCard";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return work.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const w = bySlug(slug);
  if (!w) return {};
  return { title: w.name, description: w.headline, openGraph: { title: `${w.name} | Ayad Arif`, description: w.headline, type: "article" } };
}

export default async function WorkPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const w = bySlug(slug);
  if (!w) notFound();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm"><Link href="/" className="text-accent">Back to all work</Link></p>
      <p className="mt-6 font-mono text-xs uppercase tracking-wider text-muted">{w.kind} · {w.status} · {w.year}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{w.name}</h1>
      <p className="mt-3 text-lg leading-7">{w.headline}</p>
      <p className="mt-2 text-sm text-muted">{w.role}</p>
      <ul className="mt-5 list-disc space-y-1.5 pl-5 leading-7">{w.tldr.map((t) => <li key={t}>{t}</li>)}</ul>
      {w.study && <CaseStudyCard study={w.study} />}
      {w.project && (
        <div className="mt-6 space-y-4 leading-7">
          <p>{w.project.description}</p>
          {w.href && (
            <p className="font-medium">
              <a href={w.href} className="text-accent" {...(w.href.startsWith("http") ? { rel: "noopener noreferrer" } : {})}>
                {w.href.startsWith("http") ? "Open the prototype" : "Open the tool"}
              </a>
            </p>
          )}
        </div>
      )}
    </main>
  );
}
