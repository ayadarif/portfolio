// PMEX contract calculator: all the maths. Pure functions, no UI, no live prices.
// A risk and information tool. It never predicts a price and never recommends a trade.
// Units: prices in the contract's quote currency; money outputs in PKR; percents are plain numbers (2 means 2%)
// unless a name ends in Rate or Frac (a fraction). Side: "long" profits when price rises.
import { fees as feeData, INTRADAY_FACTOR, INTRADAY_MARGIN_FLOOR_PCT, type Contract } from "@/data/pmex-data";

export type Side = "long" | "short";

export interface FeeToggles {
  salesTaxOnPmexFee: boolean; // also charge sales tax on the PMEX fee (broker sheets differ)
  frontEndFee: boolean; // unverified, default off
  sgf: boolean; // unverified, default off
}

export const noExtraFees: FeeToggles = { salesTaxOnPmexFee: false, frontEndFee: false, sgf: false };

export interface Position {
  contract: Contract;
  side: Side;
  lots: number;
  entry: number; // price in the contract's quote currency
  usdPkr: number; // PMEX/SBP rate; ignored for PKR-quoted contracts
  marginPct: number; // percent of contract value
  altPct: number; // auto-liquidation threshold, percent of required margin
  brokerPerLotPkr: number; // commission per lot per side, before tax
  toggles?: FeeToggles;
  equityPkr?: number; // money in the account backing this position; defaults to the initial margin
}

export class InputError extends Error {}

export function validate(p: Position): void {
  const c = p.contract;
  if (!Number.isInteger(p.lots) || p.lots < 1 || p.lots > 100000) throw new InputError("Lots must be a whole number from 1 to 100,000.");
  if (!(p.entry > 0) || p.entry > 1e9) throw new InputError("Entry price must be above zero and below 1,000,000,000.");
  if (c.quote === "USD" && !(p.usdPkr > 0 && p.usdPkr < 100000)) throw new InputError("Enter the USD/PKR rate.");
  if (!(p.marginPct > 0 && p.marginPct <= 100)) throw new InputError("Margin must be between 0 and 100 percent.");
  if (!(p.altPct > 0 && p.altPct < 100)) throw new InputError("Auto-liquidation threshold must be between 0 and 100 percent.");
  if (p.brokerPerLotPkr < 0) throw new InputError("Broker commission cannot be negative.");
  if (c.longOnly && p.side === "short") throw new InputError(`${c.name} has no short side.`);
}

// PKR per one unit of the quote currency: USD contracts convert at the PMEX/SBP rate, PKR contracts need no conversion.
export const fxFor = (c: Contract, usdPkr: number) => (c.quote === "USD" ? usdPkr : 1);

// Intraday margin is about half the regular margin, never below 1%. Only for contracts that offer it.
export function intradayMarginPct(regularPct: number): number {
  return Math.max(regularPct * INTRADAY_FACTOR, INTRADAY_MARGIN_FLOOR_PCT);
}

// Money per 1.00 of price move for the whole position, in PKR: size x lots x fx.
const perPricePoint = (p: Position) => p.contract.size * p.lots * fxFor(p.contract, p.usdPkr);

export function contractValue(p: Position): { quote: number; pkr: number } {
  const q = p.entry * p.contract.size * p.lots;
  return { quote: q, pkr: q * fxFor(p.contract, p.usdPkr) };
}

export function initialMarginPkr(p: Position): number {
  return (contractValue(p).pkr * p.marginPct) / 100;
}

// Value of one tick in PKR, per lot and for the whole position.
export function tickValue(p: Position): { perLotPkr: number; positionPkr: number; perLotQuote: number } {
  const perLotQuote = p.contract.tick * p.contract.size;
  const perLotPkr = perLotQuote * fxFor(p.contract, p.usdPkr);
  return { perLotPkr, positionPkr: perLotPkr * p.lots, perLotQuote };
}

// ---------- Fees, one side ----------

export interface SideFees {
  pmexFee: number;
  secpFee: number;
  ipf: number;
  brokerCommission: number;
  salesTax: number;
  frontEnd: number;
  sgf: number;
  total: number;
}

