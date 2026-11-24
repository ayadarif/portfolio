# 0004. PMEX: deterministic stress, no live prices, no touch probability

Date: 2026-11-24. Roadmap P6.

## Context
Giving futures advice is a licensed activity in Pakistan (SECP, Futures Market Act 2016). Live price feeds from broker terminals would breach their terms; some benchmark gold series are not openly licensed.

## Options
1. Probability of touching the liquidation level (needs volatility, a barrier formula, drift choice).
2. Live prices from a feed.
3. A deterministic ladder of price levels and USD/PKR shocks, with prices typed by the user.

## Decision
Option 3. The ladder makes no forecast and needs no data. Touch probability is deferred until the barrier formula is verified against a primary source, and would keep drift at zero and show a sensitivity table, not one number. No live prices; example prices are labelled as examples.

## Consequences
The tool cannot say how likely a margin call is, only what one looks like. Copy stays descriptive and the page footer names the SECP licensing regime.
