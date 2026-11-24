"use client";

import type { Readout as R, Setup } from "@/lib/readout";
import type { Status, Verdict } from "@/lib/stats";
import LiftChart from "./LiftChart";
import WrittenReadout from "./WrittenReadout";
import { int, pct, pval, signedInt, spct, spts } from "./format";

const banner: Record<Verdict, { cls: string; line: string }> = {
  "Ship it": { cls: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100", line: "Full sample reached, split is healthy, and the whole confidence range is above zero." },
  "Don't ship: it hurt": { cls: "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100", line: "Full sample reached and the whole confidence range is below zero." },
  "Early win (valid sequential call)": { cls: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100", line: "Before the planned sample, but the sequential range is above zero and stays valid under daily checking. Early calls tend to overstate the effect size." },
  "Stop: it's hurting": { cls: "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100", line: "Before the planned sample, but the sequential range is below zero and stays valid under daily checking. Early calls tend to overstate the effect size." },
  "Keep running": { cls: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100", line: "The plan says wait for the full sample. The sequential range still includes zero, so there is no valid early call yet." },
  "Fix the data first": { cls: "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100", line: "The split is broken, so no number below can be trusted until that is fixed." },
  "No clear winner": { cls: "border-zinc-300 bg-zinc-100 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100", line: "The test is complete but cannot tell the variants apart." },
};

const dot: Record<Status | "unset", string> = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", unset: "bg-zinc-400" };
const word: Record<Status | "unset", string> = { green: "Pass", amber: "Warning", red: "Fail", unset: "Skipped" };

export default function Readout({ r, setup }: { r: R; setup: Setup }) {
  const { totals, cmp, srm, early, power, mde, impact } = r;
  const planned = `${Math.round(setup.shareA * 100)}/${100 - Math.round(setup.shareA * 100)}`;
  const obs = `${(srm.observedShareA * 100).toFixed(1)}/${(100 - srm.observedShareA * 100).toFixed(1)}`;
  const conf = Math.round(setup.confidence * 100);

  const checks: { name: string; status: Status | "unset"; reason: string }[] = [
    {
      name: "Sample ratio",
      status: srm.status,
      reason: srm.status === "red"
        ? `Users split ${obs} against a planned ${planned} (p ${pval(srm.pValue)}). Assignment is probably broken.`
        : `Users split ${obs} against a planned ${planned} (p = ${pval(srm.pValue)}). Nothing odd.`,
    },
    {
      name: "Called too early",
      status: early.status,
      reason: early.status === "red"
        ? `Smallest arm has ${int(Math.min(totals.a.users, totals.b.users))} users; the plan was ${int(setup.plannedPerVariant)}. ${int(early.shortfall)} short.`
        : `Both arms reached the planned ${int(setup.plannedPerVariant)} users.`,
    },
    {
      name: "Underpowered",
      status: power.status,
      reason: power.targetAbs === null
        ? "Skipped: no smallest lift was set. Go back to Setup and fill in \"Smallest lift you care about\" to turn this check on."
        : power.status === "amber"
          ? `This sample can only detect lifts of ${spts(mde).replace("+", "")} or more; you cared about ${spts(power.targetAbs).replace("+", "")}. "No difference" would mean little.`
          : `This sample can detect lifts down to ${spts(mde).replace("+", "")}, smaller than the ${spts(power.targetAbs).replace("+", "")} you cared about.`,
    },
  ];

  const rows: [string, string][] = [
    [`Control: ${totals.controlName}`, `${pct(cmp.control.rate)} (${pct(cmp.control.ciLow)} to ${pct(cmp.control.ciHigh)})`],
    [`Treatment: ${totals.treatmentName}`, `${pct(cmp.treatment.rate)} (${pct(cmp.treatment.ciLow)} to ${pct(cmp.treatment.ciHigh)})`],
    ["Absolute lift", `${spts(cmp.absLift)} (${spts(cmp.absLiftLow)} to ${spts(cmp.absLiftHigh)})`],
    ["Relative lift", cmp.relLift === null ? "Not available (control rate is 0)" : `${spct(cmp.relLift, 1)} (${spct(cmp.relLiftLow!, 1)} to ${spct(cmp.relLiftHigh!, 1)})`],
    ["p-value (two-sided)", pval(cmp.pValue)],
    ["Minimum detectable effect", `${(mde * 100).toFixed(2)} pts at this sample${cmp.control.rate > 0 ? ` (${pct(mde / cmp.control.rate, 1)} relative)` : ""}`],
    ["Users", `${int(totals.a.users)} vs ${int(totals.b.users)}`],
    ["Conversions", `${int(totals.a.conversions)} vs ${int(totals.b.conversions)}`],
  ];
  if (impact) rows.push(["Monthly impact range", `${signedInt(impact.low)} to ${signedInt(impact.high)} (likely ${signedInt(impact.mid)})`]);

  const b = banner[r.verdict];
  return (
    <div className="space-y-8">
      {(setup.name || setup.hypothesis) && (
        <div>
          {setup.name && <h2 className="text-xl font-semibold">{setup.name}</h2>}
          {setup.hypothesis && <p className="mt-1 text-zinc-600 dark:text-zinc-400">{setup.hypothesis}</p>}
          {setup.metric && <p className="mt-1 text-sm text-zinc-500">Metric: {setup.metric}</p>}
        </div>
      )}

      <div role="status" className={`rounded-xl border p-5 ${b.cls}`}>
        <p className="text-xs font-medium uppercase tracking-wider opacity-70">Verdict</p>
        <p className="mt-1 text-2xl font-semibold">{r.verdict}</p>
        <p className="mt-1 text-sm">{b.line}</p>
      </div>

      <WrittenReadout r={r} setup={setup} />

      <section>
        <h3 className="text-lg font-semibold">Checks</h3>
        <ul className="mt-3 space-y-3">
          {checks.map((c) => (
            <li key={c.name} className="flex gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${dot[c.status]}`} aria-hidden />
              <div>
                <p className="font-medium">{c.name}: <span className="font-normal">{word[c.status]}</span></p>
                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{c.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Numbers</h3>
        <dl className="mt-3 divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-1 p-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
              <dt className="text-sm text-zinc-500">{k}</dt>
              <dd className="text-sm font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-zinc-500">Ranges are {conf}% confidence intervals. Rates use Wilson intervals; the p-value is a two-proportion z-test. MDE assumes 80% power.</p>
      </section>

      {r.series.length > 1 && (
        <section>
          <h3 className="text-lg font-semibold">Lift over time</h3>
          <div className="mt-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <LiftChart series={r.series} plannedPerVariant={setup.plannedPerVariant} />
          </div>
        </section>
      )}
    </div>
  );
}
