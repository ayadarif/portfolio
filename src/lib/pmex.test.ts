import { describe, expect, it } from "vitest";
import { brokerPresets, contracts, type Contract } from "@/data/pmex-data";
import {
  breakEven, fxSensitivity, marginLadder, initialMarginPkr, InputError, intradayMarginPct, liquidation, moveTable, positionSizing, settledPnlPkr,
  sideFees, tickValue, validate, type Position,
} from "./pmex";

const c = (id: string): Contract => contracts.find((x) => x.id === id)!;
const ktrade = (id: string) => brokerPresets.find((b) => b.id === "ktrade")!.perLot[id];

const gold = (over: Partial<Position> = {}): Position => ({ contract: c("go1oz"), side: "long", lots: 1, entry: 2000, usdPkr: 280, marginPct: 2, altPct: 55, brokerPerLotPkr: ktrade("go1oz"), ...over });
const crude = (over: Partial<Position> = {}): Position => ({ contract: c("crude10"), side: "long", lots: 1, entry: 70, usdPkr: 280, marginPct: 4.75, altPct: 55, brokerPerLotPkr: ktrade("crude10"), ...over });
const tola = (over: Partial<Position> = {}): Position => ({ contract: c("tola"), side: "long", lots: 1, entry: 400000, usdPkr: 280, marginPct: 25, altPct: 55, brokerPerLotPkr: ktrade("tola"), ...over });

describe("contract value, margin and tick value", () => {
  it("gold 1 oz: value, margin and tick value in PKR", () => {
    const p = gold();
    expect(initialMarginPkr(p)).toBeCloseTo(2000 * 280 * 0.02, 6); // 11,200
    expect(tickValue(p).perLotPkr).toBeCloseTo(0.1 * 1 * 280, 6); // $0.10 x Rs 280
  });
  it("tick values match the spec table (USD per lot)", () => {
    const usd = (id: string) => tickValue({ ...gold({ contract: c(id), usdPkr: 1 }) }).perLotQuote;
    expect(usd("go1oz")).toBeCloseTo(0.1);
    expect(usd("go10oz")).toBeCloseTo(1);
    expect(usd("go100oz")).toBeCloseTo(10);
    expect(usd("micro_gold")).toBeCloseTo(0.001);
    expect(usd("crude10")).toBeCloseTo(0.1);
    expect(usd("crude100")).toBeCloseTo(1);
    expect(usd("crude1000")).toBeCloseTo(10);
  });
  it("Tola Gold is priced in rupees, so USD/PKR does not enter", () => {
    expect(tickValue(tola()).perLotPkr).toBe(1);
    expect(initialMarginPkr(tola({ usdPkr: 280 }))).toBe(initialMarginPkr(tola({ usdPkr: 999 })));
  });
  it("intraday margin is half the regular margin with a 1% floor", () => {
    expect(intradayMarginPct(2)).toBe(1);
    expect(intradayMarginPct(4.75)).toBeCloseTo(2.375);
    expect(intradayMarginPct(1.5)).toBe(1);
  });
});

describe("Tola Gold has no short side", () => {
  it("rejects a short", () => expect(() => validate(tola({ side: "short" }))).toThrow(InputError));
  it("every long-only contract in the data rejects a short, and no other does", () => {
    for (const k of contracts) {
      const p = gold({ contract: k, side: "short", usdPkr: k.quote === "USD" ? 280 : 1 });
      if (k.longOnly) expect(() => validate(p)).toThrow(InputError);
      else expect(() => validate(p)).not.toThrow();
    }
    expect(contracts.filter((k) => k.longOnly).map((k) => k.id).sort()).toEqual(["milli_tola", "tola"]);
  });
  it("the move table for Tola Gold never goes past the 5% daily limit", () => {
    const rows = moveTable(tola(), [-10, -5, -2, 2, 5, 10]);
    expect(rows.map((r) => r.movePct)).toEqual([-5, -2, 2, 5]);
  });
});

