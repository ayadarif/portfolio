# Learn: PMEX contract calculator

For a PM who reads Python and some TypeScript. It is a risk tool: it answers questions you should ask before a trade and never predicts a price or suggests a trade.

## 0. The five questions it answers

1. What does one contract really cost me (margin, fees)?
2. What is one tick worth in rupees?
3. Where do I break even after all fees and taxes?
4. How far can price move against me before the broker closes the position (auto-liquidation)?
5. How many lots can I take under my own risk limit? (Phrased as "maximum lots under your inputs".)

## 1. Files

| File | Role |
|---|---|
| `src/data/pmex-data.ts` | Every contract spec, margin default, fee rate and broker preset. Each row carries a source URL, a date and a status (primary, broker sheet, secondary, unverified, assumed). The only place numbers live. |
| `src/lib/pmex.ts` | All the maths. Pure functions, no UI. |
| `src/lib/pmex-calc.ts` | Turns the form (strings) into a `Position` (numbers), runs everything once, returns results or a plain error. |
| `src/components/pmex/Calculator.tsx` | The form. A client component (it holds state in the browser). |
| `src/components/pmex/Results.tsx` | Shows the results. No state. |
| `src/app/pmex-calculator/page.tsx` | The page shell. |
| `src/lib/pmex.test.ts`, `src/components/pmex/Calculator.test.tsx` | Tests. |

Why one data file: any number on the page can be traced to a row, and a fee change is a one-line edit. It follows your rule that no number is hard-coded inside a calculation.

## 2. Facts the maths must respect

- **USD/PKR does not move settled P&L.** PMEX books each day's price change at that day's rate. With no price move there is no P&L. A rate change does two other things: it changes the rupee value of future ticks, and it changes the rupee margin requirement (so you can get a margin call with no price move).
- **Tola Gold is long only**, priced in rupees, with a 5% daily limit. The check lives in `validate()` in the maths, not only in the form.
- **Auto-liquidation:** brokers close the position when equity falls to about 55% of required margin.

## 3. The formulas, one by one

Let `k = size x lots x fx` (rupees per 1.00 of price move; fx is 1 for rupee-quoted contracts).

- **Contract value** = entry x size x lots (x fx for USD contracts).
- **Initial margin** = contract value in rupees x margin% / 100. Margin % is set by PMEX from volatility and changes, so it is an editable default.
- **Tick value** = tick x size (x fx). Gold 1 oz: $0.10 x Rs 280 = Rs 28 per lot.
- **Fees, per side, per lot** (`sideFees`):
  - PMEX fee = 0.009% of the lot's value, with a Rs 30 minimum. Micro Gold and Milli Tola pay flat Rs 1 and Rs 0.50.
  - SECP fee = 10% of the PMEX fee. Investor Protection Fund = 1% of the PMEX fee or Rs 1.25, whichever is lower.
  - Broker commission (preset or your own) plus Sindh sales tax of 15% on it (a toggle adds the tax on the PMEX fee too).
  - Front-end fee and SGF are toggles, off by default, because their status is unverified.
  - Example, CRUDE10 at $70 and Rs 280: 0.009% of Rs 196,000 is Rs 17.64, below the floor, so the PMEX fee is Rs 30. With KTrade's Rs 60 commission one side costs 30 + 3 + 0.30 + 60 + 9 = Rs 102.30.
- **Break-even** (`breakEven`): the favourable move that earns back the round-trip fees. The exit fee depends on the exit price, which depends on the move, so the code repeats the calculation until it stops changing (it settles in a few passes). Break-even ticks = move / tick.
- **Liquidation distance** (`liquidation`): the adverse move x where equity hits the threshold. Required margin is recomputed at the new price, so for a long: equity - x k = ALT x m x (entry - x) x k, which solves to x = (equity - ALT x m x entry x k) / (k (1 - ALT x m)). With equity equal to the initial margin, gold at 2% margin and a 55% ALT: x / entry = 0.02 x 0.45 / (1 - 0.011) = 0.910%. The spec's "about 0.9%" is the shortcut 2% x 45%. The exact figure is slightly higher for a long and slightly lower for a short (0.890%).
- **Move table** (`moveTable`): P&L for set moves, gross and net of fees. Rows past the liquidation distance say "auto-liquidated" and show the loss at that point, not the larger loss the price move alone would give.
- **Position sizing** (`positionSizing`): max lots = the smaller of (a) risk budget / loss per lot at the stop, where loss includes fees both sides, and (b) account x (1 - buffer) / margin per lot. Rounded down. It warns when the stop is further than the liquidation distance at that size, and always warns that USD contracts can gap past a stop.
- **USD/PKR sensitivity** (`fxSensitivity`): a 1% rate move raises tick value and margin by 1% for USD contracts, and changes settled P&L by 0.