// Fees for one side (entry or exit) of the whole position, with the contract valued at `price`.
// PMEX fee is per lot: 0.009% of that lot's value, but not below Rs 30 (read as per lot; see data note).
export function sideFees(p: Position, price: number): SideFees {
  const t = p.toggles ?? noExtraFees;
  const c = p.contract;
  const lotValuePkr = price * c.size * fxFor(c, p.usdPkr);
  const pmexPerLot = c.feeKind === "flat" ? (c.flatFeePkr ?? 0) : Math.max(lotValuePkr * feeData.pmexFeeRate, feeData.pmexFeeFloorPkr);
  const secpPerLot = pmexPerLot * feeData.secpShareOfPmexFee;
  const ipfPerLot = Math.min(pmexPerLot * feeData.ipfShareOfPmexFee, feeData.ipfCapPkr);
  const brokerPerLot = p.brokerPerLotPkr;
  const taxBase = brokerPerLot + (t.salesTaxOnPmexFee ? pmexPerLot : 0);
  const salesTaxPerLot = taxBase * feeData.salesTaxOnBroker;
  const frontEndPerLot = t.frontEndFee ? lotValuePkr * feeData.frontEndFeeRate : 0;
  const sgfPerLot = t.sgf ? lotValuePkr * feeData.sgfRate : 0;
  const n = p.lots;
  const parts = { pmexFee: pmexPerLot * n, secpFee: secpPerLot * n, ipf: ipfPerLot * n, brokerCommission: brokerPerLot * n, salesTax: salesTaxPerLot * n, frontEnd: frontEndPerLot * n, sgf: sgfPerLot * n };
  return { ...parts, total: Object.values(parts).reduce((a, b) => a + b, 0) };
}

export interface BreakEven {
  entryFees: SideFees;
  exitFees: SideFees;
  roundTripPkr: number;
  movePrice: number; // price move in the profitable direction that covers the round trip
  moveTicks: number;
  movePct: number;
}

// Round-trip cost and the favourable move that exactly covers it. The exit fee depends on the exit price, so the move
// is found by repeating the calculation until it settles (a few passes; the fee barely changes with a small move).
export function breakEven(p: Position): BreakEven {
  const entryFees = sideFees(p, p.entry);
  const dir = p.side === "long" ? 1 : -1;
  let move = 0;
  let exitFees = sideFees(p, p.entry);
  for (let i = 0; i < 20; i++) {
    exitFees = sideFees(p, p.entry + dir * move);
    const next = (entryFees.total + exitFees.total) / perPricePoint(p);
    if (Math.abs(next - move) < 1e-12) { move = next; break; }
    move = next;
  }
  exitFees = sideFees(p, p.entry + dir * move);
  return { entryFees, exitFees, roundTripPkr: entryFees.total + exitFees.total, movePrice: move, moveTicks: move / p.contract.tick, movePct: (move / p.entry) * 100 };
}

// ---------- Auto-liquidation ----------

export interface Liquidation {
  equityPkr: number;
  requiredMarginPkr: number;
  thresholdPkr: number; // equity at which the broker closes the position: ALT x required margin
  movePrice: number; // adverse move, in price units; 0 if already at or past the threshold
  movePct: number;
  moveTicks: number;
  price: number; // the price at which that happens
  alreadyBelow: boolean;
}

