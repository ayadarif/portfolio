// Experiment Readout: statistics module. Pure functions, no dependencies, no UI.
// Conventions: rates and lifts are fractions (0.05 = 5%). "A" is control, "B" is treatment.
// Lift is B minus A. Confidence is a fraction (0.95). All tests are two-sided.

// ---------- Normal distribution and chi-square building blocks ----------

// Complementary error function erfc(x) for x >= 0: the tail area behind the normal curve.
// Two methods stitched together: a stable power series for small x, a continued fraction for large x.
export function erfc(x: number): number {
  if (x < 0) return 2 - erfc(-x);
  if (x === 0) return 1;
  if (x < 2.5) {
    // erf(x) = 2/sqrt(pi) * exp(-x^2) * sum of 2^n x^(2n+1) / (1*3*5*...*(2n+1)); all terms positive, so no cancellation.
    let term = x;
    let sum = x;
    for (let n = 1; n < 200; n++) {
      term *= (2 * x * x) / (2 * n + 1);
      sum += term;
      if (term < 1e-17 * sum) break;
    }
    return 1 - (2 / Math.sqrt(Math.PI)) * Math.exp(-x * x) * sum;
  }
  // erfc(x) = exp(-x^2)/sqrt(pi) / (x + (1/2)/(x + 1/(x + (3/2)/(x + ...)))); evaluated from the inside out.
  let t = x;
  for (let k = 80; k >= 1; k--) t = x + k / 2 / t;
  return Math.exp(-x * x) / Math.sqrt(Math.PI) / t;
}

// Normal CDF: the probability a standard normal draw is below z.
export function normalCdf(z: number): number {
  return 0.5 * erfc(-z / Math.SQRT2);
}

// Inverse normal CDF: the z score with probability p below it (e.g. 0.975 -> 1.96).
// Starts from a rational approximation (Acklam, ~1e-9 accurate), then one Halley step polishes it to machine precision.
export function normalInv(p: number): number {
  if (!(p > 0 && p < 1)) throw new RangeError("normalInv needs 0 < p < 1");
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  let x: number;
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p > 1 - plow) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  // One Halley refinement: nudge x so normalCdf(x) hits p exactly.
  const e = normalCdf(x) - p;
  const u = (e * Math.sqrt(2 * Math.PI)) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

// Two-sided critical z for a confidence level (0.95 -> 1.959964).
export function zCritical(confidence: number): number {
  return normalInv(1 - (1 - confidence) / 2);
}

// p-value of a chi-square statistic with 1 degree of freedom (a two-group split check has exactly 1).
// A chi-square(1) variable is a squared standard normal, so its tail is erfc(sqrt(x/2)).
export function chiSquareP1(x: number): number {
  return erfc(Math.sqrt(Math.max(x, 0) / 2));
}

// ---------- Per-variant conversion rate ----------

export interface RateResult {
  users: number;
  conversions: number;
  rate: number;
  ciLow: number;
  ciHigh: number;
}

// Conversion rate with a Wilson interval: more honest than rate +/- 1.96 se when rates are small or samples are short.
export function conversionRate(users: number, conversions: number, confidence = 0.95): RateResult {
  if (users <= 0) throw new RangeError("users must be positive");
  if (conversions < 0 || conversions > users) throw new RangeError("conversions must be between 0 and users");
  const z = zCritical(confidence);
  const p = conversions / users;
  const z2n = (z * z) / users;
  const centre = (p + z2n / 2) / (1 + z2n);
  const half = (z * Math.sqrt((p * (1 - p)) / users + (z * z) / (4 * users * users))) / (1 + z2n);
  return { users, conversions, rate: p, ciLow: Math.max(0, centre - half), ciHigh: Math.min(1, centre + half) };
}

// ---------- Comparing two variants ----------

export interface Arm {
  users: number;
  conversions: number;
}

export interface Comparison {
  control: RateResult;
  treatment: RateResult;
  absLift: number; // B minus A, in rate points
  absLiftLow: number;
  absLiftHigh: number;
  relLift: number | null; // absLift / A rate; null when A converts at 0
  relLiftLow: number | null;
  relLiftHigh: number | null;
  se: number; // unpooled standard error of the lift (rate points as a fraction); the sequential interval reuses it
  zScore: number;
  pValue: number;
  confidence: number;
}

