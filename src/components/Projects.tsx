import { projects } from "@/data/content";

export default function Projects() {
  return (
    <section id="projects" className="py-12">
      <h2 className="text-2xl font-semibold">Projects</h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {projects.map((p) => (
          <article
            key={p.name}
            className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              {p.status}
            </p>
            <h3 className="mt-2 text-lg font-semibold">{p.name}</h3>
            <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">
              {p.description}
            </p>
            {p.href && (
              <a href={p.href} className="mt-4 inline-block font-medium underline">
                View project
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
