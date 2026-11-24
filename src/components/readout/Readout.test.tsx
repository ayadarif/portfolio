import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { demos } from "@/lib/demos";
import { buildReadout, parseSetup, emptyForm } from "@/lib/readout";
import Readout from "./Readout";

// Smoke test: each demo renders the right verdict, the three checks, and the chart only when dates exist.
function html(name: string, dropDates = false) {
  const d = demos.find((x) => x.name === name)!;
  const s = parseSetup({ ...emptyForm, plannedN: String(d.plan.plannedPerVariant), baseline: "10", minLift: "10", monthlyUsers: "200000", valuePerConversion: "500" });
  if (!s.ok) throw new Error(s.error);
  const rows = dropDates ? [{ variant: "control", users: 1000, conversions: 100 }, { variant: "treatment", users: 1000, conversions: 120 }] : d.rows;
  return renderToStaticMarkup(<Readout r={buildReadout(s.setup, rows)} setup={s.setup} />);
}

describe("Readout rendering", () => {
  it("clean_win", () => { const h = html("clean_win"); expect(h).toContain("Ship it"); expect(h).toContain("Lift over time"); });
  it("broken_split shows the SRM failure", () => { const h = html("broken_split"); expect(h).toContain("Fix the data first"); expect(h).toContain("Sample ratio: <span class=\"font-normal\">Fail"); });
  it("early_peek", () => { const h = html("early_peek"); expect(h).toContain("Keep running"); expect(h).toContain("Called too early: <span class=\"font-normal\">Fail"); });
  it("no dates, no chart", () => expect(html("clean_win", true)).not.toContain("Lift over time"));
  it("never says significant in the page copy unprompted", () => expect(html("early_peek")).not.toMatch(/is significant/i));
});
