"use client";

// Interactive A/A simulator: both arms identical, so every "winner" is a false alarm. Runs in chunks so the page never freezes.
import { useEffect, useRef, useState } from "react";
import { DEFAULT_SEED, merge, simulateRange, type SimConfig, type SimResult } from "@/lib/simulator";
import { Field, inputCls, btnPrimary } from "./Field";

const CHUNK = 25;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

interface Form { baseline: string; daily: string; days: string; every: string; tests: string }
const initial: Form = { baseline: "10", daily: "500", days: "24", every: "1", tests: "1000" };

function parse(f: Form): { ok: true; cfg: SimConfig } | { ok: false; error: string } {
  const n = (s: string) => (s.trim() === "" ? NaN : Number(s));
  const baseline = n(f.baseline), daily = n(f.daily), days = n(f.days), every = n(f.every), tests = n(f.tests);
  if (!(baseline >= 0.5 && baseline <= 50)) return { ok: false, error: "Baseline rate must be between 0.5 and 50 percent." };
  if (!Number.isInteger(daily) || daily < 50 || daily > 5000) return { ok: false, error: "Users per arm per day must be a whole number from 50 to 5,000." };
  if (!Number.isInteger(days) || days < 2 || days > 60) return { ok: false, error: "Days must be a whole number from 2 to 60." };
  if (!Number.isInteger(every) || every < 1 || every > days) return { ok: false, error: "Check every N days must be a whole number from 1 up to the number of days." };
  if (!Number.isInteger(tests) || tests < 100 || tests > 3000) return { ok: false, error: "Simulated tests must be a whole number from 100 to 3,000." };
  return { ok: true, cfg: { baseline: baseline / 100, dailyPerArm: daily, days, checkEvery: every, tests, seed: DEFAULT_SEED } };
}

function Curve({ r }: { r: SimResult }) {
  const W = 560, H = 220, M = { l: 44, r: 12, t: 12, b: 28 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;
  const top = Math.max(0.1, ...r.looks.map((l) => l.naive / r.tests)) * 1.1;
  const x = (i: number) => M.l + (r.looks.length === 1 ? iw / 2 : (i / (r.looks.length - 1)) * iw);
  const y = (v: number) => M.t + (1 - v / top) * ih;
  const path = (k: "naive" | "seq") => r.looks.map((l, i) => `${i ? "L" : "M"}${x(i)},${y(l[k] / r.tests)}`).join(" ");
  const ticks = [0, top / 2, top];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Share of simulated tests with a false winner, by look, ordinary against sequential">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="stroke-zinc-200 dark:stroke-zinc-800" />
          <text x={M.l - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-zinc-500 text-[11px]">{Math.round(t * 100)}%</text>
        </g>
      ))}
      <line x1={M.l} x2={W - M.r} y1={y(0.05)} y2={y(0.05)} className="stroke-zinc-500" strokeDasharray="2 3" />
      <text x={W - M.r} y={y(0.05) - 4} textAnchor="end" className="fill-zinc-500 text-[11px]">5% target</text>
      <path d={path("naive")} fill="none" strokeWidth={2} strokeDasharray="5 3" className="stroke-foreground" />
      <path d={path("seq")} fill="none" strokeWidth={2.5} className="stroke-sky-600 dark:stroke-sky-400" />
      <text x={M.l} y={H - 8} className="fill-zinc-500 text-[11px]">day {r.looks[0].day}</text>
      <text x={W - M.r} y={H - 8} textAnchor="end" className="fill-zinc-500 text-[11px]">day {r.looks[r.looks.length - 1].day}</text>
    </svg>
  );
}

