// Glue between the form and stats.ts: turns what the user typed into numbers, then runs every stats function once.
// No new statistics live here; this only calls src/lib/stats.ts and arranges the answers for the page.
import {
  aggregate, businessImpact, calledTooEarly, compareVariants, cumulativeSeries, minDetectableEffect, sampleRatioMismatch,
  underpowered, verdict, type Comparison, type CumulativePoint, type Impact, type LiftMode, type ResultRow, type SrmResult,
  sequentialBand, type SequentialBand, type Status, type Totals, type Verdict,
} from "./stats";

// What the person typed. Everything is a string because that is what an input box holds.
export interface FormState {
  name: string;
  hypothesis: string;
  metric: string;
  shareA: string; // percent of users planned for control, e.g. "50"
  plannedN: string; // users per variant
  confidence: string; // percent: "90" | "95" | "99"
  baseline: string; // percent, optional
  minLift: string; // percent, optional
  liftMode: LiftMode;
  monthlyUsers: string; // optional
  valuePerConversion: string; // optional
}

export const emptyForm: FormState = {
  name: "", hypothesis: "", metric: "", shareA: "50", plannedN: "", confidence: "95",
  baseline: "", minLift: "", liftMode: "relative", monthlyUsers: "", valuePerConversion: "",
};

export interface Setup {
  name: string;
  hypothesis: string;
  metric: string;
  shareA: number; // 0..1
  plannedPerVariant: number;
  confidence: number; // 0..1
  baseline: number | null; // 0..1
  minLift: number | null; // 0..1 (relative) or rate points as a fraction (absolute)
  liftMode: LiftMode;
  monthlyUsers: number | null;
  valuePerConversion: number | null;
}

const num = (s: string): number => (s.trim() === "" ? NaN : Number(s.replace(/,/g, "")));

export function parseSetup(f: FormState): { ok: true; setup: Setup } | { ok: false; error: string } {
  const shareA = num(f.shareA);
  if (!(shareA > 0 && shareA < 100)) return { ok: false, error: "Planned split must be between 0 and 100 (percent of users in control)." };
  const plannedN = num(f.plannedN);
  if (!(plannedN >= 1) || !Number.isInteger(plannedN)) return { ok: false, error: "Enter the planned sample size per variant as a whole number, or use \"Calculate it for me\"." };
  const confidence = num(f.confidence);
  if (![90, 95, 99].includes(confidence)) return { ok: false, error: "Pick a confidence level of 90, 95 or 99." };
  const optional = (label: string, s: string, ok: (n: number) => boolean, hint: string): number | null | string => {
    if (s.trim() === "") return null;
    const n = num(s);
    return ok(n) ? n : `${label} ${hint}`;
  };
  const baseline = optional("Baseline rate", f.baseline, (n) => n > 0 && n < 100, "must be between 0 and 100 (percent).");
  const minLift = optional("Minimum lift", f.minLift, (n) => n > 0 && n < 100, "must be a positive percent below 100.");
  const monthly = optional("Monthly users", f.monthlyUsers, (n) => n > 0, "must be a positive number.");
  const value = optional("Value per conversion", f.valuePerConversion, (n) => n > 0, "must be a positive number.");
  for (const v of [baseline, minLift, monthly, value]) if (typeof v === "string") return { ok: false, error: v };
  if ((monthly === null) !== (value === null)) return { ok: false, error: "For business impact, fill in both monthly users and value per conversion, or leave both empty." };
  return {
    ok: true,
    setup: {
      name: f.name.trim(), hypothesis: f.hypothesis.trim(), metric: f.metric.trim(),
      shareA: shareA / 100, plannedPerVariant: plannedN, confidence: confidence / 100,
      baseline: baseline === null ? null : (baseline as number) / 100,
      minLift: minLift === null ? null : (minLift as number) / 100,
      liftMode: f.liftMode, monthlyUsers: monthly as number | null, valuePerConversion: value as number | null,
    },
  };
}

export interface Readout {
  totals: Totals;
  cmp: Comparison;
  srm: SrmResult;
  early: { status: Status; shortfall: number };
  power: { status: Status | "unset"; targetAbs: number | null };
  mde: number; // absolute, rate points as a fraction
  impact: Impact | null;
  series: CumulativePoint[];
  seq: SequentialBand;
  verdict: Verdict;
}

export function buildReadout(setup: Setup, rows: ResultRow[]): Readout {
  const totals = aggregate(rows);
  const { a, b } = totals;
  const cmp = compareVariants(a, b, setup.confidence);
  const srm = sampleRatioMismatch(a.users, b.users, setup.shareA);
  const early = calledTooEarly(a.users, b.users, setup.plannedPerVariant);
  const mde = minDetectableEffect(cmp.control.rate, a.users, b.users, setup.confidence);
  // The lift you cared about, in rate points. Relative lifts are applied to your stated baseline, else the observed control rate.
  const targetAbs = setup.minLift === null ? null : setup.liftMode === "absolute" ? setup.minLift : (setup.baseline ?? cmp.control.rate) * setup.minLift;
  const power = { status: targetAbs === null ? ("unset" as const) : underpowered(mde, targetAbs).status, targetAbs };
  const seq = sequentialBand(cmp, a.users, b.users, setup.plannedPerVariant);
  const impact =
    setup.monthlyUsers !== null && setup.valuePerConversion !== null
      ? businessImpact(cmp.absLift, cmp.absLiftLow, cmp.absLiftHigh, setup.monthlyUsers, setup.valuePerConversion)
      : null;
  return { totals, cmp, srm, early, power, mde, impact, series: cumulativeSeries(rows, setup.confidence, setup.plannedPerVariant), seq, verdict: verdict(srm, early, cmp, seq) };
}

export function rowsToCsv(rows: ResultRow[]): string {
  const dated = rows.some((r) => r.date);
  const head = dated ? "date,variant,users,conversions" : "variant,users,conversions";
  return [head, ...rows.map((r) => (dated ? `${r.date},` : "") + `${r.variant},${r.users},${r.conversions}`)].join("\n");
}
