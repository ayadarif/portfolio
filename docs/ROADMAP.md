# Sprint roadmap (autonomous mode)

Owner: Ayad Arif. Written Nov 24, 2026. Claude Code works through this file on its own, task by task.

## How to work (read every session)
1. Work on the `sprint` branch only. Never commit to, merge into or push `main`. Push with exactly `git push origin sprint`. Vercel builds a preview of `sprint` automatically; Ayad merges to `main` after review.
2. Take the first task below that isn't marked DONE. Plan it briefly in HANDOFF.md, build it, test it, commit in small commits, push, mark it DONE here with the date and commit hash, then move to the next task. Don't stop to ask questions.
3. When something needs Ayad (a fact, a judgment, a label, a login), add it to NEEDS_AYAD.md with the default you chose, take that default, and keep going. Never invent facts about Ayad's career or numbers.
4. Before marking any project DONE, spawn a reviewer subagent with no prior context. Have it check the work against its spec and this checklist: tests pass; build and lint pass; every claim on the site is true per the code; no secrets; no personal data; style rules. Fix what it finds.
5. Keep HANDOFF.md current so a fresh session can continue from it alone. Record decisions in decisions.md.
6. If a usage limit is near, finish the current commit, update HANDOFF.md and stop cleanly.
7. For every project, write docs/learn/<project>.md: a plain-English walkthrough of every file and every key decision, then a 10-question quiz with answers at the end. Ayad will study these after the sprint. Write them for a PM who reads Python and some TypeScript.

## Hard rules
- No paid API. Never set or export ANTHROPIC_API_KEY. Never run `claude` with `--bare`.
- No data used against a provider's terms. No scraping of app stores, broker terminals or websites.
- No employer or client data. Public, openly licensed, personal or made-up data only.
- Never claim on the site anything the code doesn't do. Present tense only for things that exist.
- Writing style for all site copy and docs: no em dashes, no en dashes, no double hyphens as punctuation; straight quotes; no "delve", "tapestry", "testament", "beacon", "landscape"; no "Moreover", "Furthermore", "In conclusion"; vary sentence length; plain and direct.
- Trading tools: risk and information only. Never signals, predictions or trade calls.

## Tasks

### T0. Set up the sprint branch
- `git switch -c sprint` (or switch to it if it exists). Make sure .gitignore contains `.claude/settings.local.json`. Commit this roadmap, NEEDS_AYAD.md and the two new specs in docs/. Push with `git push -u origin sprint`.
- Status: DONE 2026-11-24 (6ed7145)

### T1. Experiment Readout: learning doc
- Write docs/learn/experiment-readout.md per rule 7. Cover stats.ts formula by formula (Wilson interval, unpooled lift CI vs pooled z-test and why they can disagree at 5%, sample ratio mismatch and its 0.001 threshold, the sample-size formula and the MDE shortcut with its 2 to 4% error), the verdict order, the narrative rules, the validator, why the rewrite request is gated, and the tests.
- Status: DONE 2026-11-24 (0867ab2)

### T2. Feedback triage: dataset
- Spec: docs/feedback-triage-spec.md. Pick the dataset per the criteria there, verify its licence from the dataset card, download without login, record source, licence and URL in decisions.md and the method section.
- Ingest: strip personal data, sample about 1,000 reviews (fixed seed), measure language mix, rating mix, date range. Write a short data report in docs/.
- Status: DONE 2026-11-24 (33d4f24)

### T3. Feedback triage: codebook and eval sample
- Write docs/triage-codebook.md (categories with definitions and examples, severity anchors).
- Draw 100 eval reviews (fixed seed, stratified by star rating) into data/eval/to_label.csv with empty columns: my_category_1, my_category_2, my_severity, notes. Exclude them from all model runs until Ayad's labels are committed.
- Add the labelling task to NEEDS_AYAD.md with instructions (open in Numbers or Excel, fill columns, save as CSV, tell Claude Code "labels done").
- Status:

### T4. Feedback triage: pipeline
- Build the pipeline per spec: classify, theme, count and rank, excerpts. Use `claude -p` per the spec's safety flags. Mock the model in unit tests. Validate the real pipeline on a 50-review dev slice (2 to 3 calls) before any larger run.
- Status:

### T5. Feedback triage: full run
- Run on the corpus minus the eval set. Cache all model outputs (gitignored). Produce the output JSON. Run the robustness checks (rank by count only; by severity 3 only).
- Status:

### T6. Feedback triage: page and tool packaging
- Static page /feedback-triage per spec. Eval section shows "Accuracy check in progress" until T7 is done; never invent a number.
- Package as a reusable CLI: any CSV with a text column in, the same JSON and a standalone HTML report out. README usage section.
- Update the Projects entry in src/data/content.ts only to describe what exists (link the page once live on the preview).
- Status:

### T7. Feedback triage: eval (blocked until Ayad's labels are committed)
- Run the model on the 100 eval reviews twice. Report agreement with a 95% interval, Cohen's kappa, confusion matrix for the top categories, severity exact and within-one agreement, share in "other", run-to-run agreement, and a keyword baseline. Publish on the page. Log disagreements in decisions.md.
- If labels aren't in yet, skip to T8 and come back.
- Status:

### T8. PMEX contract calculator
- Spec: docs/pmex-calculator-spec.md (v1.1). Build Layer 1 at /pmex-calculator with all maths in src/lib/pmex.ts and unit tests. Contract and fee data in one file with source URL and date per row. Defaults: gold oz, crude and Tola Gold; KTrade and SCS fee presets; ALT 55%.
- Tests must include: Tola Gold has no short side; auto-liquidation distance; fee floor of Rs 30 binding on CRUDE10; USD/PKR change moves tick value and margin but not settled P&L.
- Add "Real-trade check" to NEEDS_AYAD.md (one broker statement, account numbers removed) and leave a skipped test ready for it.
- Status:

### T9. Polish and case study drafts
- docs/case-studies/<project>.md for Experiment Readout, Feedback triage and PMEX calculator: Problem, What I did, Results, What I learned (leave "What I learned" for Ayad). Drafts only; don't publish to the site.
- Check every page on phone width with server-render tests; fix anything broken.
- Status:

### T10. Final review
- Spawn a fresh reviewer subagent over the whole sprint branch: claims vs code, tests, style, secrets, personal data, licence notes. Fix findings. Summarise the state in HANDOFF.md for Ayad.
- Status:
