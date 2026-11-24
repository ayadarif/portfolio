# 0002. Cache every model output and score from the saved files

Date: 2026-11-24. Decided by the roadmap (P1, P4); built by Claude Code.

## Context
The pipeline runs on a Max subscription that ends around 7 December. After that I cannot call the model for free, and CI must never call it.

## Options
1. Re-run the model whenever a number is needed. Breaks after the subscription ends.
2. Cache only on my Mac. Not checkable by anyone else.
3. Save every run's labels and per-call metrics as files in the repo and compute all scores from them.

## Decision
Option 3. `scripts/triage/live_runs.py` writes `data/eval/runs/<run>.json` (labels, order, tokens, latency, Claude Code's cost estimate, version, prompt hash). `scripts/triage/eval_v2.py` computes everything from those files. A test recomputes and fails if a published number changes. The raw per-call cache stays on my Mac (gitignored).

## Consequences
Anyone can re-score without a key. New runs after December need an API key or a plan, and would be new files, not edits. Pre-flight refuses an API key and non-claude.ai logins. Claude Code pinned at 2.1.331 for these runs.
