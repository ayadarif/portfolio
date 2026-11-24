// Rule-based written readout: 4 to 6 plain sentences built from the verdict and the numbers. No AI involved.
// The word "significant" is only ever printed when p < alpha AND the lift CI excludes zero (see significance()).
import { int, pct, signedInt, spct } from "../components/readout/format";
import type { Readout, Setup } from "./readout";
import type { Comparison, Verdict } from "./stats";

export function significance(cmp: Comparison): { significant: boolean; positive: boolean; negative: boolean } {
  const passes = cmp.pValue < 1 - cmp.confidence; // same test verdict() uses
  const positive = passes && cmp.absLiftLow > 0;
  const negative = passes && cmp.absLiftHigh < 0;
  return { significant: positive || negative, positive, negative };
}

export const TRENDING_NEGATIVE = "Trending negative. If this metric is critical, stop under a pre-agreed rule rather than waiting.";

const sign = (x: number) => (x >= 0 ? "+" : "−");
const points = (x: number) => `${sign(x)}${Math.abs(x * 100).toFixed(2)}`; // rate points, no unit
const plainPoints = (x: number) => `${Math.abs(x * 100).toFixed(2)} percentage points`;
const pText = (p: number) => (p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`);
const money = (n: number) => (n < 0 ? `−${int(-n)}` : int(n));

export function buildNarrative(setup: Setup, r: Readout): string[] {
  const { totals, cmp, srm, early, power, mde, impact } = r;
  const v: Verdict = r.verdict;
  const sig = significance(cmp);
  const conf = Math.round(setup.confidence * 100);
  const out: string[] = [];
  const range = `${points(cmp.absLiftLow)} to ${points(cmp.absLiftHigh)} percentage points`;
  const smaller = Math.min(totals.a.users, totals.b.users);
  const earlyCall = v === "Early win (valid sequential call)" || v === "Stop: it's hurting";
  const seqRange = `${points(r.seq.low)} to ${points(r.seq.high)} percentage points`;

  // 1. What happened.
  const rel = cmp.relLift === null ? "" : `${spct(cmp.relLift, 1)} relative, `;
  out.push(
    `${v === "Keep running" || earlyCall ? "So far, the" : "The"} new version converted at ${pct(cmp.treatment.rate)} against ${pct(cmp.control.rate)} for the original ` +
      `(${rel}${points(cmp.absLift)} percentage points), based on ${int(totals.a.users)} and ${int(totals.b.users)} users.`,
  );

  // 2. How confident to be.
  if (v === "Fix the data first") {
    const planned = Math.round(setup.shareA * 100);
    out.push(
      `Do not trust these numbers: users were split ${(srm.observedShareA * 100).toFixed(1)}/${(100 - srm.observedShareA * 100).toFixed(1)} against a planned ${planned}/${100 - planned} ` +
        `(${pText(srm.pValue)}), which almost always means assignment is broken, and a broken split can fake or hide a real effect.`,
    );
  } else if (v === "Keep running") {
    let s = `Do not lean on this yet: each version should reach ${int(setup.plannedPerVariant)} users and the smaller one has ${int(smaller)}, and early results swing a lot.`;
    if (sig.positive) s += ` The gap already clears the ${conf}% bar (${pText(cmp.pValue)}), but results checked before the planned sample often fade, so wait.`;
    else if (!sig.negative) s += ` The likely true lift is anywhere from ${range}, which is too wide to call.`;
    out.push(s);
  } else if (v === "Early win (valid sequential call)") {
    out.push(
      `This is an early call, and it is a valid one: the planned ${int(setup.plannedPerVariant)} users per version have not been reached (the smaller has ${int(smaller)}), ` +
        `but the sequential range (${seqRange}) is entirely above zero, and that range holds up even if you check every day. ` +
        `Early calls tend to overstate the size of the effect, so the final lift may well be smaller than ${points(cmp.absLift)} points.`,
    );
  } else if (v === "Stop: it's hurting") {
    out.push(
      `This is an early call, and it is a valid one: the planned ${int(setup.plannedPerVariant)} users per version have not been reached (the smaller has ${int(smaller)}), ` +
        `but the sequential range (${seqRange}) is entirely below zero, and that range holds up even if you check every day. ` +
        `Early calls tend to overstate the size of the effect, so the true harm may be smaller than ${points(cmp.absLift)} points.`,
    );
  } else if (v === "Ship it") {
    out.push(`You can be fairly confident: the likely true lift is ${range} (${conf}% confidence), the whole range is above zero, and the result is statistically significant (${pText(cmp.pValue)}).`);
  } else if (v === "Don't ship: it hurt") {
    out.push(`You can be fairly confident it made things worse: the likely true lift is ${range} (${conf}% confidence), the whole range is below zero, and the result is statistically significant (${pText(cmp.pValue)}).`);
  } else {
    out.push(`Confidence in any difference is low: the likely true lift is ${range} (${conf}% confidence), and that range includes zero, so the data cannot separate a real effect from chance.`);
  }

  // 3. Caveats (only the ones not already covered above).
  const caveats: string[] = [];
  if (early.status === "red" && v !== "Keep running" && !earlyCall) caveats.push(`The test is also short of its planned sample by ${int(early.shortfall)} users.`);
  if (power.status === "amber" && power.targetAbs !== null) {
    caveats.push(`This sample could only detect lifts of ${plainPoints(mde)} or more and you cared about ${plainPoints(power.targetAbs)}, so a flat result says little.`);
  }
  if (power.status === "unset" && v === "No clear winner") caveats.push("No smallest lift was set, so the power check was skipped.");
  out.push(caveats.length ? caveats.join(" ") : "The checks on split, sample size and power raised no concerns.");

  // 4. Business impact (not when the data is broken).
  if (impact && setup.monthlyUsers !== null && v !== "Fix the data first") {
    const k = setup.monthlyUsers;
    out.push(
      earlyCall
        ? `If it holds, expect roughly ${signedInt(cmp.absLift * k)} conversions a month, but only the sequential range is valid this early: ${signedInt(r.seq.low * k)} to ${signedInt(r.seq.high * k)} a month.`
        : `If shipped, expect roughly ${signedInt(cmp.absLift * k)} conversions a month (range ${signedInt(cmp.absLiftLow * k)} to ${signedInt(cmp.absLiftHigh * k)}), worth about ${money(impact.mid)}.`,
    );
  }

  // 5. What to do next.
  if (v === "Fix the data first") out.push("Find out why users were not split as planned, fix it, and rerun the test; do not act on this result.");
  else if (v === "Keep running") out.push(`Keep the test running until both versions reach ${int(setup.plannedPerVariant)} users, then read it again.`);
  else if (v === "Early win (valid sequential call)") out.push(`You may act now, or keep running to ${int(setup.plannedPerVariant)} users per version for a tighter estimate of the size of the win.`);
  else if (v === "Stop: it's hurting") out.push("Stop the test, and work out why it lowered the metric before trying again.");
  else if (v === "Ship it") out.push("Roll it out, and watch the metric after launch to confirm the gain holds.");
  else if (v === "Don't ship: it hurt") out.push("Do not ship this version; work out why it lowered the metric before trying again.");
  else if (power.status === "amber") out.push("Do not read this as proof the change does nothing: run a bigger or longer test, or accept that lifts this small are not worth chasing.");
  else out.push("Treat this as no evidence for shipping: decide on other grounds, or test a bolder change.");

  // Extra warning line.
  if (v === "Keep running" && sig.negative) out.push(TRENDING_NEGATIVE);
  return out;
}

// ---------- What the optional AI rewrite is allowed to see ----------

export interface RewritePayload {
  verdict: Verdict;
  significant: boolean;
  trendingNegative: boolean;
  numbers: Record<string, number | null>; // percentages are in percent units (4.8 means 4.8%)
  readout: string; // the rule-based text; the rewrite must say the same thing
}

const r4 = (x: number | null) => (x === null ? null : Number(x.toFixed(4)));

// Only computed numbers and the verdict. No experiment name, hypothesis or metric text.
export function rewritePayload(setup: Setup, r: Readout, sentences: string[]): RewritePayload {
  const { cmp, totals, early, mde, power, impact } = r;
  const sig = significance(cmp);
  const k = setup.monthlyUsers;
  return {
    verdict: r.verdict,
    significant: sig.significant && !(r.verdict === "Early win (valid sequential call)" || r.verdict === "Stop: it's hurting"),
    trendingNegative: r.verdict === "Keep running" && sig.negative,
    numbers: {
      controlRatePct: r4(cmp.control.rate * 100),
      treatmentRatePct: r4(cmp.treatment.rate * 100),
      absLiftPts: r4(cmp.absLift * 100),
      absLiftLowPts: r4(cmp.absLiftLow * 100),
      absLiftHighPts: r4(cmp.absLiftHigh * 100),
      relLiftPct: r4(cmp.relLift === null ? null : cmp.relLift * 100),
      pValue: r4(cmp.pValue),
      confidencePct: Math.round(setup.confidence * 100),
      alpha: r4(1 - setup.confidence),
      usersControl: totals.a.users,
      usersTreatment: totals.b.users,
      plannedPerVariant: setup.plannedPerVariant,
      shortfallUsers: early.status === "red" ? early.shortfall : null,
      mdePts: r4(mde * 100),
      targetLiftPts: r4(power.targetAbs === null ? null : power.targetAbs * 100),
      monthlyConversionsLow: k === null || !impact ? null : r4(cmp.absLiftLow * k),
      monthlyConversionsMid: k === null || !impact ? null : r4(cmp.absLift * k),
      monthlyConversionsHigh: k === null || !impact ? null : r4(cmp.absLiftHigh * k),
      monthlyValueLow: impact ? r4(impact.low) : null,
      monthlyValueMid: impact ? r4(impact.mid) : null,
      monthlyValueHigh: impact ? r4(impact.high) : null,
    },
    readout: sentences.join(" "),
  };
}
