"use client";

import { useMemo, useState } from "react";
import { brokerPresets, contracts, fees, notIncludedNotes } from "@/data/pmex-data";
import { calculate, defaultForm, defaultMarginFor, getContract, type CalcForm } from "@/lib/pmex-calc";
import { Field, inputCls } from "@/components/readout/Field";
import Results from "./Results";

export default function Calculator() {
  const [f, setF] = useState<CalcForm>(defaultForm());
  const c = getContract(f.contractId);
  const set = <K extends keyof CalcForm>(k: K, v: CalcForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const out = useMemo(() => calculate(f), [f]);

  function pickContract(id: string) {
    const next = getContract(id);
    const intraday = f.intraday && next.intradayAllowed;
    setF({ ...defaultForm(id), intraday, side: next.longOnly ? "long" : f.side, marginPct: defaultMarginFor(id, intraday), broker: f.broker, usdPkr: f.usdPkr,
      altPct: f.altPct, accountPkr: f.accountPkr, maxRiskPct: f.maxRiskPct, marginBufferPct: f.marginBufferPct, salesTaxOnPmexFee: f.salesTaxOnPmexFee, frontEndFee: f.frontEndFee, sgf: f.sgf });
  }

  const check = "h-4 w-4 accent-zinc-700";
  return (
    <div>
      <p className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
        The prices and the USD/PKR rate shown are examples, not market data. Type your own. Margins, fees and rules change, so check them with your broker.
      </p>
      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <Field label="Contract">
          <select className={inputCls} value={f.contractId} onChange={(e) => pickContract(e.target.value)}>
            {contracts.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        </Field>
        <Field label="Side" hint={c.longOnly ? `${c.name} has no short side.` : undefined}>
          <select className={inputCls} value={f.side} onChange={(e) => set("side", e.target.value as "long" | "short")}>
            <option value="long">Long (profits if price rises)</option>
            <option value="short" disabled={c.longOnly}>Short (profits if price falls)</option>
          </select>
        </Field>
        <Field label="Lots"><input className={inputCls} inputMode="decimal" value={f.lots} onChange={(e) => set("lots", e.target.value)} /></Field>
        <Field label={`Entry price (${c.priceUnit})`}><input className={inputCls} inputMode="decimal" value={f.entry} onChange={(e) => set("entry", e.target.value)} /></Field>
        {c.quote === "USD" && (
          <Field label="PMEX/SBP USDPKR rate" hint="PMEX converts each day's settlement at an exchange-notified, SBP-based rate.">
            <input className={inputCls} inputMode="decimal" value={f.usdPkr} onChange={(e) => set("usdPkr", e.target.value)} />
          </Field>
        )}
        <Field label="Initial margin (% of contract value)" hint="Set by PMEX and recomputed daily from volatility. Edit it to match your broker today.">
          <input className={inputCls} inputMode="decimal" value={f.marginPct} onChange={(e) => set("marginPct", e.target.value)} />
        </Field>
        <Field label="Auto-liquidation threshold (% of required margin)" hint="Broker-set. 55 is the default on the KTrade 2024 and SCS Dec 2025 sheets.">
          <input className={inputCls} inputMode="decimal" value={f.altPct} onChange={(e) => set("altPct", e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" className={check} checked={f.intraday} disabled={!c.intradayAllowed}
            onChange={(e) => setF((x) => ({ ...x, intraday: e.target.checked, marginPct: defaultMarginFor(x.contractId, e.target.checked) }))} />
          Intraday version (about half the regular margin, 1% floor){!c.intradayAllowed && " (not offered for this contract)"}
        </label>
        <Field label="Broker commission preset">
          <select className={inputCls} value={f.broker} onChange={(e) => set("broker", e.target.value)}>
            {brokerPresets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            <option value="custom">Custom</option>
          </select>
        </Field>
        {f.broker === "custom" && (
          <Field label="Commission per lot per side (Rs, before tax)"><input className={inputCls} inputMode="decimal" value={f.customCommission} onChange={(e) => set("customCommission", e.target.value)} /></Field>
        )}
        <fieldset className="space-y-1 text-sm sm:col-span-2">
          <legend className="font-medium">Fee toggles</legend>
          <label className="flex items-center gap-2"><input type="checkbox" className={check} checked={f.salesTaxOnPmexFee} onChange={(e) => set("salesTaxOnPmexFee", e.target.checked)} />Also charge Sindh sales tax (15%) on the PMEX fee</label>
          <label className="flex items-center gap-2"><input type="checkbox" className={check} checked={f.frontEndFee} onChange={(e) => set("frontEndFee", e.target.checked)} />Front-end fee 0.001% of traded value (status unverified)</label>
          <label className="flex items-center gap-2"><input type="checkbox" className={check} checked={f.sgf} onChange={(e) => set("sgf", e.target.checked)} />SGF 0.00031% of traded value (one broker sheet only)</label>
        </fieldset>
        <div className="sm:col-span-2">
          <h2 className="text-base font-semibold">Optional: account and sizing</h2>
          <p className="text-xs text-zinc-500">An account size changes the liquidation distance (more cash, more room). Account, risk and stop together give the maximum lots under your limits.</p>
        </div>
        <Field label="Account equity (Rs)"><input className={inputCls} inputMode="decimal" value={f.accountPkr} onChange={(e) => set("accountPkr", e.target.value)} /></Field>
        <Field label="Max risk per trade (% of account)"><input className={inputCls} inputMode="decimal" value={f.maxRiskPct} onChange={(e) => set("maxRiskPct", e.target.value)} /></Field>
        <Field label={`Stop price (${c.priceUnit})`}><input className={inputCls} inputMode="decimal" value={f.stop} onChange={(e) => set("stop", e.target.value)} /></Field>
        <Field label="Share of account kept free of margin (%)"><input className={inputCls} inputMode="decimal" value={f.marginBufferPct} onChange={(e) => set("marginBufferPct", e.target.value)} /></Field>
      </form>

      {out.ok ? <Results r={out.r} /> : <p role="alert" className="mt-6 rounded-lg border border-amber-500 p-3 text-sm">{out.error}</p>}

      <section className="mt-12 border-t border-zinc-200 pt-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <h2 className="text-base font-semibold text-foreground">Sources, status and limits</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Contract specs, margin defaults and fees live in one data file (src/data/pmex-data.ts), each row with a source link, date and status.</li>
          <li>Selected contract: {c.name}. Source: <a className="underline" href={c.url}>{c.source}</a>, as of {c.asOf} ({c.status}). {c.notes}</li>
          <li>Fees: {fees.note}</li>
          {notIncludedNotes.map((n) => <li key={n}>{n}</li>)}
          <li>Educational tool, not investment advice. It never predicts prices or suggests trades. No live prices; nothing you type is stored or sent anywhere.</li>
        </ul>
      </section>
    </div>
  );
}