## 4. Decisions to be able to defend

1. Exact liquidation algebra rather than the 0.9% shortcut: it matches how brokers recompute margin.
2. Equity defaults to the initial margin when no account size is given, because that is the case behind the spec's headline figure.
3. The Rs 30 floor is applied per lot per side. The spec does not say lot or order. Flagged as unverified until a real statement is checked (NEEDS_AYAD item 11).
4. Short is blocked in the maths for long-only contracts, so a form bug can't produce a short Tola.
5. Margins and ALT are visible, editable and dated, not hidden constants.
6. No live prices and no storage: you type the price, nothing leaves the browser.
7. "Maximum lots under your inputs", never "you should take N lots".

## 5. Limits

- Margin %, fees and rules change; check with the broker.
- The fee model has not been checked against a real statement yet. The skipped test `real-trade check` is waiting for one.
- It models a single position, not a portfolio, and ignores roll costs, capital gains tax and bank charges.
- Liquidation is the broker's call; the figure is an approximation.

## 6. Quiz (10 questions)

1. Why does a USD/PKR move not change P&L that has already settled?
2. Name two things a USD/PKR move does change.
3. Why is the liquidation distance for gold at 2% margin and a 55% ALT not exactly 0.9%?
4. Why is a short liquidated by a smaller percent move than a long, all else equal?
5. On CRUDE10 at $70 and Rs 280, which part of the PMEX fee binds, and what is the fee?
6. Why does the break-even code loop instead of one division?
7. What are the two limits in position sizing, and which one wins?
8. Why does the move table cap the loss on auto-liquidated rows?
9. Why is Short disabled for Tola Gold in the maths and not just the form?
10. What is the one thing a real broker statement would let you check?

## Answers

1. PMEX books each day's price change in rupees at that day's rate. No price move means nothing to book, and a later rate change does not rewrite past days.
2. The rupee value of future ticks, and the rupee margin requirement (which can cause a margin call with no price move).
3. Required margin is recomputed at the lower price, so it shrinks as the long loses. The exact result is 0.910%; 0.9% is the quick estimate.
4. A short loses when the price rises, which raises the required margin as it loses, so the threshold is hit sooner in percent terms (0.890% against 0.910%).
5. The Rs 30 floor: 0.009% of Rs 196,000 is Rs 17.64. The PMEX fee is Rs 30.
6. The exit fee depends on the exit price, which depends on the move being solved for. Repeating the calculation converges quickly.
7. Risk (budget over loss per lot at the stop, with fees) and margin (account after buffer over margin per lot). The smaller wins, rounded down.
8. The broker closes the position there, so the loss stops at that point instead of following the price further.
9. So no other part of the code, or a future form change, can produce an impossible position.
10. Whether the fee model, including the per-lot reading of the Rs 30 floor, matches what was actually charged, to the rupee.

## 6b. The margin-call ladder (phase 2)

A table of price levels against your position, in equal tick steps. For each level it shows equity (account money plus the loss so far), the margin required at that price, their ratio, and a status: OK (equity at or above required margin), Margin call (below it), Auto-liquidated (at or below your broker's threshold times required margin). It also shows the cash that would restore the margin.

Second axis: USD/PKR up 1%, 3% or 5%, applied first. The rate rises, so the rupee margin rises and every later tick costs more rupees, even with price standing still. Profit or loss already settled does not change. Example in the tests: equity equal to the margin at a flat price becomes a margin call after a 5% rate shock, needing 5% of the margin in cash.

What it is not: a forecast. There is no probability of price reaching a level, because that needs a verified formula and a volatility input; it is deferred. "Margin call at required margin" is an assumption (brokers differ) and the page says so. Tola Gold is long only and the ladder stops at its 5% daily limit.

