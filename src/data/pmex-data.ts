// PMEX contract specs, margin defaults, fee rates and broker presets for the calculator.
// One row per fact, each with a source URL, a date and a status, so any number can be traced in one step.
// Specs, margins and fees change. Margin % in particular is set by PMEX and recomputed from volatility, so every
// margin here is an editable default. Nothing here is a quote: users type their own prices.
// Written 2026-11-24 from docs/pmex-calculator-spec.md v1.1 (fact-checked that day against PMEX PDFs and broker sheets).

export type Status = "primary" | "broker sheet" | "secondary" | "unverified" | "assumed";

export interface Sourced {
  source: string; // short label
  url: string;
  asOf: string; // date of the document or of our check
  status: Status;
}

export interface Contract extends Sourced {
  id: string;
  name: string;
  unit: string; // what one lot is, e.g. "1 troy oz"
  size: number; // quantity per lot, in the contract's own unit (oz, bbl, tola)
  quote: "USD" | "PKR"; // currency the price is quoted in
  priceUnit: string; // e.g. "USD/oz"
  tick: number; // smallest price step, in price units
  marginPct: number; // default initial margin, percent of contract value
  maintenancePct?: number; // only where PMEX states one (Tola Gold)
  longOnly: boolean;
  intradayAllowed: boolean;
  dailyLimitPct?: number; // plus or minus, percent
  feeKind: "percent" | "flat"; // percent: 0.009% of value with a floor; flat: a fixed PMEX fee per lot per side
  flatFeePkr?: number;
  notes: string;
}

const PMEX = "https://www.pmex.com.pk/wp-content/uploads/";
const BROKER = "https://www.kasb.com/wp-content/uploads/2024/10/KTrade-Product-Specification-Sheet-2024.pdf";

