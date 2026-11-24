"use client";

// Margin-call and liquidation ladder: price levels against the position in tick steps, one table per USD/PKR shock.
import { useState } from "react";
import type { Ladder as L, LadderStatus } from "@/lib/pmex";

const rs = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;
const num = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const badge: Record<LadderStatus, string> = {
  OK: "text-emerald-800 dark:text-emerald-300",
  "Margin call": "text-amber-800 dark:text-amber-300",
  "Auto-liquidated": "text-red-800 dark:text-red-300",
};

export default function Ladder({ ladder, priceUnit, tickLabel }: { ladder: L; priceUnit: string; tickLabel: string }) {
  const [i, setI] = useState(0);
  const multi = ladder.blocks.length > 1;
  const b = ladder.blocks[Math.min(i, ladder.blocks.length - 1)];
  const first = (s: LadderStatus) => b.rows.find((r) => r.status === s);
  const mc = first("Margin call"), liq = first("Auto-liquidated");
  return (
    <section aria-labelledby="ladder-h">
      <h3 id="ladder-h" className="font-semibold">Margin-call ladder</h3>
      <p className="text-xs text-zinc-500">
        Price levels against your position in steps of {num(ladder.stepTicks, 0)} {tickLabel}. Shows what happens to equity and required margin, with no view on whether price will go there.
        {multi && " The USD/PKR shock is applied first; it raises the rupee margin and the rupee cost of every later tick, but not profit or loss already settled."}
      </p>
      {multi && (
        <div role="group" aria-label="USD/PKR shock" className="mt-3 flex flex-wrap gap-2">
          {ladder.blocks.map((x, k) => (
            <button key={x.fxShockPct} type="button" aria-pressed={k === i} onClick={() => setI(k)}
              className={`min-h-8 rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700 ${k === i ? "bg-accent-soft font-medium" : ""}`}>
              {x.fxShockPct === 0 ? "No shock" : `USD/PKR +${x.fxShockPct}%`}
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-sm" role="status">
        {multi && <>USD/PKR {num(b.usdPkr)}. </>}
        {mc ? <>Margin call from {num(mc.price)} {priceUnit} ({num(mc.movePct)}% against you). </> : <>No margin call within this range. </>}
        {liq ? <>Auto-liquidated from {num(liq.price)} {priceUnit} ({num(liq.movePct)}% against you).</> : <>No auto-liquidation within this range.</>}
      </p>
      <div role="region" aria-label="Margin-call ladder table" tabIndex={0} className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead><tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
            <th scope="col" className="py-2 pr-2">Against you</th><th scope="col" className="pr-2">Price</th><th scope="col" className="pr-2">Equity</th>
            <th scope="col" className="pr-2">Required margin</th><th scope="col" className="pr-2">Equity / margin</th><th scope="col" className="pr-2">Status</th><th scope="col">Cash to restore margin</th>
          </tr></thead>
          <tbody>
            {b.rows.map((r) => (
              <tr key={r.ticks} className="border-b border-zinc-100 dark:border-zinc-900">
                <th scope="row" className="py-2 pr-2 text-left font-normal">{num(r.ticks, 0)} {tickLabel} ({num(r.movePct)}%)</th>
                <td className="pr-2">{num(r.price)}</td><td className="pr-2">{rs(r.equityPkr)}</td><td className="pr-2">{rs(r.requiredMarginPkr)}</td>
                <td className="pr-2">{num(r.ratio * 100, 0)}%</td><td className={`pr-2 font-medium ${badge[r.status]}`}>{r.status}</td>
                <td>{r.status === "Auto-liquidated" ? "position closed" : r.topUpPkr > 0 ? rs(r.topUpPkr) : "none"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ladder.stoppedAtDailyLimit && <p className="mt-2 text-xs text-zinc-500">The table stops at the contract&apos;s daily price limit.</p>}
      <p className="mt-2 text-xs text-zinc-500">{ladder.assumption}</p>
    </section>
  );
}
