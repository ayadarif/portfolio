# PMEX Contract Calculator: spec v1.1 (Nov 24, 2026, corrected after an independent fact-check)

## Purpose
A tool Ayad will actually use, and a portfolio project. Answers the questions a PMEX trader should ask before every trade: what does one contract really cost me, what does a tick move mean in rupees, where do I break even after all fees and taxes, how close am I to being auto-liquidated, and how many lots can I take without blowing my risk limit?

Rule: tools around trading (risk, discipline, information), never price prediction, signals or trade calls. Position sizing is phrased as "maximum lots under your inputs", never a recommendation.

## Key facts the maths must respect
- **USD/PKR does not move settled P&L.** PMEX settles each day's price change in PKR at that day's rate, so with no price move there's no P&L. USD/PKR changes (a) the rupee value of future ticks and (b) the rupee margin requirement, which can trigger a margin call with no price move.
- **Tola Gold is long-only.** No short selling; margin 25% initial, 15% maintenance; daily limit plus or minus 5%; weekly contracts; PKR-quoted (no USD/PKR conversion).
- **Auto-liquidation:** brokers liquidate when equity falls to about 55% of required margin. On gold oz at 2% margin, that's roughly a 0.9% adverse move. This is the headline output.

## Contract data (fact-checked Nov 24 against PMEX spec PDFs and broker sheets)

| Contract | Unit | Quoted in | Tick | Tick value | Settlement | Notes |
|---|---|---|---|---|---|---|
| Tola Gold | 1 tola (11.664 g) | PKR/tola | Re 1 | Re 1 | Physically backed; daily settlement by debit/credit of margin accounts; buyers may withdraw gold in 10-tola lots | Long only. 25% / 15% margin. Daily limit plus or minus 5%. Weekly |
| Milli Tola Gold | 0.001 tola | PKR/tola | Re 1 | per spec | As Tola Gold | Long only; 25% margin; flat PMEX fee |
| Gold 1 oz (GO1OZ) | 1 troy oz | USD/oz | $0.10 | $0.10 | Cash, PKR, daily mark-to-market | Final price from COMEX gold |
| Gold 10 oz (GO10OZ) | 10 troy oz | USD/oz | $0.10 | $1.00 | Cash, PKR, daily MTM | |
| Gold 100 oz | 100 troy oz | USD/oz | $0.10 | $10.00 | Cash, PKR, daily MTM | |
| Micro Gold | 0.01 oz | USD/oz | $0.10 | $0.001 | Cash, PKR, daily MTM | Flat PMEX fee |
| Crude Oil 10 bbl | 10 barrels | USD/bbl | $0.01 | $0.10 | Cash, PKR, daily MTM | Tracks NYMEX WTI. Rs 30 fee floor binds |
| Crude Oil 100 bbl | 100 barrels | USD/bbl | $0.01 | $1.00 | Cash, PKR, daily MTM | Confirmed via broker sheet only |
| Crude Oil 1000 bbl | 1000 barrels | USD/bbl | $0.01 | $10.00 | Cash, PKR, daily MTM | |
| Brent 10/100/1000 bbl | 10/100/1000 bbl | USD/bbl | $0.01 | $0.10/$1/$10 | Cash, PKR, daily MTM | ICE Brent reference |
| Custom | user-defined | any | user | user | | Second conversion rate for FX pairs not priced in USD |

Intraday (ID) versions of gold, silver and crude contracts carry about half the regular margin (1% floor): add an ID toggle.
Don't include (likely delisted): Gold kilo, Mini Gold 10 g, 50 and 100 Tola Gold.