export const contracts: Contract[] = [
  {
    id: "tola", name: "Tola Gold", unit: "1 tola (11.664 g)", size: 1, quote: "PKR", priceUnit: "PKR/tola", tick: 1,
    marginPct: 25, maintenancePct: 15, longOnly: true, intradayAllowed: false, dailyLimitPct: 5, feeKind: "percent",
    notes: "Long only. Weekly contracts. Priced in rupees, so USD/PKR does not enter.",
    source: "PMEX One Tola Gold spec (2024)", url: "https://pmex.com.pk/wp-content/uploads/2024/03/One-Tola-Gold-Futures-Contract-Specifications.pdf", asOf: "2024-03", status: "primary",
  },
  {
    id: "milli_tola", name: "Milli Tola Gold", unit: "0.001 tola", size: 0.001, quote: "PKR", priceUnit: "PKR/tola", tick: 1,
    marginPct: 25, longOnly: true, intradayAllowed: false, dailyLimitPct: 5, feeKind: "flat", flatFeePkr: 0.5,
    notes: "Long only. Flat PMEX fee of Rs 0.50 per lot per side (SECP and IPF applied on top; not confirmed). Daily limit assumed to match Tola Gold.",
    source: "PMEX Milli Tola spec and fee notification No. 24 (daily limit assumed)", url: "https://pmex.com.pk/wp-content/uploads/2024/10/PMEX-Mili-Tola-Gold-Futures-Contract.pdf", asOf: "2024-10", status: "assumed",
  },
  {
    id: "go1oz", name: "Gold 1 oz (GO1OZ)", unit: "1 troy oz", size: 1, quote: "USD", priceUnit: "USD/oz", tick: 0.1,
    marginPct: 2, longOnly: false, intradayAllowed: true, feeKind: "percent",
    notes: "Cash settled in PKR daily. Final price follows COMEX gold. Margin default is the broker sheet's.",
    source: "PMEX 1 oz Gold spec; margin from KTrade sheet", url: PMEX + "2019/09/PMEX-1-Ounce-Gold-Futures-Contract-Specification.pdf", asOf: "2024-10", status: "primary",
  },
  {
    id: "go10oz", name: "Gold 10 oz (GO10OZ)", unit: "10 troy oz", size: 10, quote: "USD", priceUnit: "USD/oz", tick: 0.1,
    marginPct: 2, longOnly: false, intradayAllowed: true, feeKind: "percent",
    notes: "As GO1OZ, ten times the size.", source: "KTrade product sheet", url: BROKER, asOf: "2024-10", status: "broker sheet",
  },
  {
    id: "go100oz", name: "Gold 100 oz", unit: "100 troy oz", size: 100, quote: "USD", priceUnit: "USD/oz", tick: 0.1,
    marginPct: 2, longOnly: false, intradayAllowed: true, feeKind: "percent",
    notes: "As GO1OZ, one hundred times the size.", source: "KTrade product sheet", url: BROKER, asOf: "2024-10", status: "broker sheet",
  },
  {
    id: "micro_gold", name: "Micro Gold", unit: "0.01 troy oz", size: 0.01, quote: "USD", priceUnit: "USD/oz", tick: 0.1,
    marginPct: 2, longOnly: false, intradayAllowed: true, feeKind: "flat", flatFeePkr: 1,
    notes: "Flat PMEX fee of Rs 1 per lot per side (SECP and IPF are applied on top of it; the spec does not say they are). Margin default assumed equal to the other gold contracts; check with your broker.",
    source: "PMEX fee notification No. 24 (May 2024); margin assumed", url: "https://pmex.com.pk/wp-content/uploads/2024/05/PMEX-Notification-No.24-Fee-reduction-in-Milli-Micro-Gold-Futures-Contracts.pdf", asOf: "2024-05", status: "assumed",
  },
  {
    id: "crude10", name: "Crude Oil 10 bbl (CRUDE10)", unit: "10 barrels", size: 10, quote: "USD", priceUnit: "USD/bbl", tick: 0.01,
    marginPct: 4.75, longOnly: false, intradayAllowed: true, feeKind: "percent",
    notes: "Tracks NYMEX WTI. The Rs 30 fee floor usually binds at this size.",
    source: "KTrade product sheet", url: BROKER, asOf: "2024-10", status: "broker sheet",
  },
  {
    id: "crude100", name: "Crude Oil 100 bbl", unit: "100 barrels", size: 100, quote: "USD", priceUnit: "USD/bbl", tick: 0.01,
    marginPct: 4.75, longOnly: false, intradayAllowed: true, feeKind: "percent",
    notes: "Confirmed via broker sheet only.", source: "KTrade product sheet", url: BROKER, asOf: "2024-10", status: "broker sheet",
  },
  {
    id: "crude1000", name: "Crude Oil 1000 bbl", unit: "1000 barrels", size: 1000, quote: "USD", priceUnit: "USD/bbl", tick: 0.01,
    marginPct: 4.75, longOnly: false, intradayAllowed: true, feeKind: "percent",
    notes: "", source: "PMEX Crude 1000 bbl spec; margin from KTrade sheet", url: PMEX + "2019/09/PMEX-Crude-Oil-1000-barrels-Futures-Contract-Specification.pdf", asOf: "2024-10", status: "primary",
  },
  {
    id: "brent10", name: "Brent 10 bbl", unit: "10 barrels", size: 10, quote: "USD", priceUnit: "USD/bbl", tick: 0.01,
    marginPct: 5, longOnly: false, intradayAllowed: true, feeKind: "percent",
    notes: "ICE Brent reference.", source: "KTrade product sheet", url: BROKER, asOf: "2024-10", status: "broker sheet",
  },
  {
    id: "brent100", name: "Brent 100 bbl", unit: "100 barrels", size: 100, quote: "USD", priceUnit: "USD/bbl", tick: 0.01,
    marginPct: 5, longOnly: false, intradayAllowed: true, feeKind: "percent",
    notes: "ICE Brent reference.", source: "KTrade product sheet", url: BROKER, asOf: "2024-10", status: "broker sheet",
  },
  {
    id: "brent1000", name: "Brent 1000 bbl", unit: "1000 barrels", size: 1000, quote: "USD", priceUnit: "USD/bbl", tick: 0.01,
    marginPct: 5, longOnly: false, intradayAllowed: true, feeKind: "percent",
    notes: "ICE Brent reference.", source: "KTrade product sheet", url: BROKER, asOf: "2024-10", status: "broker sheet",
  },
];

