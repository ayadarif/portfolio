import { describe, expect, it } from "vitest";
import datasets from "../../scripts/fixtures/datasets.json";
import {
  aggregate, businessImpact, calledTooEarly, chiSquareP1, compareVariants, conversionRate, cumulativeSeries,
  minDetectableEffect, normalCdf, normalInv, sampleRatioMismatch, sampleSizePerVariant, underpowered, verdict,
  zCritical, type ResultRow,
} from "./stats";

// Expected values come from scripts/check_stats.py (scipy), not from this module. See HANDOFF.md.
const byName = (n: string) => datasets.find((d) => d.name === n)!;
const rows = (n: string) => byName(n).rows as ResultRow[];

describe("normal and chi-square building blocks (textbook values)", () => {
  it("z critical for 95% is 1.959964", () => expect(zCritical(0.95)).toBeCloseTo(1.959964, 6));
  it("z critical for 99% is 2.575829", () => expect(zCritical(0.99)).toBeCloseTo(2.575829, 6));
  it("normalCdf(1.96) = 0.9750021", () => expect(normalCdf(1.96)).toBeCloseTo(0.9750021, 7));
  it("normalCdf is accurate in the far tail (z=-5 -> 2.866516e-7)", () => expect(normalCdf(-5) / 2.866516e-7).toBeCloseTo(1, 5));
  it("normalInv round-trips", () => { for (const p of [0.001, 0.2, 0.5, 0.8, 0.975, 0.9999]) expect(normalCdf(normalInv(p))).toBeCloseTo(p, 12); });
  it("chi-square(1) of 3.841459 gives p = 0.05", () => expect(chiSquareP1(3.841459)).toBeCloseTo(0.05, 6));
  it("chi-square(1) of 10.827566 gives p = 0.001", () => expect(chiSquareP1(10.827566)).toBeCloseTo(0.001, 6));
});

describe("conversion rate", () => {
  it("Wilson CI for 100/1000 at 95% = [0.083, 0.120]", () => {
    const r = conversionRate(1000, 100);
    expect(r.rate).toBe(0.1);
    expect(r.ciLow).toBeCloseTo(0.0828, 3);
    expect(r.ciHigh).toBeCloseTo(0.1202, 3);
  });
  it("rejects conversions above users", () => expect(() => conversionRate(10, 11)).toThrow());
});

describe("compareVariants vs scipy (clean_win, 1407/14130 vs 1579/14150)", () => {
  const c = compareVariants({ users: 14130, conversions: 1407 }, { users: 14150, conversions: 1579 });
  it("rates and Wilson CI", () => {
    expect(c.control.rate).toBeCloseTo(0.099575, 6);
    expect(c.treatment.rate).toBeCloseTo(0.11159, 6);
    expect(c.control.ciLow).toBeCloseTo(0.094747, 6);
    expect(c.treatment.ciHigh).toBeCloseTo(0.116884, 6);
  });
  it("lift and CI on the difference", () => {
    expect(c.absLift).toBeCloseTo(0.012015, 6);
    expect(c.absLiftLow).toBeCloseTo(0.004853, 6);
    expect(c.absLiftHigh).toBeCloseTo(0.019176, 6);
    expect(c.relLift).toBeCloseTo(0.12066, 5);
  });
  it("z and p-value", () => {
    expect(c.zScore).toBeCloseTo(3.287377, 5);
    expect(c.pValue).toBeCloseTo(0.001011, 6);
  });
  it("identical arms give p = 1 and zero lift", () => {
    const same = compareVariants({ users: 1000, conversions: 100 }, { users: 1000, conversions: 100 });
    expect(same.absLift).toBe(0);
    expect(same.pValue).toBeCloseTo(1, 12);
  });
  it("zero conversions everywhere does not divide by zero", () => {
    const z = compareVariants({ users: 100, conversions: 0 }, { users: 100, conversions: 0 });
    expect(z.pValue).toBe(1);
    expect(z.relLift).toBeNull();
  });
});

describe("sample ratio mismatch (scipy chisquare)", () => {
  it("14130 vs 14150 is fine", () => {
    const s = sampleRatioMismatch(14130, 14150);
    expect(s.chiSquare).toBeCloseTo(0.014144, 6);
    expect(s.pValue).toBeCloseTo(0.905331, 6);
    expect(s.status).toBe("green");
  });
  it("10000 vs 9000 is red", () => {
    const s = sampleRatioMismatch(10000, 9000);
    expect(s.chiSquare).toBeCloseTo(52.631579, 5);
    expect(s.pValue).toBeLessThan(1e-12);
    expect(s.status).toBe("red");
  });
  it("respects an uneven planned split", () => expect(sampleRatioMismatch(9000, 1000, 0.9).status).toBe("green"));
});

