import type { CaseStudy } from "@/data/content";

// One labelled row inside the card (e.g. "Problem" + its text).
function Row({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <dt className="font-mono text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 leading-7">{text}</dd>
    </div>
  );
}

// Same as Row, but shows a bulleted list instead of one paragraph.
function ListRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <dt className="font-mono text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1">
        <ul className="list-disc space-y-1 pl-5 leading-7">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

export default function CaseStudyCard({ study }: { study: CaseStudy }) {
  return (
    <article className="mt-8 border-t border-border-token pt-6">
      <h2 className="text-xl font-semibold">{study.title}</h2>
      <dl className="mt-6 space-y-4">
        <Row label="Problem" text={study.problem} />
        <Row label="What I did" text={study.whatIDid} />
        <ListRow label="Results" items={study.results} />
        <div>
          <dt className="font-mono text-xs uppercase tracking-wider text-zinc-500">
            What I learned
          </dt>
          <dd className="mt-1 leading-7">
            {study.learned}
            {study.learnedLink && (
              <>
                {" "}Later, I built those checks into a tool:{" "}
                <a href={study.learnedLink.href} className="font-medium text-accent underline">
                  {study.learnedLink.text}
                </a>
                .
              </>
            )}
          </dd>
        </div>
      </dl>
    </article>
  );
}