// The adverse move that takes equity down to ALT x required margin. Required margin is recomputed at the new price
// (as brokers do), so it shrinks a little as a long loses, or grows as a short loses. With k = money per 1.00 of price,
// m = margin fraction and alt = threshold fraction, solve  equity - x*k = alt*m*(entry -/+ x)*k  for x:
//   long:  x = (equity - alt*m*entry*k) / (k*(1 - alt*m));   short: the same with (1 + alt*m).
// With equity = the initial margin only, gold at 2% margin and a 55% ALT gives about 0.9%. Fees are not included.
export function liquidation(p: Position): Liquidation {
  const k = perPricePoint(p);
  const m = p.marginPct / 100;
  const alt = p.altPct / 100;
  const equity = p.equityPkr ?? initialMarginPkr(p);
  const requiredNow = m * p.entry * k;
  const threshold = alt * requiredNow;
  const denom = p.side === "long" ? k * (1 - alt * m) : k * (1 + alt * m);
  const raw = (equity - threshold) / denom;
  const x = Math.max(0, raw);
  const price = p.side === "long" ? p.entry - x : p.entry + x;
  return { equityPkr: equity, requiredMarginPkr: requiredNow, thresholdPkr: threshold, movePrice: x, movePct: (x / p.entry) * 100, moveTicks: x / p.contract.tick, price, alreadyBelow: raw <= 0 };
}

// ---------- Move table ----------

export interface MoveRow {
  movePct: number; // signed, relative to entry price
  price: number;
  grossPnlPkr: number;
  netPnlPkr: number; // after the round trip fees at that exit price
  pctOfMargin: number; // gross P&L as a percent of initial margin
  autoLiquidated: boolean;
}

export const MOVE_STEPS_PCT = [-5, -3, -2, -1, -0.5, 0.5, 1, 2, 3, 5];

// P&L for moves of the PRICE against your entry. Rows past the liquidation point read as auto-liquidated, and their P&L
// is capped at the loss at that point. Tola Gold is capped at the plus or minus 5% daily limit, so that is all it shows.
export function moveTable(p: Position, stepsPct: number[] = MOVE_STEPS_PCT): MoveRow[] {
  const liq = liquidation(p);
  const margin = initialMarginPkr(p);
  const limit = p.contract.dailyLimitPct;
  const dir = p.side === "long" ? 1 : -1;
  return stepsPct
    .filter((s) => limit === undefined || Math.abs(s) <= limit)
    .map((s) => {
      const exit = p.entry * (1 + s / 100);
      const priceMove = exit - p.entry;
      const adverse = priceMove * dir < 0;
      const liquidated = adverse && Math.abs(priceMove) >= liq.movePrice;
      const effectiveMove = liquidated ? liq.movePrice * (priceMove < 0 ? -1 : 1) : priceMove;
      const gross = effectiveMove * dir * perPricePoint(p);
      const exitPrice = p.entry + effectiveMove;
      const net = gross - sideFees(p, p.entry).total - sideFees(p, exitPrice).total;
      return { movePct: s, price: exit, grossPnlPkr: gross, netPnlPkr: net, pctOfMargin: (gross / margin) * 100, autoLiquidated: liquidated };
    });
}

// ---------- Margin-call and liquidation ladder ----------

export type LadderStatus = "OK" | "Margin call" | "Auto-liquidated";

export interface LadderRow {
  ticks: number; // adverse move in ticks (0 = entry)
  price: number;
  movePct: number; // adverse move as a percent of entry, positive number
  equityPkr: number;
  requiredMarginPkr: number; // at this price and this USD/PKR rate
  ratio: number; // equity / required margin
  status: LadderStatus;
  topUpPkr: number; // cash that would restore equity to the required margin; 0 when OK
}

export interface LadderBlock { fxShockPct: number; usdPkr: number; rows: LadderRow[] }

export interface Ladder { stepTicks: number; blocks: LadderBlock[]; stoppedAtDailyLimit: boolean; assumption: string }

// 1, 2, 5 x 10^n at or above x: keeps rung spacing readable.
function niceCeil(x: number): number {
  if (!(x > 0)) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(x)));
  const f = x / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
}

export const LADDER_FX_SHOCKS_PCT = [0, 1, 3, 5];

