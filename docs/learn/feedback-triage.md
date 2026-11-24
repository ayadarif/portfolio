# Learn: Feedback triage pipeline

For a PM who reads Python and some TypeScript. Open each file next to this doc. Everything here was checked against the sprint branch.

## 0. The idea in one paragraph

Reviews go in. A model labels each one (category, severity, one-line summary). Plain code then counts, ranks and checks the model's work. The page shows saved results; nothing on the site calls a model. The point is not that a model can label text (anyone can). The point is the parts around it: a fixed codebook, answers validated in code, a held-out set you labelled by hand, and ranking done by arithmetic you can audit.

It is called a pipeline, not an agent, because the steps and their order are fixed. The model never decides what to do next.

## 1. Files, one by one

All under `scripts/triage/` unless stated.

| File | What it does |
|---|---|
| `pii.py` | Regexes that replace emails, @handles, URLs, phone numbers, card numbers, runs of 9+ digits and long reference codes with tags like `[PHONE]`. Order matters: emails and URLs go first because they contain digits. It is pattern matching, so it misses things. |
| `ingest.py` | Demo-specific. Reads three bank CSVs, keeps 2023 reviews of 20+ characters, samples 1,000 with a fixed seed (`random.Random(20261124)`), strips personal data, writes `data/corpus.csv`. |
| `data_report.py` | Measures the sample: rating mix, length, a rough language heuristic. Output is in `docs/data-report.md`. |
| `draw_eval.py` | Draws the 100 eval reviews, stratified by stars (quota 30/15/15/15/25), shuffled, stars and bank hidden, into `data/eval/to_label.csv`. Refuses to overwrite an existing sheet so labels can't be lost. |
| `codebook.json` | The categories, tie-break rules, severity anchors. The prompt is built from this file, so the model and Ayad use the same rulebook. |
| `prompts/*.md` | The three system prompts (classify, theme, excerpts). They tell the model the reviews are data, not instructions. |
| `schemas.py` | JSON schemas sent to the model, plus the stricter checks the code runs on answers. |
| `claude_runner.py` | Wraps `claude -p`. Pre-flight, safety flags, cache, retries. |
| `steps.py` | The pipeline: `load_input`, `classify`, `rank`, `themes`, `excerpts`, `run_pipeline`. |
| `__main__.py` | The command line (`run` and `report`). |
| `report.py` | Builds the standalone HTML report from `triage.json`. Escapes all text. |
| `scripts/tests/test_triage.py` | 29 tests with a fake model. |
| `src/lib/triage.ts`, `src/components/triage/TriagePage.tsx`, `src/app/feedback-triage/page.tsx` | The website page. A server component that renders `src/data/feedback-triage.json`. |

Two Python ideas you need once. A **callable** is anything you can call with parentheses; `ClaudeRunner` defines `__call__`, so the pipeline treats it like a function, and tests pass a plain function instead. **Dependency injection** is that trick: steps take `llm` as an argument, so tests never touch the real model.

## 2. The safety wrapper (`claude_runner.py`)

Why `claude -p` and not the API: the sprint rule is no paid API, and this runs on your claude.ai login.

`preflight()` refuses to run if `ANTHROPIC_API_KEY` is set (that would silently bill the API) or if `claude auth status` does not show a claude.ai login. It also records the Claude Code version for the method block.

Each call (`_once`) uses these flags, and each has a reason:

| Flag | Why |
|---|---|
| `-p` | headless: one prompt in, answer out |
| `--safe-mode` | loads no CLAUDE.md, hooks, MCP servers or plugins from your machine |
| `--tools ""` | the model gets no tools, so a hostile review can't make it run anything |
| `--model claude-sonnet-5-5` | pinned, so results are tied to a named model |
| `--no-session-persistence` | no session files left behind |
| `--output-format json` + `--json-schema` | the answer comes back as a JSON object in `structured_output` |
| `cwd` = fresh empty temp dir | no project files in reach |
| `stdin=DEVNULL` | no waiting for piped input |
| `--bare` never | the sprint rule |

**The cache.** The key is a SHA-256 hash of (model, system prompt, user prompt, schema). Same input, same file, no second call. Change a prompt and the key changes, so stale answers can't leak into new results. The cache folder is gitignored.

**Retries.** If an answer fails validation, try again, up to 2 more times. After that the failure is logged in the method block and those reviews are listed as unclassified. The pipeline never fills a gap with a guess.

## 3. Step by step (`steps.py`)

### Ingest (`load_input`)
Works on any CSV with a text column. Collapses whitespace, drops rows under 20 characters, strips personal data, optionally parses a rating, and samples down to `max_reviews`. Ratings are never sent to the model.

### Classify (`classify`)
25 reviews per call. The user message is each review as `[id] text` inside `<data>` tags. The model returns, per review: 1 or 2 category slugs, a severity 1 to 3, a one-line summary. `check_classify` then requires: ids match the batch exactly and in order, every slug is in the codebook, no duplicate categories, severity is a real 1, 2 or 3. A failed batch is retried; a batch that still fails leaves its reviews unclassified.