describe("planning maths", () => {
  it("sample size: 10% baseline, +10% relative, 95%/80% = 14751 per variant (scipy)", () => expect(sampleSizePerVariant(0.1, 0.1, "relative")).toBe(14751));
  it("absolute and relative modes agree when they describe the same lift", () => expect(sampleSizePerVariant(0.1, 0.01, "absolute")).toBe(14751));
  it("smaller lifts need far more users", () => expect(sampleSizePerVariant(0.1, 0.05, "relative")).toBeGreaterThan(3 * 14751));
  it("MDE at the clean_win sample = 0.009977 (scipy closed form)", () => expect(minDetectableEffect(1407 / 14130, 14130, 14150)).toBeCloseTo(0.009977, 6));
  it("MDE is within 5% of the exact-power solve (0.010199)", () => expect(Math.abs(minDetectableEffect(1407 / 14130, 14130, 14150) / 0.010199 - 1)).toBeLessThan(0.05));
});

describe("checks and impact", () => {
  it("called too early: red below plan, green at plan", () => {
    expect(calledTooEarly(5000, 5000, 15000)).toEqual({ status: "red", shortfall: 10000 });
    expect(calledTooEarly(15000, 15001, 15000).status).toBe("green");
  });
  it("one short arm is enough for red", () => expect(calledTooEarly(20000, 14999, 15000).status).toBe("red"));
  it("underpowered: amber only when MDE exceeds target", () => {
    expect(underpowered(0.012, 0.01).status).toBe("amber");
    expect(underpowered(0.009, 0.01).status).toBe("green");
  });
  it("business impact range matches scipy script (200k users, 500/conv)", () => {
    const c = compareVariants({ users: 14130, conversions: 1407 }, { users: 14150, conversions: 1579 });
    const i = businessImpact(c.absLift, c.absLiftLow, c.absLiftHigh, 200000, 500);
    expect(i.low).toBeCloseTo(485306.4, 0);
    expect(i.mid).toBeCloseTo(1201473.4, 0);
    expect(i.high).toBeCloseTo(1917640.5, 0);
  });
});

describe("aggregation and cumulative series", () => {
  it("sums daily rows per variant", () => {
    const t = aggregate(rows("clean_win"));
    expect(t.controlName).toBe("control");
    expect(t.a).toEqual({ users: 14130, conversions: 1407 });
    expect(t.b).toEqual({ users: 14150, conversions: 1579 });
  });
  it("accepts one row per variant with no dates", () => {
    const t = aggregate([{ variant: "B", users: 100, conversions: 10 }, { variant: "A", users: 100, conversions: 12 }]);
    expect(t.controlName).toBe("A");
  });
  it("rejects three variants", () => expect(() => aggregate(["a", "b", "c"].map((v) => ({ variant: v, users: 1, conversions: 0 })))).toThrow());
  it("cumulative series ends on the full-sample comparison and the CI narrows", () => {
    const s = cumulativeSeries(rows("clean_win"));
    expect(s).toHaveLength(14);
    expect(s[13].absLift).toBeCloseTo(0.012015, 6);
    expect(s[13].absLiftHigh - s[13].absLiftLow).toBeLessThan(s[0].absLiftHigh - s[0].absLiftLow);
  });
  it("no dates, no series", () => expect(cumulativeSeries([{ variant: "A", users: 1, conversions: 0 }, { variant: "B", users: 1, conversions: 0 }])).toEqual([]));
});

describe("verdict on the three demo datasets", () => {
  const run = (name: string) => {
    const ds = byName(name);
    const t = aggregate(ds.rows as ResultRow[]);
    return verdict(
      sampleRatioMismatch(t.a.users, t.b.users, ds.plan.plannedShareA),
      calledTooEarly(t.a.users, t.b.users, ds.plan.plannedPerVariant),
      compareVariants(t.a, t.b, ds.plan.confidence),
    );
  };
  it("clean_win -> Ship it", () => expect(run("clean_win")).toBe("Ship it"));
  it("broken_split -> Fix the data first", () => expect(run("broken_split")).toBe("Fix the data first"));
  it("early_peek -> Keep running (even though p < 0.05)", () => expect(run("early_peek")).toBe("Keep running"));

  const ok = sampleRatioMismatch(1000, 1000);
  const done = { status: "green" as const };
  it("a significant loss after the full sample -> Don't ship: it hurt", () =>
    expect(verdict(ok, done, compareVariants({ users: 20000, conversions: 2000 }, { users: 20000, conversions: 1800 }))).toBe("Don't ship: it hurt"));
  it("a flat result after the full sample -> No clear winner", () =>
    expect(verdict(ok, done, compareVariants({ users: 20000, conversions: 2000 }, { users: 20000, conversions: 2010 }))).toBe("No clear winner"));
});
