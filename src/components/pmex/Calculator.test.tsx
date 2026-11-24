import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { calculate, defaultForm, defaultMarginFor } from "@/lib/pmex-calc";
import Calculator from "./Calculator";
import Results from "./Results";

function results(over: Partial<ReturnType<typeof defaultForm>> = {}) {
  const out = calculate({ ...defaultForm(over.contractId ?? "go1oz"), ...over });
  if (!out.ok) throw new Error(out.error);
  return renderToStaticMarkup(<Results r={out.r} />);
}

describe("calculator page (server render)", () => {
  const page = renderToStaticMarkup(<Calculator />);
  it("renders the form with the disclaimer, sources and no trade advice", () => {
    expect(page).toContain("Educational tool, not investment advice");
    expect(page).toContain("not market data");
    expect(page).toContain("pmex-data.ts");
    expect(page).not.toMatch(/\b(buy now|sell now|signal)\b/i);
  });
  it("shows the headline liquidation distance for the default gold position", () => {
    expect(page).toContain("Auto-liquidation distance");
    expect(page).toContain("0.91%");
  });
  it("has no dashes used as punctuation", () => expect(page).not.toMatch(/[–—]/));
});

describe("results rendering", () => {
  it("Tola Gold: no USD/PKR input effect, says so, and caps the move table at 5%", () => {
    const h = results({ contractId: "tola", entry: "400000", marginPct: "25" });
    expect(h).toContain("priced in rupees");
    expect(h).not.toContain("+10%");
    expect(h).toContain("daily limit");
  });
  it("crude shows the fee floor in the entry breakdown", () => {
    const h = results({ contractId: "crude10", entry: "70", marginPct: "4.75" });
    expect(h).toContain("PMEX fee Rs 30.00");
  });
  it("sizing section appears only when account, risk and stop are all given", () => {
    expect(results()).not.toContain("Maximum lots under your inputs");
    const h = results({ accountPkr: "1000000", maxRiskPct: "1", stop: "1990" });
    expect(h).toContain("Maximum lots under your inputs");
    expect(h).toContain("3 lots");
    expect(h).toContain("not a suggestion to trade that size");
  });
  it("states that USD/PKR does not change settled P&L", () => expect(results()).toContain("does not change"));
});

describe("form logic", () => {
  it("a short on Tola Gold returns a clear error, not a number", () => {
    const out = calculate({ ...defaultForm("tola"), side: "short" });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/no short side/);
  });
  it("a broker preset with no rate for the contract asks for a custom commission", () => {
    const out = calculate({ ...defaultForm("crude1000"), broker: "scs" });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/Custom/);
  });
  it("intraday halves the margin default with a 1% floor, and is ignored where not offered", () => {
    expect(defaultMarginFor("go1oz", true)).toBe("1");
    expect(defaultMarginFor("crude10", true)).toBe("2.375");
    expect(defaultMarginFor("tola", true)).toBe("25");
  });
  it("empty or bad numbers give an error message", () => {
    expect(calculate({ ...defaultForm(), lots: "" }).ok).toBe(false);
    expect(calculate({ ...defaultForm(), entry: "abc" }).ok).toBe(false);
  });
});
