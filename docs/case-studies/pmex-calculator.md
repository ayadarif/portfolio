# Case study draft: PMEX contract calculator

Status: draft for Ayad. Not published on the site. "What I learned" is yours. The real-trade check is not done, so no accuracy claim about fees yet.

## Problem
Before a PMEX futures trade, the questions that matter are about risk: what the position costs in margin and fees, what a tick is worth in rupees, where the trade breaks even, and how far price can move against you before the broker closes the position. The numbers are scattered across exchange PDFs and broker sheets, and USD/PKR adds a layer most people get wrong (it moves rupee margin and tick value, not already settled P&L).

## What I did
Built a calculator that answers those questions for PMEX gold, crude and Brent contracts, in the browser, with no live prices and nothing stored.
- Every contract spec, margin default, fee and broker commission preset (KTrade, SCS) lives in one data file with a source link, a date and a status per row.
- The maths is a separate module with unit tests: margin, tick value in rupees, all fees and taxes both sides, break-even move, liquidation distance, a move table, maximum lots under your own risk limit, and USD/PKR sensitivity.
- Tests pin the rules that are easy to get wrong: Tola Gold has no short side and a 5% daily limit; the Rs 30 fee floor binds on CRUDE10; gold at 2% margin and a 55% threshold liquidates at about 0.91% adverse; USD/PKR changes tick value and margin but not settled P&L.
- It is a risk tool by design: no predictions, no signals, sizing phrased as "maximum lots under your inputs".

## Results
- Live at /pmex-calculator on the portfolio preview.
- Fee model checked against the spec and broker sheets, not yet against a real statement (waiting on one; the test is written and skipped).
- Margins and the auto-liquidation threshold are dated, editable defaults, because PMEX and brokers change them.

## What I learned
(Yours to write.) Prompts: what changed in how you think about USD/PKR once you had to write the test? How far was the exact liquidation distance from the 0.9% rule of thumb, and does the difference matter? What does your own trading look like through this tool?
