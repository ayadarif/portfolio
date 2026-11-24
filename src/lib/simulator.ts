// A/A peeking simulator. Both arms have the SAME true rate, so every "winner" is a false alarm.
// For each simulated test it checks the results at every look and records whether the ordinary 95% interval, or the
// sequential band, ever excluded zero. scripts/check_simulator.py is a line-by-line Python port; both must give the same counts.
//
// Everything that could differ between languages is kept simple on purpose: a 32-bit integer PRNG, sums, products and square
// roots only for the random draws. Daily conversions use a normal approximation (sum of 12 uniforms), not an exact binomial,
// because that is reproducible to the last bit in both languages. At the sizes used here the approximation is very close.
import { sequentialHalfWidth } from "./stats";

export interface SimConfig {
  baseline: number; // true conversion rate in both arms, 0..1
  dailyPerArm: number; // users per arm per day
  days: number;
  checkEvery: number; // look every N days (and on the last day)
  tests: number;
  seed: number;
}

export const Z95 = 1.959963984540054;
export const DEFAULT_SEED = 20261124;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function binomialApprox(rnd: () => number, n: number, p: number): number {
  let z = -6;
  for (let i = 0; i < 12; i++) z += rnd();
  const x = n * p + Math.sqrt(n * p * (1 - p)) * z;
  return Math.min(n, Math.max(0, Math.floor(x + 0.5)));
}

export interface LookRow { day: number; naive: number; seq: number } // tests flagged at or before this look
export interface SimResult { tests: number; naiveAny: number; seqAny: number; looks: LookRow[]; planned: number }

export function lookDays(days: number, checkEvery: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= days; d++) if (d % checkEvery === 0 || d === days) out.push(d);
  return out;
}

// Runs tests [from, to). Each test uses its own stream (seed + test index), so chunks can run in any order and give the same totals.
export function simulateRange(cfg: SimConfig, from: number, to: number): SimResult {
  const days = lookDays(cfg.days, cfg.checkEvery);
  const planned = cfg.dailyPerArm * cfg.days;
  const flagN = new Array(days.length).fill(0);
  const flagS = new Array(days.length).fill(0);
  let naiveAny = 0, seqAny = 0;
  for (let t = from; t < to; t++) {
    const rnd = mulberry32((cfg.seed + t) >>> 0);
    let ca = 0, cb = 0, day = 0, hitN = false, hitS = false;
    days.forEach((d, i) => {
      for (; day < d; day++) {
        ca += binomialApprox(rnd, cfg.dailyPerArm, cfg.baseline);
        cb += binomialApprox(rnd, cfg.dailyPerArm, cfg.baseline);
      }
      const n = d * cfg.dailyPerArm;
      const ra = ca / n, rb = cb / n;
      const se = Math.sqrt((ra * (1 - ra)) / n + (rb * (1 - rb)) / n);
      const diff = rb - ra;
      if (se > 0) {
        if (Math.abs(diff) > Z95 * se) hitN = true;
        if (Math.abs(diff) > sequentialHalfWidth(se, 2 * n, 2 * planned, 0.05)) hitS = true;
      }
      if (hitN) flagN[i]++;
      if (hitS) flagS[i]++;
    });
    if (hitN) naiveAny++;
    if (hitS) seqAny++;
  }
  return { tests: to - from, naiveAny, seqAny, looks: days.map((day, i) => ({ day, naive: flagN[i], seq: flagS[i] })), planned };
}

export function merge(a: SimResult | null, b: SimResult): SimResult {
  if (!a) return b;
  return {
    tests: a.tests + b.tests, naiveAny: a.naiveAny + b.naiveAny, seqAny: a.seqAny + b.seqAny, planned: a.planned,
    looks: a.looks.map((l, i) => ({ day: l.day, naive: l.naive + b.looks[i].naive, seq: l.seq + b.looks[i].seq })),
  };
}

export function simulate(cfg: SimConfig): SimResult {
  return simulateRange(cfg, 0, cfg.tests);
}
