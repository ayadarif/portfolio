import EvalV2 from "./EvalV2";
import { categoryLabel, lookFirst, rankedRows, sharePct, type EvalBlock, type TriageData } from "@/lib/triage";

function Accuracy({ ev }: { ev: EvalBlock }) {
  if (ev.status !== "Done") {
    return <div className="mt-4 rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900"><span className="font-medium">Accuracy check:</span> {ev.status}.</div>;
  }
  const { run1, run2, keyword_baseline: kw, run_to_run: rr, confusion_run1: cm } = ev;
  const pc = (x: number) => `${(x * 100).toFixed(1)}%`;
  const cell = "px-2 py-1.5";
  return (
    <div className="mt-4 text-sm">
      <h3 className="text-lg font-semibold">Accuracy check against my labels</h3>
      <p className="mt-2 leading-6">
        I labelled {ev.n_eval} reviews by hand, using the same codebook, before the model saw them. The model&apos;s first category matches one of my two categories on <b>{run1.category_agree} of {run1.n}</b> reviews (95% interval {pc(run1.category_agree_ci[0])} to {pc(run1.category_agree_ci[1])}). A second, independent model run gave {run2.category_agree} of {run2.n}.
      </p>
      <div className="mt-3 overflow-x-auto" role="region" tabIndex={0} aria-label="Scrollable table">
        <table className="w-full min-w-[30rem]">
          <thead><tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800"><th className={cell}>Measure</th><th className={cell}>Run 1</th><th className={cell}>Run 2</th><th className={cell}>Keyword baseline</th></tr></thead>
          <tbody>
            <tr className="border-b border-zinc-100 dark:border-zinc-900"><td className={cell}>Matches either of my categories</td><td className={cell}>{run1.category_agree}</td><td className={cell}>{run2.category_agree}</td><td className={cell}>{kw.category_agree}</td></tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-900"><td className={cell}>Matches my first category exactly</td><td className={cell}>{run1.first_category_exact}</td><td className={cell}>{run2.first_category_exact}</td><td className={cell}>{kw.first_category_exact}</td></tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-900"><td className={cell}>Cohen&apos;s kappa, first category</td><td className={cell}>{run1.kappa_first_category.toFixed(2)}</td><td className={cell}>{run2.kappa_first_category.toFixed(2)}</td><td className={cell}>{kw.kappa_first_category.toFixed(2)}</td></tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-900"><td className={cell}>Severity exactly the same</td><td className={cell}>{run1.severity_exact}</td><td className={cell}>{run2.severity_exact}</td><td className={cell}>n/a</td></tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-900"><td className={cell}>Severity within one level</td><td className={cell}>{run1.severity_within_one}</td><td className={cell}>{run2.severity_within_one}</td><td className={cell}>n/a</td></tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-900"><td className={cell}>Share put in &quot;other&quot; (mine: {pc(run1.ayad_other_share)})</td><td className={cell}>{pc(run1.model_other_share)}</td><td className={cell}>{pc(run2.model_other_share)}</td><td className={cell}>{pc(kw.model_other_share)}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 leading-6">
        Run to run, the model gave the same first category on {rr.first_category_same} of {rr.n} reviews (kappa {rr.kappa.toFixed(2)}) and the same severity on {rr.severity_same} of {rr.n}. The keyword baseline is a fixed list of words per category, written before I saw any results.
      </p>
      <h4 className="mt-5 font-medium">Where the model and I differ (run 1)</h4>
      <p className="text-xs text-zinc-500">Rows are my first category, columns the model&apos;s. &quot;Rest&quot; groups the smaller categories.</p>
      <div className="mt-2 overflow-x-auto" role="region" tabIndex={0} aria-label="Scrollable table">
        <table className="w-full min-w-[32rem] text-xs">
          <thead><tr className="border-b border-zinc-200 dark:border-zinc-800"><th className={cell}></th>{cm.labels.map((l) => <th key={l} className={cell + " text-right"}>{l === "rest" ? "Rest" : categoryLabel(l)}</th>)}</tr></thead>
          <tbody>
            {cm.labels.map((r) => (
              <tr key={r} className="border-b border-zinc-100 dark:border-zinc-900"><th scope="row" className={cell + " text-left font-medium"}>{r === "rest" ? "Rest" : categoryLabel(r)}</th>{cm.rows[r].map((v, i) => <td key={i} className={cell + " text-right"}>{v}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <h4 className="mt-5 font-medium">What this does and does not show</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 leading-6">
        <li>One labeller (me), no second opinion, so some of the disagreement is my own inconsistency, not the model&apos;s error.</li>
        <li>The {ev.n_eval} reviews were drawn to include more 2 to 4 star reviews than the corpus has (and fewer 1 and 5 star ones), so these figures describe this set, not all 900 reviews.</li>
        <li>8 of the 9 first-category misses in run 1 were short or vague reviews such as &quot;Good beginning better end&quot;; the ninth was a balance problem the model labelled as app stability. The ranking above is built on the whole 900, where such reviews matter less, but I have not measured that.</li>
        <li>The interval covers sampling noise from 100 reviews only. It does not cover label quality.</li>
      </ul>
    </div>
  );
}

const th = "px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500";
const td = "px-2 py-2 align-top";

export default function TriagePage({ data }: { data: TriageData }) {
  const m = data.method;
  const groups = Object.entries(data.ranking);
  const year = m.year;
  return (
    <>
      <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">
        Among {m.n_classified.toLocaleString("en-US")} Google Play reviews from {year}, from an open research dataset. These are unverified
        user reports, sorted by a model and counted by code. Each number below describes this sample of reviews, not the bank. The three banks are the ones with the most reviews in the latest full year (2023).
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
          <p className="text-sm text-zinc-500">
            {info.n_reviews.toLocaleString("en-US")} reviews classified. A review can raise two categories, so shares can add up to more than 100%.
            Not ranked: praise {sharePct(info.categories.find((c) => c.category === "praise")?.share ?? 0)}, other {sharePct(info.categories.find((c) => c.category === "other")?.share ?? 0)}.
          </p>
          <div className="mt-3 overflow-x-auto" role="region" tabIndex={0} aria-label="Scrollable table">
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
                {quotes.map((q) => <li key={q.id} className="break-words">&quot;{q.quote}&quot;</li>)}
              </ul>
            </details>
          ))}
        </section>
      ))}

      {Object.keys(data.themes).length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Themes inside the biggest categories</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            The model grouped one-line summaries into named themes. Sizes are counts of reviews in that theme across the three banks. The model saw at most 150 summaries per category, so sizes cover that sample, not every review in the category, and a review can be left out of every theme.
          </p>
          {Object.entries(data.themes).map(([cat, ts]) => (
            <details key={cat} className="mt-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <summary className="cursor-pointer font-medium">{categoryLabel(cat)}</summary>
              <ul className="mt-2 space-y-2 text-sm">
                {ts.map((t) => (
                  <li key={t.name}>
                    <span className="font-medium">{t.name}</span> ({t.size}){" "}
                    <span className="break-words text-zinc-600 dark:text-zinc-400">{t.description}</span>
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
          <div><dt className="inline font-medium">Labels: </dt><dd className="inline">Labels by Ayad; an AI assistant helped draft the notes, not the labels.</dd></div>
          <div><dt className="inline font-medium">What the model is trusted to do: </dt><dd className="inline">sort and summarise short reviews. It is not trusted to count, rank or quote; code does that. It can be wrong, and the accuracy check below measures how often on 100 reviews.</dd></div>
        </dl>
        <Accuracy ev={data.eval} />
        <EvalV2 />
        <p className="mt-6 text-sm">
          Run it on your own feedback CSV: <a className="underline" href="https://github.com/ayadarif/portfolio/blob/main/scripts/triage/README.md">tool README</a>.
          Nothing on this page calls a model; it shows saved results.
        </p>
      </section>
    </>
  );
}