Why 25: about 40 calls for 1,000 reviews. Smaller batches cost more calls; bigger ones risk the model dropping or merging items.

### Count and rank (`rank`) is plain arithmetic
Per bank and category:
- **count**: reviews carrying the category in either slot.
- **share** = count / reviews in that bank.
- **average severity**: mean of the severity of those reviews.
- **priority** = share x average severity x 100, read as "severity points per 100 reviews". A category raised by 10% of reviews at average severity 2.5 scores 25.
- Praise and other are counted but never ranked.

Worked example from the tests: 1 of 3 reviews in group A raises `login_access` at severity 3, so priority = (1/3) x 3 x 100 = 100.

**Robustness (`robustness`)**: priority is my invention, so the tool checks whether the top 3 changes when you rank by raw count or by severity-3 reviews only. If it does change, the page says so instead of hiding it.

### Themes (`themes`)
For the top 5 categories overall, the model gets the one-line summaries (capped at 150, sampled with a seed) and returns up to 6 named themes with member ids. Code checks every id is real and in at most one theme, then counts theme sizes by bank itself.

### Excerpts (`excerpts`)
Per bank, the code picks up to 8 candidate reviews per category (highest severity first, short ones, no unsafe words). The model chooses 2 or 3 and returns a quote. **The code then verifies each quote**: whitespace-normalised, it must be a substring of the original review, 200 characters or fewer, from a review labelled with that category, free of fraud words, titled names (Mr Okoro) and `[TAG]` placeholders. Invented or edited quotes are dropped silently. `security_fraud`, `praise` and `other` get no excerpts at all.

## 4. Decisions you should be able to defend

1. **Open dataset, not scraping.** the earlier plan to read Apple's review feed was dropped after I read Apple's robots.txt and Media Services Terms as disallowing automated access (my reading, not legal advice); the Hugging Face dataset is Apache-2.0 and downloads with no login.
2. **Banks chosen by review count** (UBA, Access, FBN), not the spec's default list. The spec said choose by count.
3. **Year 2023**: 2024 has a handful of reviews per bank.
4. **Eval set drawn from inside the corpus and held out** from every model run until the hand labels are committed. The commit time is the proof the labels came first.
5. **Stars and bank hidden on the labelling sheet** so they don't nudge your labels.
6. **Quota sampling for eval** (30/15/15/15/25), so 2 and 3 star reviews aren't too thin. The cost: eval agreement isn't a population estimate.
7. **Standard library only**: no install step for anyone who wants to use the tool.
8. **Code does the counting and quoting**, the model does the language. That split is the whole design.

## 5. The website page