// Fees and taxes: per side, each side on its own contract value.
export interface Fees extends Sourced {
  pmexFeeRate: number; // fraction of contract value
  pmexFeeFloorPkr: number; // per lot per side (interpretation, see note)
  secpShareOfPmexFee: number; // fraction of the PMEX fee
  ipfShareOfPmexFee: number; // fraction of the PMEX fee
  ipfCapPkr: number; // the lower of the share and this cap
  salesTaxOnBroker: number; // fraction of broker commission
  frontEndFeeRate: number; // fraction of traded value; toggle, default off
  sgfRate: number; // fraction of traded value; toggle, default off
  note: string;
}

export const fees: Fees = {
  pmexFeeRate: 0.00009, pmexFeeFloorPkr: 30, secpShareOfPmexFee: 0.1, ipfShareOfPmexFee: 0.01, ipfCapPkr: 1.25,
  salesTaxOnBroker: 0.15, frontEndFeeRate: 0.00001, sgfRate: 0.0000031,
  note: "PMEX fee 0.009% with a Rs 30 floor since Oct 2022; whether the floor is per lot or per order is read here as per lot per side and is unverified until checked against a real statement. SECP fee 10% of the PMEX fee. IPF 1% of the PMEX fee or Rs 1.25, whichever is lower. Front-end fee 0.001% and SGF 0.00031% are unverified, so they default off.",
  source: "PMEX trading guide, PMEX notifications 24, 27 and 30, broker sheets", url: "https://www.pmex.com.pk/wp-content/uploads/2019/09/A-Guide-to-Futures-Trading-at-PMEX-Updated-1.pdf", asOf: "2026-11-24", status: "secondary",
};

// Broker commission per lot per side, in rupees, before sales tax.
export interface BrokerPreset extends Sourced {
  id: string;
  name: string;
  perLot: Record<string, number>; // contract id -> rupees per lot per side
}

export const brokerPresets: BrokerPreset[] = [
  {
    id: "ktrade", name: "KTrade (Oct 2024)", source: "KTrade product specification sheet", url: BROKER, asOf: "2024-10", status: "broker sheet",
    perLot: { go1oz: 45, go10oz: 400, go100oz: 2250, crude10: 60, crude100: 500, crude1000: 4500, tola: 300 },
  },
  {
    id: "scs", name: "SCS (Dec 2025)", source: "SCS PMEX commission structure", url: "https://www.scstrade.com/documents/PMEX%20SCS%20Commission%20Structure%203-12-25.pdf", asOf: "2025-12", status: "broker sheet",
    perLot: { go1oz: 25, crude10: 40, tola: 50, go100oz: 2000 },
  },
];

export const DEFAULT_ALT_PCT = 55; // broker auto-liquidation threshold, percent of required margin (KTrade 2024, SCS Dec 2025)
export const ALT_SOURCE: Sourced = { source: "KTrade 2024, SCS Dec 2025 broker sheets", url: BROKER, asOf: "2025-12", status: "broker sheet" };

// Intraday versions carry about half the regular margin, with a floor of 1%.
export const INTRADAY_FACTOR = 0.5;
export const INTRADAY_MARGIN_FLOOR_PCT = 1;

// Facts shown as notes only; they are not part of any per-trade calculation.
export const notIncludedNotes: string[] = [
  "Capital gains tax on PMEX futures: 5% flat for tax years 2026 and 2027 (secondary source). Not included.",
  "NCCPL CGT tariff and bank transfer charges are not included.",
];