describe("auto-liquidation distance", () => {
  it("gold 1 oz at 2% margin and a 55% threshold is about 0.9% against a long", () => {
    const l = liquidation(gold());
    expect(l.movePct).toBeCloseTo((0.02 * 0.45) / (1 - 0.55 * 0.02) * 100, 6); // 0.9100%
    expect(l.movePct).toBeGreaterThan(0.89);
    expect(l.movePct).toBeLessThan(0.92);
    const x = (2000 * 0.009) / 0.989; // 18.2002: the exact move, a hair above the 18.2 rule of thumb
    expect(l.price).toBeCloseTo(2000 - x, 6);
    expect(l.moveTicks).toBeCloseTo(x / 0.1, 4);
  });
  it("a short is liquidated by a slightly smaller percent move than a long", () => {
    const s = liquidation(gold({ side: "short" }));
    expect(s.movePct).toBeCloseTo((0.02 * 0.45) / (1 + 0.55 * 0.02) * 100, 6); // 0.8902%
    expect(s.price).toBeGreaterThan(2000);
  });
  it("at that price, equity equals the threshold (the algebra holds)", () => {
    const p = gold({ lots: 3 });
    const l = liquidation(p);
    const equityThen = l.equityPkr - l.movePrice * 3 * 280;
    const requiredThen = 0.02 * l.price * 3 * 280;
    expect(equityThen).toBeCloseTo(0.55 * requiredThen, 6);
  });
  it("more equity means more room; an account already below the threshold gives zero", () => {
    expect(liquidation(gold({ equityPkr: 50000 })).movePct).toBeGreaterThan(liquidation(gold()).movePct);
    const low = liquidation(gold({ equityPkr: 1000 }));
    expect(low.alreadyBelow).toBe(true);
    expect(low.movePrice).toBe(0);
  });
  it("move table marks rows past liquidation and caps their loss", () => {
    const rows = moveTable(gold());
    const m1 = rows.find((r) => r.movePct === -1)!;
    const m05 = rows.find((r) => r.movePct === -0.5)!;
    expect(m05.autoLiquidated).toBe(false);
    expect(m1.autoLiquidated).toBe(true);
    expect(m1.grossPnlPkr).toBeCloseTo(-((2000 * 0.009) / 0.989) * 280, 4); // loss stops at the liquidation point, not at -1%
    expect(rows.find((r) => r.movePct === 1)!.autoLiquidated).toBe(false);
  });
});

describe("fees", () => {
  it("the Rs 30 floor binds on CRUDE10 (0.009% of Rs 196,000 is Rs 17.64)", () => {
    const f = sideFees(crude(), 70);
    expect(70 * 10 * 280 * 0.00009).toBeCloseTo(17.64, 6);
    expect(f.pmexFee).toBe(30);
    expect(f.secpFee).toBeCloseTo(3);
    expect(f.ipf).toBeCloseTo(0.3);
    expect(f.brokerCommission).toBe(60);
    expect(f.salesTax).toBeCloseTo(9); // 15% of the broker commission only
    expect(f.total).toBeCloseTo(102.3, 6);
  });
  it("the floor is per lot, so 5 lots pay 5 x Rs 30", () => {
    expect(sideFees(crude({ lots: 5 }), 70).pmexFee).toBe(150);
  });
  it("the floor does not bind on gold 1 oz at these prices: the percentage does", () => {
    expect(sideFees(gold(), 2000).pmexFee).toBeCloseTo(2000 * 280 * 0.00009, 6); // 50.40
  });
  it("Micro Gold and Milli Tola pay flat PMEX fees", () => {
    expect(sideFees(gold({ contract: c("micro_gold"), brokerPerLotPkr: 0 }), 2000).pmexFee).toBe(1);
    expect(sideFees(tola({ contract: c("milli_tola"), brokerPerLotPkr: 0 }), 400000).pmexFee).toBe(0.5);
  });
  it("sales tax on the PMEX fee is a toggle and defaults off", () => {
    const on = sideFees(crude({ toggles: { salesTaxOnPmexFee: true, frontEndFee: false, sgf: false } }), 70);
    expect(on.salesTax).toBeCloseTo(0.15 * (60 + 30));
  });
  it("front-end fee and SGF are off by default and add value-based charges when on", () => {
    const off = sideFees(gold(), 2000);
    const on = sideFees(gold({ toggles: { salesTaxOnPmexFee: false, frontEndFee: true, sgf: true } }), 2000);
    expect(off.frontEnd + off.sgf).toBe(0);
    expect(on.frontEnd).toBeCloseTo(560000 * 0.00001, 6);
    expect(on.sgf).toBeCloseTo(560000 * 0.0000031, 6);
  });
});

describe("break-even", () => {
  it("the break-even move earns exactly the round trip fees", () => {
    const p = gold();
    const be = breakEven(p);
    const gross = be.movePrice * 1 * 280;
    expect(gross).toBeCloseTo(be.roundTripPkr, 6);
    expect(be.moveTicks).toBeCloseTo(be.movePrice / 0.1, 9);
    expect(be.roundTripPkr).toBeCloseTo(be.entryFees.total + sideFees(p, 2000 + be.movePrice).total, 6);
  });
  it("a short breaks even on a fall", () => {
    const be = breakEven(gold({ side: "short" }));
    expect(be.exitFees.total).toBeLessThan(sideFees(gold(), 2000 + be.movePrice).total); // exit value is lower than the entry value
  });
});

