# Case study draft: Feedback triage pipeline

Status: draft for Ayad. Not published on the site. Accuracy numbers are from T7 (2026-11-24); one labeller, 100 reviews. "What I learned" is yours.

## Problem
A PM facing thousands of reviews or tickets needs to know what customers raise most and which issues hurt most, without reading everything and without trusting a summary nobody can check. Most quick approaches stop at a word cloud or a model summary with no measure of accuracy.

## What I did
Built a fixed pipeline (not an agent) and ran it on 900 public Google Play reviews of three Nigerian banking apps (UBA, Access Bank, First Bank of Nigeria; 2023; an Apache-2.0 research dataset I did not collect).
- A codebook of 11 categories with tie-break rules and three severity levels.
- A model labels each review (up to two categories, a severity, a one-line summary), 25 reviews per call, through Claude Code in headless mode on my own plan. No API key and no per-call bill.
- Code checks every answer (ids match, categories exist, severity in range) and retries bad ones.
- Plain code does the counting and ranking: share of reviews, average stars, average severity, and a priority score (share x average severity x 100). It also checks whether the top three holds when ranked by count alone or by severity 3 reviews alone.
- Example quotes are chosen by the model but kept only if they appear word for word in the review.
- 100 reviews were set aside, held out of every model run, and hand-labelled by me (committed before any model run on them).
- Packaged as a command line tool: any CSV with a text column in, a JSON file and a standalone HTML report out.

## Results
- 900 of 900 reviews classified, 0 failed calls, 49 model calls in the full run.
- Top categories per bank are on the page (for example, app stability ranks first for First Bank and login access first for Access Bank in this sample). The top three by priority matched the top three by count for two of three banks and matched the top three by severity 3 alone for none, which the page says openly.
- Accuracy against my 100 hand labels: the model's first category matched one of my two categories on 91 of 100 (95% interval 83.8% to 95.2%), kappa 0.84 on the first category, severity exact on 83 and within one level on 100. A second run gave 90, 0.82, 86 and 100. Run to run, the same first category on 93 of 100. A keyword baseline matched 58 of 100 (kappa 0.41). Eight of nine first-category misses were short or vague reviews.

## What I learned
(Yours to write.) Prompts: what did the robustness check change about how you read the ranking? What did the invalid theme answers (ids the model was never given) tell you about validating model output in code? What would you change in the codebook after labelling?
