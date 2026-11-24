// Three one-click demo experiments. Data is generated with a fixed seed, so it is the same every time
// (tests and the scipy check rely on that) but still has realistic noise: no demo has a perfectly equal split.
// scripts/write_fixtures.ts writes these to scripts/fixtures/datasets.json so vitest and check_stats.py share one source.
import type { ResultRow } from "./stats";

// Small seeded random number generator (mulberry32): same seed in, same numbers out.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Conversions for one day: expected value plus bell-curve noise of the size real binomial data has.
function convert(rand: () => number, users: number, rate: number): number {
  const u1 = Math.max(rand(), 1e-12);
  const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rand());
  const sd = Math.sqrt(users * rate * (1 - rate));
  return Math.min(users, Math.max(0, Math.round(users * rate + gauss * sd)));
}

function addDays(start: string, n: number): string {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

interface Spec {
  seed: number;
  days: number;
  usersA: number; // average daily users, control
  usersB: number; // average daily users, treatment
  baseline: number;
  relLift: (day: number) => number; // true relative lift on day 1..days
}

function build(s: Spec): ResultRow[] {
  const rand = rng(s.seed);
  const rows: ResultRow[] = [];
  for (let day = 1; day <= s.days; day++) {
    const date = addDays("2026-10-01", day - 1);
    // +/- 3% noise on each arm's daily users.
    const uA = Math.round(s.usersA * (1 + (rand() - 0.5) * 0.06));
    const uB = Math.round(s.usersB * (1 + (rand() - 0.5) * 0.06));
    rows.push({ date, variant: "control", users: uA, conversions: convert(rand, uA, s.baseline) });
    rows.push({ date, variant: "treatment", users: uB, conversions: convert(rand, uB, s.baseline * (1 + s.relLift(day))) });
  }
  return rows;
}

// Clean win: kept exactly as first written, because the scipy-checked test numbers are tied to it.
// Each line is one day from 2026-10-01: control users, control conversions, treatment users, treatment conversions.
const CLEAN_WIN_DAYS = [
  [1000, 100, 1010, 113],
  [1010, 98, 1020, 110],
  [1020, 104, 1000, 118],
  [1000, 101, 1010, 111],
  [1010, 97, 1020, 107],
  [1020, 103, 1000, 116],
  [1000, 99, 1010, 112],
  [1010, 102, 1020, 115],
  [1020, 100, 1000, 111],
  [1000, 96, 1010, 108],
  [1010, 105, 1020, 119],
  [1020, 101, 1000, 113],
  [1000, 98, 1010, 109],
  [1010, 103, 1020, 117],
];

function fromDays(days: number[][]): ResultRow[] {
  return days.flatMap(([ua, ca, ub, cb], i) => {
    const date = addDays("2026-10-01", i);
    return [
      { date, variant: "control", users: ua, conversions: ca },
      { date, variant: "treatment", users: ub, conversions: cb },
    ];
  });
}

export interface DemoPlan {
  plannedShareA: number;
  confidence: number;
  power: number;
  monthlyUsers: number;
  valuePerConversion: number;
  baseline: number;
  targetRelLift: number;
  plannedPerVariant: number;
}

export interface Demo {
  name: "clean_win" | "broken_split" | "early_peek";
  label: string;
  blurb: string;
  title: string;
  hypothesis: string;
  metric: string;
  plan: DemoPlan;
  rows: ResultRow[];
}

const basePlan = { plannedShareA: 0.5, confidence: 0.95, power: 0.8, monthlyUsers: 200000, valuePerConversion: 500, baseline: 0.1 };

// plannedPerVariant must equal sampleSizePerVariant(baseline, targetRelLift) for the same plan.
// It is written out here (not computed) so scripts/write_fixtures.ts can run under plain Node; src/lib/readout.test.ts fails if it drifts.
const planFor = (targetRelLift: number, plannedPerVariant: number): DemoPlan => ({ ...basePlan, targetRelLift, plannedPerVariant });

export const demos: Demo[] = [
  {
    name: "clean_win",
    label: "Clean win",
    blurb: "Healthy split, full sample, real lift.",
    title: "Simplified checkout button",
    hypothesis: "A single-step checkout button will raise the share of visitors who complete a purchase.",
    metric: "Checkout conversion rate",
    plan: planFor(0.11, 12242), // needs 12,242 per variant; the data has about 14,100, so the sample is reached
    rows: fromDays(CLEAN_WIN_DAYS),
  },
  {
    name: "broken_split",
    label: "Broken split",
    blurb: "Planned 50/50, but one arm got about 10% fewer users.",
    title: "New pricing page layout",
    hypothesis: "A clearer pricing layout will lift sign-ups from the pricing page.",
    metric: "Sign-up conversion rate",
    plan: planFor(0.13, 8838), // needs 8,838 per variant; the smaller arm has 8,979, so the split is the only thing that fails
    rows: build({ seed: 22, days: 10, usersA: 1000, usersB: 900, baseline: 0.1, relLift: () => 0.05 }),
  },
  {
    name: "early_peek",
    label: "Early peek",
    blurb: "Looked great on day 3. The lift faded as data came in. Caught because the planned sample wasn't reached.",
    title: "Referral banner on the home screen",
    hypothesis: "A referral banner will raise the share of users who start a referral.",
    metric: "Referral start rate",
    plan: planFor(0.06, 40286), // needs 40,286 per variant; only about 28,100 arrived, so the plan says keep running
    // Novelty effect: the lift jumps to about +40% on day 3, then decays to about zero by week two.
    rows: build({
      seed: 33,
      days: 28,
      usersA: 1000,
      usersB: 1000,
      baseline: 0.1,
      relLift: (d) => (d < 3 ? 0.13 * d : 0.4 * Math.exp(-(d - 3) / 2)),
    }),
  },
];

export const demoByName = (n: Demo["name"]) => demos.find((d) => d.name === n)!;
