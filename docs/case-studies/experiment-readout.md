# Case study draft: Experiment Readout

Status: draft for Ayad. Not published on the site. "What I learned" is left for you to write in your own words.

## Problem
Teams I worked with made the same mistakes in A/B tests: stopping the moment results looked good, accepting uneven splits between variants without asking why, and calling a result before the planned sample was reached. A p-value on its own does not catch any of that. (This comes from your SastaTicket experience in content.ts; confirm the wording before it goes on the site.)

## What I did
Built a browser tool where you paste or upload test results and get one verdict plus the checks teams skip.
- Statistics are written by hand in TypeScript with no stats library, and checked against scipy: Wilson intervals per variant, an unpooled confidence interval on the lift, a pooled z-test for the p-value, a sample ratio mismatch test at p < 0.001, a sample size formula and a minimum detectable effect.
- A fixed verdict order: broken split first, then below planned sample, then win, loss, or no clear winner. A result counts as a win only when the p-value and the confidence interval both support it.
- A plain-English readout built from rules, so the word "significant" appears only when the numbers support it. An optional AI rewrite layer exists, is off, and has a validator that rejects invented numbers or flipped conclusions. It has never been run against a live API.
- Three seeded demos (clean win, broken split, early peek) so a reader can see each verdict.
- Runs entirely in the browser; the page makes no network requests after load.

## Results
These are facts about the build, not business outcomes. No users or adoption numbers exist yet.
- Live at /experiment-readout on the portfolio.
- Unit tests pin the statistics to scipy values (for example, 14,751 users per variant for a 10% baseline and a 10% relative lift) and cover all five verdicts, the written readout and the validator.
- The three demos produce three different verdicts from the same code path.

## What I learned
(Yours to write.) Prompts you might answer: what surprised you about how the confidence interval and the p-value can disagree at the 5% edge? What did building the validator teach you about trusting a model's wording? What would you add first if a team used this?
