# Experiment Readout: spec

Free in-browser tool at /experiment-readout. Saved 2026-11-24 from Ayad's brief.

## Spec summary

- User sets up the test BEFORE adding results: name, hypothesis, primary metric, planned split (default 50/50), planned sample size per variant (or calculate it from baseline rate + minimum lift they care about), confidence level (default 95%). Optional: monthly users and value per conversion for business impact.
- Results: CSV upload or paste, format date,variant,users,conversions (daily rows). Also accept one row per variant without dates. Two variants only.
- Stats: conversion rate per variant with 95% CI; absolute and relative lift with CI on the difference; p-value (two-proportion z-test); minimum detectable effect at the actual sample size; business impact range from the lift CI.
- Checks: sample ratio mismatch (chi-square vs planned split, red if p < 0.001); called too early (red if below planned sample size); underpowered (amber if achieved MDE > target lift).
- Chart: cumulative lift over time with CI band.
- Verdict, exactly one: Fix the data first / Keep running / Ship it / Don't ship: it hurt / No clear winner.
- Readout: 4 to 6 plain sentences from rules and templates. Never says "significant" unless the stats do. An optional Claude API rewrite layer gets built later, switched off unless ANTHROPIC_API_KEY is set.
- Three one-click demos: clean win, broken split, early peek.
- Everything runs in the browser. No accounts, no database.

## Scope log

- 2026-11-24: stats module only (src/lib/stats.ts, tests, scripts/check_stats.py). No UI.
