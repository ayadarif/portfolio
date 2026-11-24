import type { CalcResult } from "@/lib/pmex-calc";
import Ladder from "./Ladder";

const rs = (n: number, d = 0) => `${n < -0.5 * 10 ** -d ? "-" : ""}Rs ${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const num = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const card = "rounded-xl border border-zinc-200 p-4 dark:border-zinc-800";

export default function Results({ r }: { r: CalcResult }) {
  const p = r.position;
  const c = p.contract;
  const usd = c.quote === "USD";
  const f = r.be.entryFees;
  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-xl border-2 border-zinc-900 p-4 dark:border-zinc-100" aria-label="Auto-liquidation distance">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">Auto-liquidation distance</h2>
        {r.liq.alreadyBelow ? (
          <p className="mt-1 text-xl font-semibold">Already at or past the threshold with this equity.</p>
        ) : (
          <p className="mt-1 text-2xl font-semibold">
            {num(r.liq.movePct)}% against you ({num(r.liq.movePrice, c.tick < 0.1 ? 2 : 1)} {c.priceUnit}, {num(r.liq.moveTicks, 0)} ticks)
          </p>
        )}
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          The adverse move that takes equity of {rs(r.liq.equityPkr)} down to {p.altPct}% of required margin ({rs(r.liq.thresholdPkr)}). Price at that point: {num(r.liq.price)}. Approximate; the broker&apos;s own calculation decides.
        </p>
      </section>

      {c.maintenancePct !== undefined && (
        <p className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
          PMEX states a {c.maintenancePct}% maintenance margin for {c.name}. This calculator uses your broker&apos;s auto-liquidation threshold instead, and the distance above can be larger than the {c.dailyLimitPct}% daily limit, so a single day may not reach it.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className={card}>
          <h3 className="font-semibold">Size and margin</h3>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-4"><dt>Contract value</dt><dd>{usd ? `$${num(r.valueQuote)} / ` : ""}{rs(r.valuePkr)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Approximate initial margin at entry</dt><dd>{rs(r.marginPkr)}</dd></div>
            {r.marginPctOfAccount !== null && <div className="flex justify-between gap-4"><dt>Margin as % of account</dt><dd>{num(r.marginPctOfAccount, 1)}%</dd></div>}
            <div className="flex justify-between gap-4"><dt>Tick value per lot</dt><dd>{rs(r.tick.perLotPkr, 2)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Tick value, whole position</dt><dd>{rs(r.tick.positionPkr, 2)}</dd></div>
          </dl>
        </div>
        <div className={card}>
          <h3 className="font-semibold">Costs and break-even</h3>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-4"><dt>Entry side, all fees and taxes</dt><dd>{rs(f.total, 2)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Round trip, both sides</dt><dd>{rs(r.be.roundTripPkr, 2)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Break-even move</dt><dd>{num(r.be.movePrice, 3)} {c.priceUnit}</dd></div>
            <div className="flex justify-between gap-4"><dt>Break-even in ticks</dt><dd>{num(r.be.moveTicks, 1)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Break-even in percent</dt><dd>{num(r.be.movePct, 3)}%</dd></div>
          </dl>
          <details className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            <summary className="cursor-pointer">Entry fee breakdown</summary>
            <ul className="mt-1 space-y-0.5">
              <li>PMEX fee {rs(f.pmexFee, 2)}</li><li>SECP fee {rs(f.secpFee, 2)}</li><li>Investor Protection Fund {rs(f.ipf, 2)}</li>
              <li>Broker commission {rs(f.brokerCommission, 2)}</li><li>Sales tax {rs(f.salesTax, 2)}</li>
              {f.frontEnd > 0 && <li>Front-end fee {rs(f.frontEnd, 2)}</li>}{f.sgf > 0 && <li>SGF {rs(f.sgf, 2)}</li>}
            </ul>
          </details>
        </div>
      </section>

      <section>
        <h3 className="font-semibold">What a price move does</h3>
        <p className="text-xs text-zinc-500">
          P&amp;L in rupees for a move of the price from your entry{c.dailyLimitPct ? `, limited to plus or minus ${c.dailyLimitPct}% (the daily limit)` : ""}. Net is after round-trip fees at that exit price. Moves past the liquidation point show the loss at that point.
        </p>
        <div className="mt-2 overflow-x-auto" role="region" tabIndex={0} aria-label="Scrollable table">
          <table className="w-full min-w-[32rem] text-sm">
            <thead><tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
              <th className="py-2 pr-2">Move</th><th className="pr-2">Price</th><th className="pr-2">Gross P&amp;L</th><th className="pr-2">Net P&amp;L</th><th className="pr-2">% of margin</th><th>Note</th>
            </tr></thead>
            <tbody>
              {r.moves.map((m) => (
                <tr key={m.movePct} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2 pr-2">{m.movePct > 0 ? "+" : ""}{m.movePct}%</td><td className="pr-2">{num(m.price)}</td>
                  <td className="pr-2">{rs(m.grossPnlPkr)}</td><td className="pr-2">{rs(m.netPnlPkr)}</td>
                  <td className="pr-2">{num(m.pctOfMargin, 0)}%</td><td className="font-medium">{m.autoLiquidated ? "auto-liquidated" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Ladder ladder={r.ladder} priceUnit={c.priceUnit} tickLabel="ticks" />

      {(r.sizing || r.sizingError) && (
        <section className={card}>
          <h3 className="font-semibold">Maximum lots under your inputs</h3>
          {r.sizingError ? <p className="mt-1 text-sm">{r.sizingError}</p> : r.sizing && (
            <>
              <p className="mt-1 text-2xl font-semibold">{r.sizing.maxLots} lot{r.sizing.maxLots === 1 ? "" : "s"}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Limited by {r.sizing.limitedBy}: the risk limit allows {num(r.sizing.byRisk)} lots (budget {rs(r.sizing.riskBudgetPkr)}, loss per lot at the stop {rs(r.sizing.lossPerLotAtStopPkr)} including fees); margin allows {num(r.sizing.byMargin)}. Rounded down. This is a limit calculation, not a suggestion to trade that size.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{r.sizing.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </>
          )}
        </section>
      )}

      <section className={card}>
        <h3 className="font-semibold">If USD/PKR moves 1%</h3>
        {r.fx.applies ? (
          <p className="mt-1 text-sm">
            Tick value on the position goes from {rs(r.fx.tickValueNowPkr, 2)} to {rs(r.fx.tickValueAfterPkr, 2)}. Required margin goes from {rs(r.fx.marginNowPkr)} to {rs(r.fx.marginAfterPkr)} ({r.fx.marginChangePkr >= 0 ? "+" : ""}{rs(r.fx.marginChangePkr)}), which can trigger a margin call with no price move at all. P&amp;L already settled does not change: PMEX settles each day&apos;s price change at that day&apos;s rate.
          </p>
        ) : <p className="mt-1 text-sm">This contract is priced in rupees, so USD/PKR does not enter.</p>}
      </section>

      <section className={card}>
        <h3 className="font-semibold">In three sentences</h3>
        <p className="mt-1 text-sm leading-6">{r.summary.join(" ")}</p>
      </section>
    </div>
  );
}
