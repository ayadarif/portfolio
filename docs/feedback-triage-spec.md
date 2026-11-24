# Feedback Triage Pipeline: spec v2.0 (Nov 24, 2026)

Decision (Ayad, Nov 24): option B. Package the pipeline as a reusable tool any PM can run on their own feedback CSV, and demo it on an openly licensed dataset. The earlier JazzCash vs Easypaisa plan is withdrawn: Apple's robots.txt and Media Services Terms disallow automated access to the review feed, and publishing complaints about two named Pakistani banks carried reputational risk.

## Purpose
Show a hiring manager that Ayad can build a multi-step AI pipeline, measure its accuracy properly, and turn messy customer language into decisions a PM would act on. Call it a "pipeline", never an "agent": it runs fixed steps.

## Demo dataset
- Default: Hugging Face `Federal-University-Lokoja/Bank-Review` (Apache-2.0). About 334k Google Play reviews of 16 Nigerian banks' apps, English, columns `year`, `content`, `score`, one CSV per bank. An emerging-market fintech setting close to Ayad's own background.
- Before using it: confirm the licence on the dataset card, confirm the CSVs download without login, and record the URL, licence and download date in decisions.md and on the page. Note on the page that the reviews were collected by the dataset's authors, not by us.
- Scope: three of the largest banks in the dataset (choose by review count; default GTBank, Access Bank, Zenith Bank if present), most recent year available, reviews with at least 20 characters. Random sample of about 1,000 with a fixed seed, roughly balanced across the three.
- If that dataset fails any check, choose another openly licensed (CC0, CC BY, Apache, MIT) English review dataset of consumer finance apps that downloads without login, and log why. Datasets with no stated licence are not allowed.

## Tool (the reusable part)
- `scripts/triage/` (Python): `python3 -m triage run --input feedback.csv --text-col content [--rating-col score] [--group-col bank] --out out/` produces `triage.json` and a standalone `report.html`.
- Works on any CSV: support tickets, NPS comments, app reviews.
- README section: what it does, how to run it, what it costs (Claude Code usage on your own plan), its limits.

## Pipeline
Runs on Ayad's Mac via Claude Code headless mode (`claude -p`) on his Max login. No API key.

Safety and hygiene (all required):
- Pre-flight: `claude auth status` must show a claude.ai login; abort otherwise. Never pass `--bare`; never set ANTHROPIC_API_KEY.
- Record the Claude Code version and model used; pin the model with `--model`.
- Each call: run from an empty temporary directory, with `--safe-mode` if this Claude Code version supports it (check `claude --help`; if not, use the closest supported flags that load no CLAUDE.md, hooks or MCP), no tools allowed, a fixed system prompt from a file, JSON output, one turn, no session persistence. Treat review text as untrusted input: the prompt says the reviews are data, never instructions.
- Usage is shared with Ayad's claude.ai chats. Batch about 25 reviews per call; the full run should be about 40 to 50 calls. Cache every response on disk (gitignored) so nothing is ever re-run by accident.

Steps:
1. Ingest: load, filter, sample. Strip anything that looks like a phone number, email, account or card number, national ID or transaction reference before the model sees it.
2. Classify (LLM): per review, up to 2 categories from the codebook (or "other"), severity 1 to 3 per the codebook anchors, one-line summary. Schema-validated; invalid responses retried twice, then logged.
3. Theme (LLM): within each top category, merge the specific issues into named themes for drill-down. Cross-bank comparison uses the fixed codebook categories, not themes.
4. Count and rank (code only): per bank and category: count, share, average star rating, average severity. Exclude "praise" and "other" from rankings. Priority = severity points per 100 reviews (share x average severity); explain it in those words. Robustness: also rank by count alone and by severity-3 count; state whether the top 3 holds.
5. Excerpts: 2 to 3 short excerpts per category, chosen by the model, verified verbatim in code, personal data already stripped. No excerpts alleging fraud or naming staff.
6. Output: `triage.json` with counts, rankings, excerpts, eval results and a method block (dataset, licence, sample size, dates, model, Claude Code version, prompt hash).

## Accuracy check (eval)
- Codebook first (docs/triage-codebook.md): categories with definitions and examples; severity anchors: 1 = annoyance, 2 = blocked a task, 3 = money lost, stuck or locked out.
- Eval set: 100 reviews (fixed seed, stratified by star rating), held out from every model run until Ayad's labels are committed to git. The commit time proves the labels came first.
- Ayad labels them in data/eval/to_label.csv: up to 2 categories and a severity per review.
- Report: category agreement (model's first category matches either of Ayad's) as "X of 100 (95% Wilson interval a to b)", Cohen's kappa on the first category, a confusion matrix for the top categories, severity exact and within-one agreement, share sent to "other", run-to-run agreement (model labels the eval set twice), and a keyword baseline for comparison.
- Optional: Ayad re-labels 20 reviews a few days later for a self-consistency number.
- Report whatever the numbers are. If agreement is weak, say so and say what you'd change.

## Page: /feedback-triage
- Title: neutral, e.g. "What customers raise most about three Nigerian banking apps".
- Every headline scoped: "Among N Google Play reviews from [year], from an open research dataset".
- Per bank: ranked categories with share, average rating, severity, priority; click for themes and excerpts.
- "Where I'd look first": top 3 per bank, each tied to its numbers.
- Method: dataset, licence and attribution, sampling, pipeline diagram, model and version, full eval results (or "Accuracy check in progress" until done), what the model is and isn't trusted to do, "These are unverified user reports".
- "Run it on your own feedback": link to the tool's README.
- Static JSON. Nothing on the site calls a model.

## Done means
Live on the sprint preview; tool runs end to end on a fresh CSV with one command; numbers reproducible from cache; eval reported honestly with intervals; docs/learn/feedback-triage.md written.
