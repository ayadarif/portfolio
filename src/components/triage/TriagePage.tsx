import { categoryLabel, lookFirst, rankedRows, sharePct, type TriageData } from "@/lib/triage";

const th = "px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500";
const td = "px-2 py-2 align-top";

export default function TriagePage({ data }: { data: TriageData }) {
  const m = data.method;
  const groups = Object.entries(data.ranking);
  const year = m.sample.match(/\b(20\d\d)\b/)?.[1] ?? "";
  return (
    <>
      <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">
        Among {m.n_classified.toLocaleString("en-US")} Google Play reviews from {year}, from an open research dataset. These are unverified
        user reports, sorted by a model and counted by code. Each number below describes this sample of reviews, not the bank.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Where I would look first</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The three highest-priority categories per bank. Priority is {m.priority_definition}.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {groups.map(([g, info]) => (
            <div key={g} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="font-semibold">{g}</h3>
              <p className="text-xs text-zinc-500">{info.n_reviews.toLocaleString("en-US")} reviews</p>
              <ol className="mt-3 space-y-2 text-sm">
                {lookFirst(info).map((c) => (
                  <li key={c.category}>
                    <span className="font-medium">{categoryLabel(c.category)}</span>
                    <br />
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {sharePct(c.share)} of reviews, severity {c.avg_severity.toFixed(2)}, priority {c.priority.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-zinc-500">
                {info.robustness.holds
                  ? "The same top three appear when ranked by count alone or by severity 3 reviews alone."
                  : `Ranking by count alone ${info.robustness.same_set_by_count ? "gives the same top three" : "changes the top three"}; by severity 3 reviews alone ${info.robustness.same_set_by_severity3 ? "gives the same top three" : "changes the top three"}.`}
              </p>
            </div>
          ))}
        </div>
      </section>

      {groups.map(([g, info]) => (
        <section key={g} className="mt-12">
          <h2 className="text-xl font-semibold">{g}</h2>
          <p className="text-sm text-zinc-500">{info.n_reviews.toLocaleString("en-US")} reviews classified</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className={th}>#</th><th className={th}>Category</th><th className={th}>Share</th><th className={th}>Avg stars</th><th className={th}>Avg severity</th><th className={th}>Priority</th>
                </tr>
              </thead>
              <tbody>
                {rankedRows(info).map((c) => (
                  <tr key={c.category} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className={td}>{c.rank}</td>
                    <td className={td}>{categoryLabel(c.category)}</td>
                    <td className={td}>{sharePct(c.share)}</td>
                    <td className={td}>{c.avg_rating === null ? "n/a" : c.avg_rating.toFixed(1)}</td>
                    <td className={td}>{c.avg_severity.toFixed(2)}</td>
                    <td className={td}>{c.priority.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {Object.entries(data.excerpts[g] ?? {}).filter(([, q]) => q.length > 0).map(([cat, quotes]) => (
            <details key={cat} className="mt-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <summary className="cursor-pointer text-sm font-medium">{categoryLabel(cat)}: example quotes</summary>
              <ul className="mt-2 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                {quotes.map((q) => <li key={q.id}>&quot;{q.quote}&quot;</li>)}
              </ul>
            </details>
          ))}
        </section>
      ))}

      {Object.keys(data.themes).length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Themes inside the biggest categories</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            The model grouped one-line summaries into named themes. Sizes are counts of reviews in that theme across the three banks; a review can be left out of every theme.
          </p>
          {Object.entries(data.themes).map(([cat, ts]) => (
            <details key={cat} className="mt-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <summary className="cursor-pointer font-medium">{categoryLabel(cat)}</summary>
              <ul className="mt-2 space-y-2 text-sm">
                {ts.map((t) => (
                  <li key={t.name}>
                    <span className="font-medium">{t.name}</span> ({t.size}){" "}
                    <span className="text-zinc-600 dark:text-zinc-400">{t.description}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-semibold">How it was made</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6">
          <li>Ingest: filter, strip personal data with patterns, sample with a fixed seed.</li>
          <li>Classify (model): up to two categories, a severity from 1 to 3 and a one-line summary per review, 25 reviews per call. Answers are checked in code.</li>
          <li>Count and rank (code only): share, average stars, average severity and priority per bank. Praise and other are counted but not ranked.</li>
          <li>Theme (model): names themes inside the biggest categories.</li>
          <li>Excerpts (model picks, code checks): a quote is kept only if it appears word for word in the review.</li>
        </ol>
        <dl className="mt-4 space-y-2 text-sm">
          <div><dt className="inline font-medium">Data: </dt><dd className="inline">{m.dataset}. <a className="underline" href={m.dataset_url}>Source</a>. Licence: {m.dataset_licence}. {m.dataset_note}</dd></div>
          <div><dt className="inline font-medium">Sample: </dt><dd className="inline">{m.sample}.</dd></div>
          <div><dt className="inline font-medium">Run: </dt><dd className="inline">{m.run_date}, {m.model}, Claude Code {m.claude_code_version}, prompt hash {m.prompt_hash}. {m.n_unclassified} reviews could not be classified.</dd></div>
          <div><dt className="inline font-medium">What the model is trusted to do: </dt><dd className="inline">sort and summarise short reviews. It is not trusted to count, rank or quote; code does that. It can be wrong, and the accuracy check below is how I find out how often.</dd></div>
        </dl>
        <div className="mt-4 rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
          <span className="font-medium">Accuracy check:</span> {data.eval.status}.
        </div>
        <p className="mt-6 text-sm">
          Run it on your own feedback CSV: <a className="underline" href="https://github.com/ayadarif/portfolio/blob/main/scripts/triage/README.md">tool README</a>.
          Nothing on this page calls a model; it shows saved results.
        </p>
      </section>
    </>
  );
}
