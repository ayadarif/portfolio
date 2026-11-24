import Link from "next/link";
import { work } from "@/data/work";

// One section per item, each with a deep link (/#slug): outcome headline, role line, three-line summary, then the long version.
export default function WorkSections() {
  return (
    <div>
      {work.map((w) => (
        <section key={w.slug} id={w.slug} className="border-t border-border-token py-8">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">{w.kind} · {w.status} · {w.year}</p>
          <h2 className="mt-2 text-xl font-semibold">{w.name}</h2>
          <p className="mt-2 text-lg leading-7">{w.headline}</p>
          <p className="mt-2 text-sm text-muted">{w.role}</p>
          <ul className="mt-4 list-disc space-y-1.5 pl-5 leading-7">
            {w.tldr.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
            <Link href={`/work/${w.slug}`} className="inline-block py-1 text-accent">{w.study ? "Read the full case" : "Read more"}</Link>
            {w.href && (
              <a href={w.href} className="inline-block py-1 text-accent" {...(w.href.startsWith("http") ? { rel: "noopener noreferrer" } : {})}>
                {w.href.startsWith("http") ? "Open the prototype" : "Open the tool"}
              </a>
            )}
          </p>
        </section>
      ))}
    </div>
  );
}
