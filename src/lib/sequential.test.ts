import { describe, expect, it } from "vitest";
import grid from "../../scripts/fixtures/sequential_grid.json";
import { compareVariants, sequentialBand, sequentialHalfWidth, verdict, sampleRatioMismatch, calledTooEarly } from "./stats";

describe("sequential confidence band", () => {
  it("matches the NumPy port on a grid to relative error 1e-10", () => {
    for (const g of grid) {
      const ts = sequentialHalfWidth(g.se, g.n, g.nStar, g.alpha);
      expect(Math.abs(ts - g.halfWidth) / g.halfWidth).toBeLessThan(1e-10);
    }
  });

  it("A/A: the band excludes zero at some look in about alpha of tests or fewer; the naive interval does not", () => {
    // mulberry32: small seeded PRNG so the test is exactly repeatable.
    let s = 20261124;
    const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const norm = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
    const binom = (n: number, p: number) => Math.max(0, Math.min(n, Math.round(n * p + Math.sqrt(n * p * (1 - p)) * norm()))); // normal approx, fine at n=500
    const sims = 1500, looks = 24, step = 500, planned = step * looks, p = 0.1;
    let naive = 0, seq = 0;
    for (let i = 0; i < sims; i++) {
      let a = 0, b = 0, hitN = false, hitS = false;
      for (let l = 1; l <= looks; l++) {
        a += binom(step, p); b += binom(step, p);
        const c = compareVariants({ users: l * step, conversions: a }, { users: l * step, conversions: b });
        if (c.absLiftLow > 0 || c.absLiftHigh < 0) hitN = true;
        const band = sequentialBand(c, l * step, l * step, planned);
        if (band.low > 0 || band.high < 0) hitS = true;
      }
      naive += hitN ? 1 : 0; seq += hitS ? 1 : 0;
    }
    expect(seq / sims).toBeLessThanOrEqual(0.05);
    expect(naive / sims).toBeGreaterThan(0.15);
  });

  it("verdict: early win and early stop only below the planned sample and only when the band excludes zero", () => {
    const a = { users: 3000, conversions: 300 };
    const win = compareVariants(a, { users: 3000, conversions: 480 });
    const srm = sampleRatioMismatch(3000, 3000);
    const early = calledTooEarly(3000, 3000, 20000);
    expect(verdict(srm, early, win, sequentialBand(win, 3000, 3000, 20000))).toBe("Early win (valid sequential call)");
    const loss = compareVariants({ users: 3000, conversions: 480 }, { users: 3000, conversions: 300 });
    expect(verdict(srm, early, loss, sequentialBand(loss, 3000, 3000, 20000))).toBe("Stop: it's hurting");
    const flat = compareVariants(a, { users: 3000, conversions: 310 });
    expect(verdict(srm, early, flat, sequentialBand(flat, 3000, 3000, 20000))).toBe("Keep running");
    // Without a band the old rule holds.
    expect(verdict(srm, early, win)).toBe("Keep running");
    // Broken split beats everything.
    expect(verdict(sampleRatioMismatch(3000, 2000), early, win, sequentialBand(win, 3000, 2000, 20000))).toBe("Fix the data first");
  });
});