// Compares B against A: lift, CI on the lift, and the two-proportion z-test p-value.
// Known quirk: the CI uses separate variances (unpooled) and the p-value uses a pooled variance (the textbook test),
// so right at the 5% edge the CI can just touch zero while p is a hair under 0.05, or the reverse.
export function compareVariants(a: Arm, b: Arm, confidence = 0.95): Comparison {
  const control = conversionRate(a.users, a.conversions, confidence);
  const treatment = conversionRate(b.users, b.conversions, confidence);
  const z = zCritical(confidence);
  const diff = treatment.rate - control.rate;

  // Standard error of the difference if the two rates are allowed to differ: sqrt of the sum of each rate's variance.
  const seUnpooled = Math.sqrt((control.rate * (1 - control.rate)) / a.users + (treatment.rate * (1 - treatment.rate)) / b.users);
  // Standard error if "no difference" is true (the null): both arms share one pooled rate.
  const pooled = (a.conversions + b.conversions) / (a.users + b.users);
  const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / a.users + 1 / b.users));

  // z = how many standard errors the observed gap is from zero; p = chance of a gap this big if nothing is going on.
  const zScore = sePooled === 0 ? 0 : diff / sePooled;
  const pValue = sePooled === 0 ? 1 : erfc(Math.abs(zScore) / Math.SQRT2);

  const absLow = diff - z * seUnpooled;
  const absHigh = diff + z * seUnpooled;
  // Relative lift = absolute lift divided by the control rate (CI scales the same way; ignores uncertainty in A's rate).
  const hasBase = control.rate > 0;
  return {
    control,
    treatment,
    absLift: diff,
    absLiftLow: absLow,
    absLiftHigh: absHigh,
    relLift: hasBase ? diff / control.rate : null,
    relLiftLow: hasBase ? absLow / control.rate : null,
    relLiftHigh: hasBase ? absHigh / control.rate : null,
    se: seUnpooled,
    zScore,
    pValue,
    confidence,
  };
}

// ---------- Planning: sample size and MDE ----------

export type LiftMode = "absolute" | "relative";

// Users needed in EACH variant to detect a lift of `minLift` at the given confidence and power.
// Formula: n = (z_alpha*sqrt(2*pbar*(1-pbar)) + z_beta*sqrt(p1(1-p1)+p2(1-p2)))^2 / (p2-p1)^2
// i.e. the gap must be big enough to clear both the "false alarm" bar and the "miss a real effect" bar.
export function sampleSizePerVariant(baseline: number, minLift: number, mode: LiftMode = "relative", confidence = 0.95, power = 0.8): number {
  if (!(baseline > 0 && baseline < 1)) throw new RangeError("baseline must be between 0 and 1");
  if (!(minLift > 0)) throw new RangeError("minLift must be positive");
  const p1 = baseline;
  const p2 = mode === "relative" ? baseline * (1 + minLift) : baseline + minLift;
  if (p2 >= 1) throw new RangeError("baseline plus lift must stay below 100%");
  const zA = zCritical(confidence);
  const zB = normalInv(power);
  const pbar = (p1 + p2) / 2;
  const top = zA * Math.sqrt(2 * pbar * (1 - pbar)) + zB * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.ceil((top * top) / ((p2 - p1) * (p2 - p1)));
}

// Minimum detectable effect (absolute, in rate points) for the sample you actually have.
// Formula: MDE = (z_alpha + z_beta) * sqrt(p(1-p) * (1/n1 + 1/n2)), using the control rate for the variance.
// Reads as: the smallest real lift this test would catch `power` of the time. Slightly approximate; see check_stats.py.
export function minDetectableEffect(baseline: number, n1: number, n2: number, confidence = 0.95, power = 0.8): number {
  if (n1 <= 0 || n2 <= 0) throw new RangeError("sample sizes must be positive");
  const zA = zCritical(confidence);
  const zB = normalInv(power);
  return (zA + zB) * Math.sqrt(baseline * (1 - baseline) * (1 / n1 + 1 / n2));
}

// ---------- Checks ----------

export type Status = "green" | "amber" | "red";

export interface SrmResult {
  status: Status;
  chiSquare: number;
  pValue: number;
  expectedA: number;
  expectedB: number;
  observedShareA: number;
}