// A deterministic stress ladder, no forecast. For each USD/PKR shock (applied first, USD contracts only) it walks the price
// against the position in equal tick steps and shows equity, required margin at that price and rate, the ratio, and a status:
//   OK: equity at or above required margin.  Margin call: below it, but above the auto-liquidation threshold (alt x required margin).
//   Auto-liquidated: at or below the threshold.
// The shock changes the rupee value of every later tick and the rupee margin; it does not change P&L already settled.
// "Margin call at required margin" is a modelling assumption; brokers differ. Fees are left out. Tola Gold stops at its daily limit.
export function marginLadder(p: Position, shocksPct: number[] = LADDER_FX_SHOCKS_PCT, rungs = 10): Ladder {
  const c = p.contract;
  const base = liquidation(p);
  const stepTicks = niceCeil(base.alreadyBelow ? (p.entry * 0.01) / c.tick / rungs : (1.2 * base.moveTicks) / rungs);
  const dir = p.side === "long" ? -1 : 1; // adverse direction
  const alt = p.altPct / 100;
  const m = p.marginPct / 100;
  const equity0 = p.equityPkr ?? initialMarginPkr(p);
  const shocks = c.quote === "USD" ? shocksPct : [0];
  let stoppedAtLimit = false;
  const blocks = shocks.map((sh) => {
    const rate = c.quote === "USD" ? p.usdPkr * (1 + sh / 100) : p.usdPkr;
    const k = c.size * p.lots * fxFor(c, rate);
    const rows: LadderRow[] = [];
    for (let i = 0; i <= rungs; i++) {
      const ticks = i * stepTicks;
      const move = ticks * c.tick;
      const movePct = (move / p.entry) * 100;
      if (c.dailyLimitPct !== undefined && movePct > c.dailyLimitPct) { stoppedAtLimit = true; break; }
      const price = p.entry + dir * move;
      if (!(price > 0)) break;
      const equity = equity0 - move * k;
      const required = m * price * k;
      const ratio = equity / required;
      const status: LadderStatus = equity <= alt * required ? "Auto-liquidated" : equity < required ? "Margin call" : "OK";
      rows.push({ ticks, price, movePct, equityPkr: equity, requiredMarginPkr: required, ratio, status, topUpPkr: Math.max(0, required - equity) });
    }
    return { fxShockPct: sh, usdPkr: rate, rows };
  });
  return {
    stepTicks, blocks, stoppedAtDailyLimit: stoppedAtLimit,
    assumption: "A margin call is taken to mean equity below the margin required at that price and rate; auto-liquidation is at the threshold you set. Brokers define these differently. Fees are not included.",
  };
}

// ---------- Position sizing ----------

export interface SizingInput {
  accountPkr: number;
  maxRiskPct: number; // percent of account you accept to lose at the stop
  stop: number; // stop price
  marginBufferPct: number; // share of the account you keep free of margin (default 50)
}

export interface Sizing {
  maxLots: number;
  byRisk: number; // lots allowed by the risk limit (unrounded)
  byMargin: number; // lots allowed by margin (unrounded)
  limitedBy: "risk" | "margin";
  lossPerLotAtStopPkr: number;
  riskBudgetPkr: number;
  stopBeyondLiquidation: boolean;
  warnings: string[];
}

// Maximum lots under YOUR inputs: the smaller of what the risk limit allows and what the margin allows, rounded down.
// A calculation of limits, not a recommendation to trade that size.
export function positionSizing(base: Omit<Position, "lots">, s: SizingInput): Sizing {
  const one: Position = { ...base, lots: 1, equityPkr: undefined };
  const warnings: string[] = [];
  const dir = base.side === "long" ? 1 : -1;
  if ((s.stop - base.entry) * dir >= 0) throw new InputError("For a " + base.side + " the stop must be " + (dir === 1 ? "below" : "above") + " the entry price.");
  const stopDistance = Math.abs(base.entry - s.stop);
  const lossAtStopPerLot = stopDistance * perPricePoint(one) + sideFees(one, base.entry).total + sideFees(one, s.stop).total;
  const budget = (s.accountPkr * s.maxRiskPct) / 100;
  const byRisk = budget / lossAtStopPerLot;
  const marginPerLot = initialMarginPkr(one);
  const byMargin = (s.accountPkr * (1 - s.marginBufferPct / 100)) / marginPerLot;
  const maxLots = Math.max(0, Math.floor(Math.min(byRisk, byMargin)));
  // Is the stop further away than the point where the broker would close the position first? Judged at the sized lots, with the whole account as equity.
  let beyond = false;
  if (maxLots >= 1) {
    const liq = liquidation({ ...base, lots: maxLots, equityPkr: s.accountPkr });
    beyond = stopDistance > liq.movePrice;
    if (beyond) warnings.push("Your stop is further away than the auto-liquidation point at this size, so the broker would close the position before your stop is hit.");
  }
  warnings.push("USD-priced contracts follow CME and ICE markets and can gap past a stop, so the real loss can be larger than the stop implies.");
  if (maxLots < 1) warnings.push("Under these inputs even one lot breaks a limit.");
  return { maxLots, byRisk, byMargin, limitedBy: byRisk <= byMargin ? "risk" : "margin", lossPerLotAtStopPkr: lossAtStopPerLot, riskBudgetPkr: budget, stopBeyondLiquidation: beyond, warnings };
}