export default function PeekSimulator() {
  const [form, setForm] = useState<Form>(initial);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [res, setRes] = useState<SimResult | null>(null);
  const [announce, setAnnounce] = useState("");
  const run = useRef(0);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => () => { run.current++; }, []); // stop a run that is still going if the page is left

  function start(e: React.FormEvent) {
    e.preventDefault();
    const p = parse(form);
    if (!p.ok) { setError(p.error); return; }
    setError(null); setAnnounce(""); setRes(null);
    const id = ++run.current;
    const { cfg } = p;
    let acc: SimResult | null = null;
    let done = 0;
    setProgress(0);
    const step = () => {
      if (id !== run.current) return; // a newer run started
      const to = Math.min(cfg.tests, done + CHUNK);
      acc = merge(acc, simulateRange(cfg, done, to));
      done = to;
      if (done < cfg.tests) { setProgress(done / cfg.tests); setTimeout(step, 0); return; }
      setProgress(null);
      setRes(acc);
      setAnnounce(`Done. Of ${acc.tests} tests with no real difference, checking every ${cfg.checkEvery} day${cfg.checkEvery === 1 ? "" : "s"} gave a false winner in ${pct(acc.naiveAny / acc.tests)} with the ordinary interval and ${pct(acc.seqAny / acc.tests)} with the sequential band.`);
    };
    setTimeout(step, 0);
  }

  return (
    <section className="mt-12 border-t border-border-token pt-8" id="peeking-simulator" aria-labelledby="sim-h">
      <h2 id="sim-h" className="text-xl font-semibold">Peeking simulator</h2>
      <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">
        Both versions here convert at exactly the same rate, so any &quot;winner&quot; is a false alarm. Set how often you look, and see how often a test gets called a win anyway.
        Runs in your browser with a fixed seed, so the same settings always give the same answer.
      </p>
      <form onSubmit={start} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="True rate in both versions (%)"><input className={inputCls} inputMode="decimal" value={form.baseline} onChange={set("baseline")} /></Field>
        <Field label="Users per version per day"><input className={inputCls} inputMode="numeric" value={form.daily} onChange={set("daily")} /></Field>
        <Field label="Days the test runs"><input className={inputCls} inputMode="numeric" value={form.days} onChange={set("days")} /></Field>
        <Field label="Look at the results every N days" hint="1 means a daily check."><input className={inputCls} inputMode="numeric" value={form.every} onChange={set("every")} /></Field>
        <Field label="Simulated tests" hint="100 to 3,000. More is smoother, a little slower."><input className={inputCls} inputMode="numeric" value={form.tests} onChange={set("tests")} /></Field>
        <div className="flex items-end"><button type="submit" className={btnPrimary} disabled={progress !== null}>{progress !== null ? `Running ${Math.round(progress * 100)}%` : "Run simulation"}</button></div>
      </form>
      {error && <p className="mt-3 text-sm text-red-700 dark:text-red-400" role="alert">{error}</p>}
      <div role="status" className="mt-4 min-h-6 text-sm font-medium">{announce}</div>
      {res && (
        <div className="mt-4 space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-sm text-zinc-500">Ordinary 95% interval, checked at every look</dt><dd className="font-mono text-2xl">{pct(res.naiveAny / res.tests)}</dd></div>
            <div><dt className="text-sm text-zinc-500">Sequential band</dt><dd className="font-mono text-2xl text-accent">{pct(res.seqAny / res.tests)}</dd></div>
          </dl>
          <p className="text-sm text-zinc-500">Share of tests called a winner or a loser at some look. The honest target is 5%. Solid line: sequential. Dashed: ordinary.</p>
          <Curve r={res} />
          <details className="text-sm">
            <summary className="cursor-pointer py-1 font-medium">Show the numbers by look</summary>
            <div className="mt-2 max-h-64 overflow-auto" role="region" aria-label="Numbers by look" tabIndex={0}>
              <table className="w-full text-left">
                <thead><tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800"><th scope="col" className="py-1 pr-3">Day</th><th scope="col" className="py-1 pr-3">Ordinary, tests flagged so far</th><th scope="col" className="py-1">Sequential</th></tr></thead>
                <tbody>{res.looks.map((l) => <tr key={l.day} className="border-b border-zinc-100 dark:border-zinc-900"><th scope="row" className="py-1 pr-3 font-normal">{l.day}</th><td className="py-1 pr-3">{pct(l.naive / res.tests)}</td><td className="py-1">{pct(l.seq / res.tests)}</td></tr>)}</tbody>
              </table>
            </div>
          </details>
          <p className="text-xs text-zinc-500">
            The sequential band is tuned to the full length of the test ({res.planned.toLocaleString("en-US")} users per version). Random draws use a normal approximation to the binomial, so that the Python check (scripts/check_simulator.py) reproduces the counts exactly. It also costs power: the sequential band needs a bigger effect to call a real win early.
          </p>
        </div>
      )}
    </section>
  );
}
