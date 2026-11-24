// Glue between the calculator form (strings) and src/lib/pmex.ts (numbers). No new maths here.
import { brokerPresets, contracts, DEFAULT_ALT_PCT, type Contract } from "@/data/pmex-data";
import {
  breakEven, contractValue, fxSensitivity, initialMarginPkr, InputError, intradayMarginPct, liquidation, moveTable, positionSizing,
  summary, tickValue, validate, type BreakEven, type FxSensitivity, type Liquidation, type MoveRow, type Position, type Side, type Sizing,
} from "./pmex";

export interface CalcForm {
  contractId: string;
  intraday: boolean;
  side: Side;
  lots: string;
  entry: string;
  usdPkr: string;
  marginPct: string;
  altPct: string;
  broker: string; // preset id or "custom"
  customCommission: string; // rupees per lot per side
  salesTaxOnPmexFee: boolean;
  frontEndFee: boolean;
  sgf: boolean;
  accountPkr: string;
  maxRiskPct: string;
  stop: string;
  marginBufferPct: string;
}

export const getContract = (id: string): Contract => contracts.find((c) => c.id === id) ?? contracts[0];

// Example numbers so the page shows something on load. They are not market prices; the user replaces them.
export function defaultForm(contractId = "go1oz"): CalcForm {
  const c = getContract(contractId);
  return {
    contractId, intraday: false, side: "long", lots: "1", entry: c.quote === "USD" ? (c.id.startsWith("crude") || c.id.startsWith("brent") ? "70" : "2000") : "400000",
    usdPkr: "280", marginPct: String(c.marginPct), altPct: String(DEFAULT_ALT_PCT), broker: "ktrade", customCommission: "",
    salesTaxOnPmexFee: false, frontEndFee: false, sgf: false, accountPkr: "", maxRiskPct: "", stop: "", marginBufferPct: "50",
  };
}

// What the margin box should show after the contract or the intraday switch changes.
export function defaultMarginFor(contractId: string, intraday: boolean): string {
  const c = getContract(contractId);
  const m = intraday && c.intradayAllowed ? intradayMarginPct(c.marginPct) : c.marginPct;
  return String(Math.round(m * 1000) / 1000);
}

const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(/,/g, "")));

// The broker commission to use, or an error asking for it.
export function commissionFor(f: CalcForm): number {
  if (f.broker !== "custom") {
    const v = brokerPresets.find((b) => b.id === f.broker)?.perLot[f.contractId];
    if (v !== undefined) return v;
    throw new InputError("This broker preset has no rate for this contract. Pick Custom and enter your commission per lot per side.");
  }
  const v = num(f.customCommission);
  if (!(v >= 0)) throw new InputError("Enter your commission per lot per side (rupees), or 0.");
  return v;
}

export function toPosition(f: CalcForm): Position {
  const c = getContract(f.contractId);
  const equity = num(f.accountPkr);
  const p: Position = {
    contract: c, side: f.side, lots: num(f.lots), entry: num(f.entry), usdPkr: c.quote === "USD" ? num(f.usdPkr) : 1,
    marginPct: num(f.marginPct), altPct: num(f.altPct), brokerPerLotPkr: commissionFor(f),
    toggles: { salesTaxOnPmexFee: f.salesTaxOnPmexFee, frontEndFee: f.frontEndFee, sgf: f.sgf },
  };
  if (equity > 0) p.equityPkr = equity;
  validate(p);
  return p;
}

export interface CalcResult {
  position: Position;
  valueQuote: number;
  valuePkr: number;
  marginPkr: number;
  marginPctOfAccount: number | null;
  tick: ReturnType<typeof tickValue>;
  be: BreakEven;
  liq: Liquidation;
  moves: MoveRow[];
  sizing: Sizing | null;
  sizingError: string | null;
  fx: FxSensitivity;
  summary: string[];
}

export function calculate(f: CalcForm): { ok: true; r: CalcResult } | { ok: false; error: string } {
  try {
    const p = toPosition(f);
    const v = contractValue(p);
    const margin = initialMarginPkr(p);
    const account = num(f.accountPkr);
    const risk = num(f.maxRiskPct);
    const stop = num(f.stop);
    let sizing: Sizing | null = null;
    let sizingError: string | null = null;
    if (account > 0 && risk > 0 && stop > 0) {
      try {
        const { lots, equityPkr, ...base } = p;
        void lots; void equityPkr;
        const buf = num(f.marginBufferPct);
        sizing = positionSizing(base, { accountPkr: account, maxRiskPct: risk, stop, marginBufferPct: buf >= 0 && buf < 100 ? buf : 50 });
      } catch (e) {
        sizingError = e instanceof InputError ? e.message : "Could not size the position.";
      }
    }
    const be = breakEven(p);
    const liq = liquidation(p);
    return {
      ok: true,
      r: {
        position: p, valueQuote: v.quote, valuePkr: v.pkr, marginPkr: margin, marginPctOfAccount: account > 0 ? (margin / account) * 100 : null,
        tick: tickValue(p), be, liq, moves: moveTable(p), sizing, sizingError, fx: fxSensitivity(p, 1), summary: summary(p, be, liq),
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof InputError ? e.message : "Check the numbers you entered." };
  }
}
