# Feedback triage tool

Takes a CSV of customer feedback (app reviews, support tickets, NPS comments) and produces:
- `triage.json`: counts, ranks, themes and example quotes per group, plus a method block.
- `report.html`: one standalone page (no JavaScript, no network) a PM can open or email.

It is a fixed pipeline, not an agent: ingest, classify, theme, count and rank, excerpt.

## Run it

You need Python 3.9 or newer (standard library only, nothing to install) and Claude Code, logged in with a claude.ai account.

```
claude auth status        # must show a claude.ai login
unset ANTHROPIC_API_KEY   # the tool refuses to run if this is set
PYTHONPATH=scripts python3 -m triage run --input feedback.csv --text-col content --rating-col score --group-col bank --out out/
```

Only `--input`, `--text-col` and `--out` are required. `--rating-col` adds average rating per category; `--group-col` ranks each group (a bank, a product, a plan) separately. Add `--exclude-ids file.csv` to hold reviews out (any CSV with an `id` column; pair it with `--id-col`).

Rebuild the HTML from an existing JSON: `PYTHONPATH=scripts python3 -m triage report --json out/triage.json --out out/report.html`

Tests (the model is mocked): `PYTHONPATH=scripts python3 -m unittest discover -s scripts/tests -v`

## What it costs

No API key and no per-call bill. It runs `claude -p` on your own Claude Code plan, so it uses your plan's usage allowance, shared with your claude.ai chats. About 25 reviews per call: 1,000 reviews is roughly 40 classify calls plus about 8 for themes and excerpts. Every answer is cached on disk (`--cache`, default `data/cache`), so a re-run costs nothing for work already done.

## How each step works

1. Ingest: reads your CSV, drops rows under 20 characters, replaces phone numbers, emails, URLs, @handles, card and account numbers and long reference codes with tags such as [PHONE], samples down to `--max-reviews` (default 1,000, fixed seed).
2. Classify (model): up to 2 categories per review from a fixed codebook, severity 1 to 3, a one-line summary. Answers are checked in code (ids, category names, severity range); invalid answers are retried twice, then logged.
3. Count and rank (code only): per group and category, count, share, average rating, average severity, and priority (severity points per 100 reviews). Praise and other are not ranked. The tool also checks whether the top 3 holds when ranked by count alone or by severity 3 reviews alone.
4. Theme (model): within the top categories, groups the one-line summaries into named themes.
5. Excerpts (model picks, code checks): 2 or 3 quotes per category. A quote is kept only if it appears word for word in the review.

## Limits

- Categories are built for consumer finance apps (`codebook.json`). Pass your own with `--codebook`; keep the same keys.
- The model can be wrong. The demo's accuracy against hand labels is reported on the project page; your data has not been checked that way.
- Reviews are treated as untrusted text. The prompts fence them as data and say so, and a test call with an injected instruction was ignored, but that is one test, not a guarantee.
- Personal-data stripping is pattern matching. It will miss things. Do not run private customer data through it unless you are comfortable with it going through Claude Code.
- Themes come from one-line summaries, not the full text, and are capped at 150 summaries per category.
- Reviews are self-selected, so shares describe what reviewers wrote about, not how customers feel overall.