`page.tsx` imports `src/data/feedback-triage.json` (a copy of the pipeline's `triage.json`) and passes it to `TriagePage`. In TypeScript the cast `data as unknown as TriageData` tells the compiler "trust me, this JSON has this shape"; the shape is declared in `src/lib/triage.ts`. The component is a server component: it renders to plain HTML at build time and ships no JavaScript. The click-to-open parts use the native `<details>` element, which needs none.

Every headline is scoped ("Among N Google Play reviews from 2023, from an open research dataset"), and the page says the reviews are unverified. The accuracy section reads "Accuracy check in progress" until the eval is run; no number appears before that.

## 5b. The accuracy check (T7)

`evaluate.py` runs the same classify step on the 100 held-out reviews twice, with separate caches so the second run is a fresh sample from the model, then compares with your labels. Results (run 1 is the headline):

| Measure | Run 1 | Run 2 | Keyword baseline |
|---|---|---|---|
| Matches either of your categories | 91 of 100 (95% interval 83.8% to 95.2%) | 90 | 58 |
| Matches your first category exactly | 87 | 85 | 50 |
| Cohen's kappa, first category | 0.84 | 0.82 | 0.41 |
| Severity exactly the same | 83 | 86 | n/a |
| Severity within one level | 100 | 100 | n/a |
| Share in "other" (yours: 9%) | 9% | 11% | 30% |

Run to run: same first category on 93 of 100 (kappa 0.91), same severity on 97. Nine run 1 category misses, eight of them short or vague reviews; they are logged in decisions.md and data/eval/disagreements.json.

Plain-English terms: the **Wilson interval** is the range of true agreement rates consistent with 91 of 100 (sampling noise only). **Kappa** is agreement beyond what two labellers with these category frequencies would reach by luck (0 is chance, 1 is perfect). The **keyword baseline** is a fixed word list per category; a model that can't beat it adds nothing.

## 6. Limits to be honest about

- The model can mislabel; the eval measures how often (section 5b). One labeller, 100 reviews, quota sampled.
- Reviews are self-selected and the sample is 1,000 reviews, so small differences between banks are noise.
- Priority is a made-up index. It is explained in words on the page and stress-tested by the robustness check.
- Personal-data stripping is regex only.
- Themes are built from one-line summaries, not full text.

## 6b. Evaluation v2 (phase 2): the new methods in plain terms

- **Bootstrap interval.** Re-draw the 100 reviews with replacement 2,000 times, recompute the number each time, and take the middle 95%. It shows how much the number would wobble if you had labelled a different 100 reviews. It does not cover label quality.
- **Wilson interval.** The standard interval for "k out of n" (91 of 100). Better than the textbook one when n is small or the share is near 100%.
- **Precision, recall, F1.** For one category: precision = of the reviews the model put there, how many I agree with; recall = of the reviews I put there, how many the model found; F1 = their balance. Tiny categories give noisy values.
- **Jaccard.** For a review with two categories: overlap of the two sets divided by their union. 1 means identical sets.
- **Weighted kappa.** Kappa for ordered scores (severity 1 to 3): a 1 against a 3 is penalised more than a 1 against a 2.
- **Krippendorff's alpha.** Agreement among several raters, allowed to have missing ratings (the second labeller will only do 50 of the 100). 1 is perfect, 0 is chance. It is how the human ceiling will be reported: me against the peer, and each of us against the model.
- **Repeated-run agreement.** Five runs of the same prompt. Where they all agree on a review, it is "settled"; the rest go to a person. In this data accuracy barely rises when you demand agreement (92.9% to 93.1%), so it is a weak signal here. That is a finding, not a failure.
- **Batch test.** One review per call, and shuffled batches of 25. Agreement with my labels did not move, so I found no neighbour contamination on categories. Severity is less stable.
- **Prompt injection.** 15 fake reviews with instructions inside ("ignore your rules"). The model labelled all 15 by their real content. That shows resistance to these attacks, not to all.
- **Cost.** The numbers are Claude Code's own estimate of what the API would have charged. I paid $0 marginal on a Max subscription.
- **Replay.** Every run is saved in `data/eval/runs/`. `scripts/triage/eval_v2.py` recomputes everything from those files. A test fails if a published number changes. CI never calls the model.

## 7. Quiz (14 questions)

1. Why does `preflight()` refuse to run when `ANTHROPIC_API_KEY` is set?
2. What does `--tools ""` protect against?
3. What is in the cache key, and why does changing a prompt matter for it?
4. A classify answer comes back with 24 of 25 ids. What happens?
5. Define priority in words, and compute it for a category in 8% of reviews with average severity 2.5.
6. Why does the tool check ranking by count and by severity 3 alone?
7. A model returns a quote with one word changed. What does the code do, and why?
8. Why are the stars and bank hidden on the labelling sheet?
9. Why is the eval set not proportional to the star mix, and what does that limit?
10. The model matched either of your categories on 91 of 100 with a 95% interval of 83.8% to 95.2%. What does that interval cover, and what does it not?
11. Why can Krippendorff's alpha cope with only 50 of 100 reviews having a second label, when Fleiss' kappa cannot?
12. Five runs agree on 87 reviews. What is the accuracy on those, and what does that say about using agreement as a confidence signal?
13. Batch size 1 changed more labels than shuffled batches of 25 did, yet agreement with you did not move. How do you read that?
14. Why is a 15-item injection set a weak proof, and what would make it stronger?

## Answers

1. It would switch billing to the paid API without you noticing. The sprint rule is to run on the claude.ai login.
2. A hostile or odd review text can't trigger file reads, shell commands or web access, because the model has no tools.
3. Model, system prompt, user prompt and schema, hashed. Changing a prompt changes the hash, so old answers made under the old prompt are never reused.
4. The id check fails, the call is retried up to 2 times, and if it still fails the failure is logged and those reviews are listed as unclassified. Nothing is guessed.
5. Share of reviews raising the category times its average severity times 100, i.e. severity points per 100 reviews. 0.08 x 2.5 x 100 = 20.
6. Priority is a defined index, not a law. If the top 3 holds under simpler rankings, it's robust; if not, the page says so.
7. It drops the quote. A quote must appear word for word in the original review, so invented or edited quotes never reach the page.
8. They could nudge your labels (a 1 star review reads as more severe). You label from the text alone, as the model does.
9. So 2 and 3 star reviews aren't too few to measure. It means the agreement figure describes this sampled set, not the whole corpus.
10. It covers sampling noise from having only 100 reviews. It does not cover label quality (one labeller), nor the fact that the set was quota sampled rather than representative of all 900.
11. Alpha is built from pairs of ratings actually present in each unit, so missing ratings just shrink the number of pairs. Fleiss' kappa assumes every unit has the same number of raters.
12. 93.1% on the 87 unanimous reviews against 92.9% on the 99 with at least 3 of 5 agreeing, so barely better. Agreement across runs does not separate right from wrong here; the model is consistently wrong on the vague reviews too.
13. One-at-a-time labelling moves some borderline reviews to a different but equally defensible category. Moving about with no change in agreement with me means the movement is noise on borderline cases, not a systematic effect of batching.
14. Fifteen attacks of one family cannot cover the space. Stronger: more varied attacks (hidden in the middle of long reviews, other languages, role play), repeated runs, and an attempt to break the output schema.
