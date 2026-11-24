import { describe, expect, it } from "vitest";
import ref from "../../scripts/fixtures/simulator_reference.json";
import { merge, simulate, simulateRange, lookDays } from "./simulator";

describe("A/A simulator", () => {
  it("gives exactly the same counts as the Python port", () => {
    for (const r of ref) expect(simulate(r.config)).toEqual(r.result);
  });
  it("chunks add up to the whole run", () => {
    const c = ref[0].config;
    expect(merge(simulateRange(c, 0, 150), simulateRange(c, 150, c.tests))).toEqual(simulate(c));
  });
  it("naive peeking inflates false alarms and the sequential band does not", () => {
    const r = simulate(ref[0].config);
    expect(r.naiveAny / r.tests).toBeGreaterThan(0.15);
    expect(r.seqAny / r.tests).toBeLessThanOrEqual(0.05);
  });
  it("looks include the last day", () => {
    expect(lookDays(10, 4)).toEqual([4, 8, 10]);
  });
});
