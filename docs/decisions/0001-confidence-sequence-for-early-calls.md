# 0001. A confidence sequence for early calls, not group sequential

Date: 2026-11-24. Decided by Ayad's roadmap (P2); built by Claude Code.

## Context
Below the planned sample the Readout said "Keep running" whatever the data showed. That is the moment people peek. A fixed-horizon test checked every day declared a false winner in 26% of A/A tests in my own simulation (24 looks, nominal 5%).

## Options
1. Keep "Keep running" only. Safe, but gives no way to act on a very large effect early.
2. Group sequential test with alpha spending. Spotify reports 0.90 to 0.93 power against about 0.72 for always-valid methods when the sample size is estimated well. Needs the look schedule fixed up front.
3. Normal-mixture confidence sequence (GrowthBook's documented form). Valid at every look, no schedule needed, runs on the standard error the tool already has.

## Decision
Option 3, tuned so the band is tightest at the planned sample (N* = twice the planned per-arm sample, the total across both arms). Early calls ("Early win (valid sequential call)", "Stop: it's hurting") need the sequential band to exclude zero. Past the planned sample the old logic applies.

## Consequences
Less power than group sequential when the plan is accurate; I would reach for group sequential for a team with fixed, known looks. Early calls overstate effect size, so every early verdict says so. Checked against NumPy to 1e-10 and by an A/A simulation (scripts/check_sequential.py).
