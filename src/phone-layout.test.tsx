import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Hero from "@/components/Hero";
import CaseStudies from "@/components/CaseStudies";
import Projects from "@/components/Projects";
import Contact from "@/components/Contact";
import Tool from "@/components/readout/Tool";
import Calculator from "@/components/pmex/Calculator";
import Results from "@/components/pmex/Results";
import TriagePage from "@/components/triage/TriagePage";
import triage from "@/data/feedback-triage.json";
import { calculate, defaultForm } from "@/lib/pmex-calc";
import type { TriageData } from "@/lib/triage";
import Readout from "@/components/readout/Readout";
import { demos } from "@/lib/demos";
import { buildReadout, parseSetup, emptyForm } from "@/lib/readout";

const demo = demos[0];
const setup = parseSetup({ ...emptyForm, plannedN: String(demo.plan.plannedPerVariant), baseline: "10", minLift: "10", monthlyUsers: "200000", valuePerConversion: "500" });
if (!setup.ok) throw new Error(setup.error);

// A server render cannot measure a screen, so this checks the rules that keep a 360px phone usable:
// wide tables sit in a horizontal scroller, nothing has a fixed pixel width, and grids start as one column.
const calc = calculate(defaultForm());
if (!calc.ok) throw new Error(calc.error);

const pages: Record<string, string> = {
  home: renderToStaticMarkup(<><Hero /><CaseStudies /><Projects /><Contact /></>),
  readout: renderToStaticMarkup(<Tool />),
  readoutResults: renderToStaticMarkup(<Readout r={buildReadout(setup.setup, demo.rows)} setup={setup.setup} />),
  calculator: renderToStaticMarkup(<Calculator />),
  calculatorResults: renderToStaticMarkup(<Results r={calc.r} />),
  triage: renderToStaticMarkup(<TriagePage data={triage as unknown as TriageData} />),
};

describe.each(Object.entries(pages))("phone layout: %s", (_name, html) => {
  it("every table sits directly inside an overflow-x-auto scroller", () => {
    const tables = (html.match(/<table/g) ?? []).length;
    const wrapped = (html.match(/overflow-x-auto[^>]*><table/g) ?? []).length;
    expect(wrapped).toBe(tables);
  });
  it("no fixed pixel widths", () => {
    expect(html).not.toMatch(/\bw-\[\d+px\]/);
    expect(html).not.toMatch(/style="[^"]*width:\s*\d{3,}px/);
  });
  it("no multi-column grid without a breakpoint prefix", () => {
    for (const m of html.matchAll(/class="([^"]*)"/g)) {
      const cols = m[1].split(/\s+/).filter((c) => /^grid-cols-[2-9]/.test(c));
      expect(cols, m[1]).toEqual([]);
    }
  });
  it("minimum widths stay under 36rem so one scroll is enough", () => {
    for (const m of html.matchAll(/min-w-\[(\d+(?:\.\d+)?)rem\]/g)) expect(Number(m[1])).toBeLessThan(36);
  });
});