// Sample ratio mismatch: did users land in the arms in the planned proportions?
// Formula: chi-square = sum((observed - expected)^2 / expected). A tiny p (< 0.001) means the split itself is broken,
// so every number built on it is suspect. Needs a strict threshold because it should almost never fire by chance.
export function sampleRatioMismatch(usersA: number, usersB: number, plannedShareA = 0.5): SrmResult {
  const total = usersA + usersB;
  const expectedA = total * plannedShareA;
  const expectedB = total * (1 - plannedShareA);
  const chi = (usersA - expectedA) ** 2 / expectedA + (usersB - expectedB) ** 2 / expectedB;
  const pValue = chiSquareP1(chi);
  return { status: pValue < 0.001 ? "red" : "green", chiSquare: chi, pValue, expectedA, expectedB, observedShareA: usersA / total };
}

// Called too early: red if either arm has fewer users than the sample size planned up front.
// Why: stopping when the number "looks good" inflates false positives; the plan is the stopping rule.
export function calledTooEarly(usersA: number, usersB: number, plannedPerVariant: number): { status: Status; shortfall: number } {
  const smallest = Math.min(usersA, usersB);
  return { status: smallest < plannedPerVariant ? "red" : "green", shortfall: Math.max(0, plannedPerVariant - smallest) };
}

// Underpowered: amber if the smallest lift this sample could detect is bigger than the lift you cared about.
// Both inputs are absolute rate points. Why: a "no difference" result means little if the test could not see your target lift.
export function underpowered(achievedMde: number, targetAbsLift: number): { status: Status } {
  return { status: achievedMde > targetAbsLift ? "amber" : "green" };
}

// ---------- Business impact ----------

export interface Impact {
  low: number;
  mid: number;
  high: number;
}

// Monthly value of rolling the change out to all monthly users: users * lift * value per conversion.
// Applies the same to the CI ends, so you get a low / likely / high range rather than one invented number.
export function businessImpact(absLift: number, absLiftLow: number, absLiftHigh: number, monthlyUsers: number, valuePerConversion: number): Impact {
  const k = monthlyUsers * valuePerConversion;
  return { low: absLiftLow * k, mid: absLift * k, high: absLiftHigh * k };
}

// ---------- Data handling ----------

export interface ResultRow {
  date?: string;
  variant: string;
  users: number;
  conversions: number;
}

export interface Totals {
  controlName: string;
  treatmentName: string;
  a: Arm;
  b: Arm;
}

// Picks which variant is control: a name matching "control"/"a"/"baseline" if present, otherwise the first one seen.
function pickControl(names: string[]): string {
  const hit = names.find((n) => ["control", "a", "baseline"].includes(n.trim().toLowerCase()));
  return hit ?? names[0];
}

// Sums rows (daily or one-per-variant) into totals per variant. Exactly two variants allowed.
export function aggregate(rows: ResultRow[]): Totals {
  const sums = new Map<string, Arm>();
  for (const r of rows) {
    if (!(r.users >= 0) || !(r.conversions >= 0) || r.conversions > r.users) throw new RangeError(`Bad row for "${r.variant}": conversions cannot exceed users`);
    const cur = sums.get(r.variant) ?? { users: 0, conversions: 0 };
    sums.set(r.variant, { users: cur.users + r.users, conversions: cur.conversions + r.conversions });
  }
  const names = [...sums.keys()];
  if (names.length !== 2) throw new RangeError(`Need exactly 2 variants, found ${names.length}`);
  const controlName = pickControl(names);
  const treatmentName = names.find((n) => n !== controlName)!;
  return { controlName, treatmentName, a: sums.get(controlName)!, b: sums.get(treatmentName)! };
}

// ---------- Sequential (anytime-valid) interval ----------

// A confidence sequence is a band you may look at every day without inflating the false-alarm rate.
// Formula as documented by GrowthBook (normal-mixture confidence sequence):
//   half-width = se * sqrt( 2 (N rho^2 + 1) / (N rho^2) * ln( sqrt(N rho^2 + 1) / alpha ) )
//   rho^2      = ( -2 ln(alpha) + ln( -2 ln(alpha) + 1 ) ) / N*
// N = users in both arms so far; N* = the total sample at which you plan to decide (the band is tightest there).
// se is the unpooled standard error of the lift, the same one the ordinary interval uses.
export function sequentialHalfWidth(se: number, nTotal: number, nStar: number, alpha: number): number {
  const a = -2 * Math.log(alpha);
  const rho2 = (a + Math.log(a + 1)) / nStar;
  const nr = nTotal * rho2;
  return se * Math.sqrt(((2 * (nr + 1)) / nr) * Math.log(Math.sqrt(nr + 1) / alpha));
}