describe("USD/PKR moves tick value and margin but not settled P&L", () => {
  it("1% on USD/PKR raises the rupee tick value and margin by 1%", () => {
    const s = fxSensitivity(gold(), 1);
    expect(s.applies).toBe(true);
    expect(s.tickValueAfterPkr / s.tickValueNowPkr).toBeCloseTo(1.01, 9);
    expect(s.marginAfterPkr / s.marginNowPkr).toBeCloseTo(1.01, 9);
    expect(s.marginChangePkr).toBeCloseTo(11200 * 0.01, 6);
  });
  it("settled P&L: no price move is no P&L at any rate, and a settled move keeps the rate of its day", () => {
    const p = gold();
    for (const rate of [270, 280, 300]) expect(settledPnlPkr(p, 2000, rate)).toBe(0);
    const booked = settledPnlPkr(p, 2010, 280); // +$10 settled at Rs 280
    expect(booked).toBeCloseTo(2800, 6);
    expect(fxSensitivity(p, 5).settledPnlChangePkr).toBe(0);
    expect(settledPnlPkr(p, 2010, 280)).toBe(booked); // a later rate move does not rewrite it
  });
  it("a margin call can come from the rate alone: margin rises with no price move", () => {
    expect(initialMarginPkr(gold({ usdPkr: 288 }))).toBeGreaterThan(initialMarginPkr(gold({ usdPkr: 280 })));
    expect(liquidation(gold({ usdPkr: 288, equityPkr: 11200 })).alreadyBelow).toBe(false);
    expect(liquidation(gold({ usdPkr: 560, equityPkr: 11200 })).alreadyBelow).toBe(true); // margin doubled, same cash
  });
  it("PKR contracts are not affected", () => {
    const s = fxSensitivity(tola());
    expect(s.applies).toBe(false);
    expect(s.marginChangePkr).toBe(0);
  });
});

describe("position sizing", () => {
  const base = { contract: c("go1oz"), side: "long" as const, entry: 2000, usdPkr: 280, marginPct: 2, altPct: 55, brokerPerLotPkr: 45 };
  it("max lots is the smaller of the risk limit and the margin limit, rounded down", () => {
    const s = positionSizing(base, { accountPkr: 1_000_000, maxRiskPct: 1, stop: 1990, marginBufferPct: 50 });
    // loss per lot at the stop: $10 x Rs 280 = 2,800 plus fees on both sides
    expect(s.lossPerLotAtStopPkr).toBeCloseTo(2800 + sideFees({ ...base, lots: 1 }, 2000).total + sideFees({ ...base, lots: 1 }, 1990).total, 6);
    expect(s.riskBudgetPkr).toBe(10000);
    expect(s.byRisk).toBeCloseTo(10000 / s.lossPerLotAtStopPkr, 9);
    expect(s.byMargin).toBeCloseTo(500000 / 11200, 9);
    expect(s.maxLots).toBe(3);
    expect(s.limitedBy).toBe("risk");
  });
  it("margin can be the binding limit", () => {
    const s = positionSizing(base, { accountPkr: 100_000, maxRiskPct: 50, stop: 1990, marginBufferPct: 50 });
    expect(s.limitedBy).toBe("margin");
    expect(s.maxLots).toBe(Math.floor(50000 / 11200)); // 4
  });
  it("warns when the stop is beyond the auto-liquidation point", () => {
    const s = positionSizing(base, { accountPkr: 100_000, maxRiskPct: 100, stop: 1890, marginBufferPct: 50 });
    expect(s.maxLots).toBe(3);
    expect(s.stopBeyondLiquidation).toBe(true);
    expect(s.warnings.join(" ")).toMatch(/auto-liquidation/);
  });
  it("always carries the gap caveat, and says so when no lot fits", () => {
    const s = positionSizing(base, { accountPkr: 5000, maxRiskPct: 1, stop: 1990, marginBufferPct: 50 });
    expect(s.maxLots).toBe(0);
    expect(s.warnings.join(" ")).toMatch(/gap past a stop/);
    expect(s.warnings.join(" ")).toMatch(/even one lot/);
  });
  it("rejects a stop on the wrong side", () => {
    expect(() => positionSizing(base, { accountPkr: 1_000_000, maxRiskPct: 1, stop: 2010, marginBufferPct: 50 })).toThrow(InputError);
    expect(() => positionSizing({ ...base, side: "short" }, { accountPkr: 1_000_000, maxRiskPct: 1, stop: 1990, marginBufferPct: 50 })).toThrow(InputError);
  });
});

