import { describe, expect, it } from "vitest";
import type { RewritePayload } from "./narrative";
import { extractNumbers, validateRewrite } from "./validate-rewrite";

const base = (over: Partial<RewritePayload>): RewritePayload => ({
  verdict: "No clear winner", significant: false, trendingNegative: false,
  numbers: { controlRatePct: 10, treatmentRatePct: 10.1, absLiftPts: 0.1, absLiftLowPts: -0.8, absLiftHighPts: 1.0, pValue: 0.82, confidencePct: 95, usersControl: 5000, usersTreatment: 5000, monthlyConversionsMid: 200 },
  readout: "The new version converted at 10.10% against 10.00% for the original, based on 5,000 and 5,000 users. The range is -0.80 to +1.00 percentage points.",
  ...over,
});
const ok = (t: string, p: RewritePayload) => validateRewrite(t, p).ok;
const reasons = (t: string, p: RewritePayload) => { const v = validateRewrite(t, p); return v.ok ? [] : v.reasons; };

describe("number extraction", () => {
  it("handles commas, decimals, suffixes and words", () => {
    expect(extractNumbers("1,200 users, 4.8% and 2.5k, 1.2 million").map((n) => n.mantissa * n.scale)).toEqual([1200, 4.8, 2500, 1_200_000]);
  });
  it("does not treat the m in 'months' as millions", () => expect(extractNumbers("over 3 months")[0].scale).toBe(1));
});

describe("validateRewrite: good outputs", () => {
  const p = base({});
  it("accepts a faithful rewrite with rounding", () =>
    expect(ok("The new version converted about 10.1% of users, against 10% for the original, across 5,000 users in each group. The true lift could be anywhere from -0.8 to 1 percentage points, so the data cannot separate a real effect from chance. Treat this as no evidence for shipping.", p)).toBe(true));
  it("accepts 'do not ship' under No clear winner", () =>
    expect(ok("Rates are 10.1% against 10%, and the 95% range for the lift includes zero, so there is no clear difference. Do not ship on this evidence alone; decide on other grounds.", p)).toBe(true));
  it("accepts significance when the stats support it", () => {
    const s = base({ verdict: "Ship it", significant: true });
    expect(ok("The new version converted at 10.1% against 10% and the gain is statistically significant at 95% confidence. Roll it out and keep an eye on the metric afterwards.", s)).toBe(true);
  });
});

describe("validateRewrite: bad outputs", () => {
  const p = base({});
  it("rejects claimed significance when the stats do not support it", () =>
    expect(reasons("The new version converted at 10.1% against 10%, a significant improvement that you should act on soon.", p).join()).toContain("significance"));
  it("rejects 'not significant' too, to follow the no-word rule strictly", () =>
    expect(ok("The new version converted at 10.1% against 10%, which is not statistically significant, so treat it as noise for now.", p)).toBe(false));
  it("rejects an invented number", () =>
    expect(reasons("The new version converted at 10.1% against 10%, and this would add about 750 conversions a month, which is hard to ignore.", p).join()).toContain("number not in the input"));
  it("rejects a recommendation to ship when the verdict is No clear winner", () =>
    expect(reasons("The new version converted at 10.1% against 10%, so go ahead and ship it to everyone this week.", p).join()).toContain("recommends shipping"));
  it("rejects 'do not ship' when the verdict is Ship it", () => {
    const s = base({ verdict: "Ship it", significant: true });
    expect(reasons("The new version converted at 10.1% against 10%, a significant gain, but you should not ship it yet because of risk.", s).join()).toContain("says do not ship");
  });
  it("rejects 'keep running' when the verdict is Ship it", () => {
    const s = base({ verdict: "Ship it", significant: true });
    expect(ok("The new version converted at 10.1% against 10%, a significant gain, but please keep running the test for a while longer.", s)).toBe(false);
  });
  it("rejects turning 'Keep running' into a conclusion", () => {
    const k = base({ verdict: "Keep running" });
    expect(ok("The new version converted at 10.1% against 10%, so this is a clear win and the test is complete. Ship it now.", k)).toBe(false);
  });
  it("rejects dropping the trending-negative warning", () => {
    const k = base({ verdict: "Keep running", trendingNegative: true });
    expect(reasons("So far the new version converted at 10.1% against 10%. Keep the test running until the full sample arrives and then read it again.", k).join()).toContain("trending-negative");
  });
  it("rejects overclaiming and empty text", () => {
    expect(ok("This proves the new version is better than the original at 10.1% against 10%, definitely.", p)).toBe(false);
    expect(ok("", p)).toBe(false);
  });
});