// ---------- USD/PKR sensitivity ----------

export interface FxSensitivity {
  applies: boolean;
  tickValueNowPkr: number;
  tickValueAfterPkr: number;
  marginNowPkr: number;
  marginAfterPkr: number;
  marginChangePkr: number;
  settledPnlChangePkr: number; // always 0 for a move that has already settled
}

// What a 1% move in USD/PKR changes (the rupee value of future ticks, and the rupee margin) and what it does not
// (P&L already settled: PMEX settles each day's price change at that day's rate, so no price move means no P&L).
export function fxSensitivity(p: Position, fxMovePct = 1): FxSensitivity {
  if (p.contract.quote !== "USD") return { applies: false, tickValueNowPkr: tickValue(p).positionPkr, tickValueAfterPkr: tickValue(p).positionPkr, marginNowPkr: initialMarginPkr(p), marginAfterPkr: initialMarginPkr(p), marginChangePkr: 0, settledPnlChangePkr: 0 };
  const after: Position = { ...p, usdPkr: p.usdPkr * (1 + fxMovePct / 100) };
  return {
    applies: true, tickValueNowPkr: tickValue(p).positionPkr, tickValueAfterPkr: tickValue(after).positionPkr,
    marginNowPkr: initialMarginPkr(p), marginAfterPkr: initialMarginPkr(after), marginChangePkr: initialMarginPkr(after) - initialMarginPkr(p), settledPnlChangePkr: 0,
  };
}

// Settled P&L for a price move that happened while the rate was `rateAtSettlement`. This is what the daily settlement books.
// Changing the rate AFTER settlement does not change it, which is why fxSensitivity reports 0 for settled P&L.
export function settledPnlPkr(p: Position, exit: number, rateAtSettlement: number): number {
  const dir = p.side === "long" ? 1 : -1;
  return (exit - p.entry) * dir * p.contract.size * p.lots * fxFor(p.contract, rateAtSettlement);
}

// ---------- Plain English summary ----------

export function summary(p: Position, be: BreakEven, liq: Liquidation): string[] {
  const r = (n: number) => `Rs ${Math.abs(n) < 1 ? n.toFixed(3) : Math.round(n).toLocaleString("en-US")}`;
  const margin = initialMarginPkr(p);
  const tv = tickValue(p);
  return [
    `This ${p.side} of ${p.lots} lot${p.lots === 1 ? "" : "s"} of ${p.contract.name} needs about ${r(margin)} of initial margin, and one tick is worth about ${r(tv.positionPkr)} on the whole position.`,
    `Fees and taxes on both sides come to about ${r(be.roundTripPkr)}, so the price has to move about ${be.moveTicks.toFixed(1)} ticks (${be.movePct.toFixed(3)}%) in your favour just to break even.`,
    liq.alreadyBelow
      ? "With the equity entered, the position is already at or past the auto-liquidation point."
      : `If the price moves against you by about ${liq.movePct.toFixed(2)}% (${liq.moveTicks.toFixed(0)} ticks), your equity would fall to the broker's auto-liquidation threshold and the position would be closed.`,
  ];
}