// N* = twice the planned per-arm sample, i.e. the total users across both arms when the plan says to decide.
export function plannedTotal(plannedPerVariant: number): number {
  return 2 * plannedPerVariant;
}

export interface SequentialBand { low: number; high: number }

export function sequentialBand(cmp: Comparison, usersA: number, usersB: number, plannedPerVariant: number): SequentialBand {
  const h = sequentialHalfWidth(cmp.se, usersA + usersB, plannedTotal(plannedPerVariant), 1 - cmp.confidence);
  return { low: cmp.absLift - h, high: cmp.absLift + h };
}

// ---------- Cumulative series ----------

export interface CumulativePoint {
  date: string;
  usersA: number;
  usersB: number;
  absLift: number;
  absLiftLow: number;
  absLiftHigh: number;
  seqLow?: number; // sequential band, present when a planned sample was given
  seqHigh?: number;
}

// Cumulative lift by day: re-runs the comparison on all data up to each date, so you can see the CI band narrow (or the lift drift).
// Days before both arms have users and some conversions are skipped, since the maths is meaningless there.
export function cumulativeSeries(rows: ResultRow[], confidence = 0.95, plannedPerVariant?: number): CumulativePoint[] {
  const dated = rows.filter((r) => r.date);
  if (dated.length === 0) return [];
  const { controlName } = aggregate(rows);
  const dates = [...new Set(dated.map((r) => r.date as string))].sort();
  const out: CumulativePoint[] = [];
  const a: Arm = { users: 0, conversions: 0 };
  const b: Arm = { users: 0, conversions: 0 };
  for (const d of dates) {
    for (const r of dated.filter((x) => x.date === d)) {
      const arm = r.variant === controlName ? a : b;
      arm.users += r.users;
      arm.conversions += r.conversions;
    }
    if (a.users > 0 && b.users > 0 && a.conversions + b.conversions > 0) {
      const c = compareVariants(a, b, confidence);
      const band = plannedPerVariant ? sequentialBand(c, a.users, b.users, plannedPerVariant) : null;
      out.push({ date: d, usersA: a.users, usersB: b.users, absLift: c.absLift, absLiftLow: c.absLiftLow, absLiftHigh: c.absLiftHigh,
        ...(band ? { seqLow: band.low, seqHigh: band.high } : {}) });
    }
  }
  return out;
}

// ---------- Verdict ----------

export type Verdict = "Fix the data first" | "Keep running" | "Early win (valid sequential call)" | "Stop: it's hurting" | "Ship it" | "Don't ship: it hurt" | "No clear winner";

// Exactly one verdict; the first rule that matches wins, and the order is the logic:
// 1. broken split -> nothing else can be trusted; 2. below planned sample -> the plan says keep going (even a scary
// early loss, because peeking inflates false alarms); 3/4. a real win or loss needs BOTH p below alpha and a CI that
// excludes zero; 5. everything else is no clear winner.
// Below the planned sample (rule 2) the verdict can still be an early call, but only if the sequential band excludes zero.
export function verdict(srm: SrmResult, early: { status: Status }, cmp: Comparison, seq?: SequentialBand): Verdict {
  if (srm.status === "red") return "Fix the data first";
  if (early.status === "red") {
    // Below the planned sample the ordinary p-value is not allowed to decide. The sequential band is: it stays valid under daily peeking.
    if (seq && seq.low > 0) return "Early win (valid sequential call)";
    if (seq && seq.high < 0) return "Stop: it's hurting";
    return "Keep running";
  }
  const alpha = 1 - cmp.confidence;
  const significant = cmp.pValue < alpha;
  if (significant && cmp.absLiftLow > 0) return "Ship it";
  if (significant && cmp.absLiftHigh < 0) return "Don't ship: it hurt";
  return "No clear winner";
}
