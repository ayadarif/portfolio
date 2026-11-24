import { describe, expect, it } from "vitest";
import { demos } from "./demos";
import { buildNarrative, rewritePayload, significance, TRENDING_NEGATIVE } from "./narrative";
import { buildReadout, emptyForm, parseSetup, type FormState } from "./readout";
import type { ResultRow } from "./stats";

function run(rows: ResultRow[], over: Partial<FormState> = {}) {
  const f: FormState = { ...emptyForm, plannedN: "1000", baseline: "10", minLift: "10", monthlyUsers: "200000", valuePerConversion: "500", ...over };
  const s = parseSetup(f);
  if (!s.ok) throw new Error(s.error);
  const r = buildReadout(s.setup, rows);
  return { s: s.setup, r, text: buildNarrative(s.setup, r) };
}
const demoRows = (n: string) => demos.find((d) => d.name === n)!.rows;
const demoPlanned = (n: string) => String(demos.find((d) => d.name === n)!.plan.plannedPerVariant);
const two = (a: [number, number], b: [number, number]): ResultRow[] => [
  { variant: "control", users: a[0], conversions: a[1] }, { variant: "treatment", users: b[0], conversions: b[1] },
];
const sigWord = /significan/i;

describe("rule-based readout", () => {
  it("every demo gives 4 to 6 sentences", () => {
    for (const d of demos) {
      const { text } = run(d.rows, { plannedN: String(d.plan.plannedPerVariant) });
      expect(text.length).toBeGreaterThanOrEqual(4);
      expect(text.length).toBeLessThanOrEqual(6);
    }
  });
  it("Ship it: says significant, and includes the business sentence", () => {
    const { r, text } = run(demoRows("clean_win"), { plannedN: demoPlanned("clean_win") });
    expect(r.verdict).toBe("Ship it");
    const all = text.join(" ");
    expect(all).toMatch(sigWord);
    expect(all).toMatch(/If shipped, expect roughly \+[\d,]+ conversions a month \(range \+[\d,]+ to \+[\d,]+\), worth about [\d,]+\./);
  });
  it("Keep running: never says significant when the stats do not", () => {
    const { r, text } = run(demoRows("early_peek"), { plannedN: demoPlanned("early_peek") });
    expect(r.verdict).toBe("Keep running");
    if (!significance(r.cmp).significant) expect(text.join(" ")).not.toMatch(sigWord);
    expect(text.join(" ")).toContain("Keep the test running");
  });
  it("Fix the data first: no business impact sentence, no significance", () => {
    const { r, text } = run(demoRows("broken_split"), { plannedN: demoPlanned("broken_split") });
    expect(r.verdict).toBe("Fix the data first");
    const all = text.join(" ");
    expect(all).not.toContain("If shipped");
    expect(all).not.toMatch(sigWord);
    expect(all).toContain("Do not trust these numbers");
  });
  it("No clear winner never says significant", () => {
    const { r, text } = run(two([5000, 500], [5000, 505]), { plannedN: "5000" });
    expect(r.verdict).toBe("No clear winner");
    expect(text.join(" ")).not.toMatch(sigWord);
  });
  it("Don't ship: it hurt", () => {
    const { r, text } = run(two([5000, 600], [5000, 480]), { plannedN: "5000" });
    expect(r.verdict).toBe("Don't ship: it hurt");
    expect(text.join(" ")).toMatch(sigWord);
    expect(text.join(" ")).toContain("Do not ship");
    expect(text.join(" ")).toContain("−");
  });
  it("Keep running + significantly negative adds the trending negative line", () => {
    const { r, text } = run(two([5000, 600], [5000, 480]), { plannedN: "1000000" });
    expect(r.verdict).toBe("Keep running");
    expect(significance(r.cmp).negative).toBe(true);
    expect(text).toContain(TRENDING_NEGATIVE);
    expect(text.length).toBeLessThanOrEqual(6);
  });
  it("no business sentence without monthly users and value", () => {
    const { text } = run(demoRows("clean_win"), { plannedN: demoPlanned("clean_win"), monthlyUsers: "", valuePerConversion: "" });
    expect(text.join(" ")).not.toContain("If shipped");
  });
  it("payload carries the verdict and numbers but not the experiment text", () => {
    const { s, r, text } = run(demoRows("clean_win"), { plannedN: demoPlanned("clean_win"), name: "Secret name", hypothesis: "Secret idea", metric: "Secret metric" });
    const json = JSON.stringify(rewritePayload(s, r, text));
    expect(json).toContain("Ship it");
    expect(json).not.toContain("Secret");
  });
});