**USD/PKR rate:** input labelled "PMEX/SBP USDPKR rate" (PMEX converts each day's settlement at an exchange-notified, SBP-based rate).

**FX contracts:** PMEX has no USD/PKR future (one trades on DGCX Dubai). PMEX lists cross-currency FX futures (EUR/USD, GBP/USD, USD/JPY, AUD/USD and crosses) in 10,000-unit lots, 1 basis point tick. Covered only by Custom in v1.

**Margin:** price x contract size x USDPKR x margin %. Margin % is set by PMEX from a 99% one-day VaR and changes with volatility; recomputed daily, so label output "approximate initial margin at entry". Defaults (broker sheet Oct 2024, labelled as such): gold oz 2%, crude 4.75%, Brent 5%, silver 3.5%, Tola 25%. Editable.

**Auto-liquidation threshold (ALT):** broker-set; default 55% of required margin (KTrade 2024, SCS Dec 2025). Editable.

## Fees and taxes (per side, each side on its own contract value)
| Item | Rate | Source and status |
|---|---|---|
| PMEX trading fee | 0.009% of contract value, Rs 30 floor | Since Oct 3, 2022. Not for Milli Tola or Micro Gold |
| PMEX flat fees | Micro Gold Rs 1; Milli Tola Rs 0.50 | PMEX notification May 2024 |
| SECP fee | 10% of PMEX fee | Verified |
| Investor Protection Fund | 1% of PMEX fee or Rs 1.25, whichever is lower | PMEX guide |
| Broker commission | per lot per side | Presets: KTrade Oct 2024 (GO1OZ Rs 45, GO10OZ Rs 400, GO100OZ Rs 2,250, CRUDE10 Rs 60, CRUDE100 Rs 500, CRUDE1000 Rs 4,500, Tola Rs 300); SCS Dec 2025 (GO1OZ Rs 25, CRUDE10 Rs 40, Tola Rs 50, GO100OZ Rs 2,000). Pre-tax |
| Sindh Sales Tax | 15% on broker commission; toggle for also applying it to the PMEX fee | Broker sheets |
| Front-end fee | 0.001% of traded value | Status unverified. Toggle, default off |
| SGF | 0.00031% | One broker sheet only. Toggle, default off |

Note only (not per trade): capital gains tax on PMEX futures (5% flat for tax years 2026 and 2027, secondary source); NCCPL CGT tariff; bank transfer charges.

## Layer 1 (build now)
Inputs: contract, regular or intraday, long or short (short disabled for Tola contracts), lots, entry price, USDPKR rate, margin %, ALT %, broker preset or custom fees, tax toggles. Optional: account size, max risk per trade (%), stop price.

Outputs:
1. Contract value in USD and PKR.
2. Approximate initial margin in PKR, and as % of account if given.
3. Tick value in PKR per lot and for the position.
4. Round-trip cost (all fees and taxes, both sides) in PKR, and the break-even move in price and ticks.
5. Liquidation distance: the adverse move (price, %, ticks) that takes equity to the ALT. Prominent.
6. Move table: P&L in PKR for adverse and favourable moves, and each as % of margin. Rows beyond liquidation read "auto-liquidated". For Tola Gold the table is capped at plus or minus 5%.
7. Position sizing: max lots = the smaller of (a) lots where loss at the stop plus fees stays within the risk limit and (b) lots whose margin fits the account with a buffer. Rounded down. Warning if the stop is beyond the liquidation distance. Caveat that USD contracts follow CME/ICE and can gap past a stop.
8. USD/PKR sensitivity: how PKR tick value and margin change if USDPKR moves 1%. States plainly: no effect on settled P&L.
9. Plain-English summary in 3 sentences.

Optional note: roll cost (an extra round trip) for holding past expiry.

## Tech
- Route /pmex-calculator. Pure browser, no data stored, no live prices (user types prices).
- Maths in src/lib/pmex.ts with unit tests. Contract specs and fees in one data file with source URL and date per row.
- Disclaimer: educational tool, not investment advice; specs, margins and fees change, so check with your broker. No PMEX or broker logos.

## Sources (primary unless noted)
- PMEX 1 oz gold spec: https://www.pmex.com.pk/wp-content/uploads/2019/09/PMEX-1-Ounce-Gold-Futures-Contract-Specification.pdf
- PMEX One Tola Gold spec (2024): https://pmex.com.pk/wp-content/uploads/2024/03/One-Tola-Gold-Futures-Contract-Specifications.pdf
- PMEX Milli Tola spec: https://pmex.com.pk/wp-content/uploads/2024/10/PMEX-Mili-Tola-Gold-Futures-Contract.pdf
- PMEX Crude 1000 bbl spec: https://www.pmex.com.pk/wp-content/uploads/2019/09/PMEX-Crude-Oil-1000-barrels-Futures-Contract-Specification.pdf
- PMEX trading guide: https://www.pmex.com.pk/wp-content/uploads/2019/09/A-Guide-to-Futures-Trading-at-PMEX-Updated-1.pdf
- PMEX fee reduction (May 2024): https://pmex.com.pk/wp-content/uploads/2024/05/PMEX-Notification-No.24-Fee-reduction-in-Milli-Micro-Gold-Futures-Contracts.pdf
- PMEX front-end fee: https://pmex.com.pk/wp-content/uploads/2024/06/PMEX-Notification-No.27-Front-End-Fee.pdf and https://pmex.com.pk/wp-content/uploads/2024/06/PMEX-Notification-No.30-Front-End-Fee-Update.pdf
- KTrade product sheet (Oct 2024, broker): https://www.kasb.com/wp-content/uploads/2024/10/KTrade-Product-Specification-Sheet-2024.pdf
- SCS commission structure (Dec 2025, broker): https://www.scstrade.com/documents/PMEX%20SCS%20Commission%20Structure%203-12-25.pdf
- SECP futures advisor licensing: https://www.secp.gov.pk/licensing/capital-markets/securities-advisors-and-futures-advisor/
