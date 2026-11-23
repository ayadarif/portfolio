import type { CaseStudy } from "@/data/content";

// One labelled row inside the card (e.g. "Problem" + its text).
function Row({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 leading-7">{text}</dd>
    </div>
  );
}

export default function CaseStudyCard({ study }: { study: CaseStudy }) {
  return (
    <article className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
      <h3 className="text-xl font-semibold">{study.title}</h3>
      <p className="mt-1 text-sm text-zinc-500">{study.role}</p>
      <dl className="mt-6 space-y-4">
        <Row label="Problem" text={study.problem} />
        <Row label="What I did" text={study.whatIDid} />
        <Row label="Results" text={study.results} />
        <Row label="What I learned" text={study.learned} />
      </dl>
    </article>
  );
}