describe("input validation", () => {
  it("rejects nonsense", () => {
    expect(() => validate(gold({ lots: 0 }))).toThrow(InputError);
    expect(() => validate(gold({ entry: -1 }))).toThrow(InputError);
    expect(() => validate(gold({ usdPkr: 0 }))).toThrow(InputError);
    expect(() => validate(gold({ marginPct: 0 }))).toThrow(InputError);
    expect(() => validate(gold({ altPct: 100 }))).toThrow(InputError);
  });
  it("PKR contracts do not need a USD/PKR rate", () => expect(() => validate(tola({ usdPkr: 0 }))).not.toThrow());
});

describe("data file", () => {
  it("every contract has a source URL, a date and a status", () => {
    for (const k of contracts) {
      expect(k.url).toMatch(/^https:\/\//);
      expect(k.asOf).toMatch(/^\d{4}-\d{2}/);
      expect(k.status.length).toBeGreaterThan(0);
    }
    for (const b of brokerPresets) expect(b.url).toMatch(/^https:\/\//);
  });
});

// Real-trade check: waits for one broker statement line (account numbers removed). Fill in the numbers from NEEDS_AYAD.md item 11, then remove .skip.
describe("real-trade check", () => {
  it.skip("one real round trip: fees on the statement equal the model's, to the rupee", () => {
    const statement = { contract: "crude10", lots: 1, entry: 0, exit: 0, usdPkr: 0, totalChargesPkr: 0 }; // placeholders, not real data
    expect(statement.totalChargesPkr).toBeGreaterThan(0);
  });
});

describe("margin-call ladder", () => {
  it("flips to auto-liquidated exactly where liquidation() says, to within one rung", () => {
    for (const side of ["long", "short"] as const) {
      const p = gold({ side, equityPkr: 40000 });
      const liq = liquidation(p);
      const lad = marginLadder(p);
      const rows = lad.blocks[0].rows;
      const first = rows.findIndex((r) => r.status === "Auto-liquidated");
      expect(first).toBeGreaterThan(0);
      expect(rows[first].ticks).toBeGreaterThanOrEqual(liq.moveTicks);
      expect(rows[first - 1].ticks).toBeLessThan(liq.moveTicks);
    }
  });
  it("starts OK at entry when equity exceeds the margin, and ratios fall as price goes against you", () => {
    const rows = marginLadder(gold({ equityPkr: 40000 })).blocks[0].rows;
    expect(rows[0].status).toBe("OK");
    expect(rows[0].ratio).toBeCloseTo(40000 / 11200, 9);
    for (let i = 1; i < rows.length; i++) expect(rows[i].ratio).toBeLessThan(rows[i - 1].ratio);
  });
  it("a USD/PKR shock raises required margin with no price move: equity equal to margin becomes a margin call", () => {
    const lad = marginLadder(gold());
    expect(lad.blocks[0].rows[0].status).toBe("OK");
    const five = lad.blocks.find((b) => b.fxShockPct === 5)!;
    expect(five.rows[0].requiredMarginPkr).toBeCloseTo(11200 * 1.05, 6);
    expect(five.rows[0].status).toBe("Margin call");
    expect(five.rows[0].topUpPkr).toBeCloseTo(11200 * 0.05, 6);
  });
  it("shocks make every later rung worse, never better", () => {
    const lad = marginLadder(gold({ equityPkr: 40000 }));
    for (let b = 1; b < lad.blocks.length; b++) lad.blocks[b].rows.forEach((r, i) => expect(r.ratio).toBeLessThan(lad.blocks[b - 1].rows[i].ratio));
  });
  it("short mirrors long: price levels sit above entry", () => {
    const r = marginLadder(gold({ side: "short", equityPkr: 40000 })).blocks[0].rows;
    expect(r[1].price).toBeGreaterThan(2000);
  });
  it("Tola Gold has one block (no USD/PKR) and stops at the 5% daily limit", () => {
    const lad = marginLadder(tola({ equityPkr: 200000 }));
    expect(lad.blocks).toHaveLength(1);
    for (const r of lad.blocks[0].rows) expect(r.movePct).toBeLessThanOrEqual(5);
  });
});
