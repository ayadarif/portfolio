import { describe, expect, it } from "vitest";
import { demos } from "./demos";
import { sampleSizePerVariant } from "./stats";
import { parseResults } from "./csv";
import { buildReadout, emptyForm, parseSetup, rowsToCsv, type FormState } from "./readout";

const formFor = (d: (typeof demos)[number]): FormState => ({
  ...emptyForm, shareA: String(d.plan.plannedShareA * 100), plannedN: String(d.plan.plannedPerVariant), confidence: "95",
  baseline: String(d.plan.baseline * 100), minLift: String(d.plan.targetRelLift * 100),
  monthlyUsers: String(d.plan.monthlyUsers), valuePerConversion: String(d.plan.valuePerConversion),
});

describe("demos through the whole pipeline (form -> CSV text -> readout)", () => {
  const run = (name: string) => {
    const d = demos.find((x) => x.name === name)!;
    const s = parseSetup(formFor(d));
    const p = parseResults(rowsToCsv(d.rows));
    if (!s.ok || !p.ok) throw new Error("setup or csv failed");
    return buildReadout(s.setup, p.rows);
  };
  it("clean_win: Ship it, all checks green, impact range above zero", () => {
    const r = run("clean_win");
    expect(r.verdict).toBe("Ship it");
    expect(r.srm.status).toBe("green");
    expect(r.early.status).toBe("green");
    expect(r.impact!.low).toBeGreaterThan(0);
  });
  it("broken_split: Fix the data first, SRM red", () => {
    const r = run("broken_split");
    expect(r.verdict).toBe("Fix the data first");
    expect(r.srm.status).toBe("red");
  });
  it("early_peek: Keep running; CI excluded zero early, but not at the end", () => {
    const r = run("early_peek");
    expect(r.verdict).toBe("Keep running");
    expect(r.early.status).toBe("red");
    expect(r.series.slice(0, 8).some((p) => p.absLiftLow > 0)).toBe(true);
    const last = r.series[r.series.length - 1];
    expect(last.absLiftLow).toBeLessThan(0);
  });
  it("no demo has a perfectly equal split", () => {
    for (const d of demos) {
      const r = run(d.name);
      expect(r.totals.a.users).not.toBe(r.totals.b.users);
    }
  });
});

describe("parseSetup", () => {
  it("needs a planned sample size", () => expect(parseSetup(emptyForm).ok).toBe(false));
  it("needs both impact fields or neither", () => {
    const r = parseSetup({ ...emptyForm, plannedN: "1000", monthlyUsers: "5000" });
    expect(r.ok).toBe(false);
  });
  it("converts percents to fractions", () => {
    const r = parseSetup({ ...emptyForm, plannedN: "1,000", confidence: "99", shareA: "60" });
    expect(r.ok && r.setup).toMatchObject({ plannedPerVariant: 1000, confidence: 0.99, shareA: 0.6 });
  });
});

describe("demo plans", () => {
  const expected = { clean_win: "Ship it", broken_split: "Fix the data first", early_peek: "Keep running" } as const;
  for (const d of demos) {
    it(`${d.name}: planned sample matches the formula and the verdict is ${expected[d.name]}`, () => {
      expect(d.plan.plannedPerVariant).toBe(sampleSizePerVariant(d.plan.baseline, d.plan.targetRelLift, "relative", d.plan.confidence, d.plan.power));
      const s = parseSetup(formFor(d));
      if (!s.ok) throw new Error(s.error);
      expect(buildReadout(s.setup, d.rows).verdict).toBe(expected[d.name]);
    });
  }
});
