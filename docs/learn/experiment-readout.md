# Learn: Experiment Readout

Who this is for: you, a PM who reads Python and some TypeScript. Read it with the code open. Every claim below was checked against the files as they stand on the sprint branch.

## 0. The shape of the whole thing

Data goes through four layers, each in its own file.

| Layer | File | Job |
|---|---|---|
| Parse | `src/lib/csv.ts` | Turn pasted CSV text into rows of `{variant, users, conversions, date?}` |
| Maths | `src/lib/stats.ts` | Every formula. Pure functions, no UI, no libraries |
| Glue | `src/lib/readout.ts` | Turn form text into numbers, call every stats function once |
| Words | `src/lib/narrative.ts` | Turn the numbers and verdict into 4 to 6 plain sentences |

Optional layer on the side: an AI rewrite (`rewrite.ts`, `validate-rewrite.ts`, `rewrite-client.ts`, `app/api/rewrite/route.ts`). It is off.

Two TypeScript ideas you need once. `interface` describes the shape of an object (like a typed dict). `number | null` means "a number or nothing", and the compiler forces you to handle the null.

Conventions (top of `stats.ts`): rates and lifts are fractions (0.05 is 5%). A is control, B is treatment. Lift is B minus A. All tests are two-sided.

## 1. stats.ts, formula by formula

### 1.1 The building blocks (lines 5 to 70)

You need three things from probability theory, and the file codes them by hand so the browser needs no stats library.

- `erfc(x)`: the area in the tail of the normal curve. Everything else is built on it. Two methods are stitched together, a power series for small x and a continued fraction for large x. You do not need to be able to derive these. You do need to know why they exist: the textbook shortcut loses accuracy in the far tail, and the tests check z = minus 5.
- `normalCdf(z)`: probability a standard normal draw is below z.
- `normalInv(p)`: the reverse. Give it 0.975, get 1.96. It makes a rough guess with a published approximation (Acklam), then polishes it with one Halley step.
- `zCritical(0.95)` is 1.959964. That is the "1.96" everyone quotes.
- `chiSquareP1`: p-value for a chi-square with one degree of freedom. Trick: a chi-square(1) variable is a squared standard normal, so its tail is just `erfc(sqrt(x/2))`.

### 1.2 Wilson interval (`conversionRate`)

Each variant gets a conversion rate and a 95% interval around it.

The naive interval is rate plus or minus 1.96 standard errors. It breaks when rates are small or samples short: it can go below zero. The Wilson interval fixes that by solving for the range of true rates that would plausibly produce what you saw. Code, in plain steps:

1. `p = conversions / users`
2. `z2n = z squared / users`
3. `centre = (p + z2n/2) / (1 + z2n)` (the middle is pulled slightly toward 50%, not equal to p)
4. `half = z * sqrt(p(1-p)/n + z squared / (4 n squared)) / (1 + z2n)`
5. Interval is centre plus or minus half, clamped to 0 and 1.

Check from the tests: 100 conversions out of 1,000 gives [0.083, 0.120].

### 1.3 Comparing variants (`compareVariants`)

Worked example, the clean win demo: control 1,407 of 14,130, treatment 1,579 of 14,150.

- Rates: 9.96% and 11.16%. Absolute lift = 1.20 points. Relative lift = 1.20 / 9.96 = about 12.1%.
- Two different standard errors are computed, and this is the part to be able to explain.

**Unpooled SE** (used for the lift confidence interval): `sqrt( pA(1-pA)/nA + pB(1-pB)/nB )`. It lets the two rates differ, which is the right assumption when you ask "how big is the effect?". Result here: 0.003654. The CI is lift plus or minus 1.96 times this: 0.49 to 1.92 points.

**Pooled SE** (used for z and the p-value): all conversions over all users give one shared rate, `pooled`, and then `sqrt( pooled(1-pooled)(1/nA + 1/nB) )`. It assumes the null hypothesis is true: "there is no difference, so both arms share one rate". The p-value answers "if nothing is going on, how often would a gap this big appear?". Result here: z = 3.29, p = 0.0010.

**Why they can disagree at 5%.** The pooled variance is never smaller than the unpooled one (the shared rate sits between the two, and p(1-p) is a hill-shaped function, so the average of the two hills is lower than the hill at the average). So the p-test is a touch stricter than the CI. Right at the edge you can get a CI that just clears zero while p is a hair above 0.05. A real example from the sweep I ran while writing this: 549 users per arm, 109 conversions against 136. The CI lower bound is +0.00001 (clears zero) but p = 0.0503 (does not clear 0.05). Neither number is wrong. They answer slightly different questions. That is why `verdict()` demands both before it says Ship it.

If the control rate is exactly 0, relative lift is `null` rather than dividing by zero.

### 1.4 Sample size (`sampleSizePerVariant`)

How many users per arm you need before the test, to catch a lift of a given size.

```
n = ( zA * sqrt(2 * pbar * (1-pbar)) + zB * sqrt(p1(1-p1) + p2(1-p2)) )^2 / (p2 - p1)^2
```

Read it as two hurdles added together:
- `zA` term: the bar for not crying wolf (false positive, controlled by confidence).
- `zB` term: the bar for not missing a real effect (false negative, controlled by power, default 80%, which was my choice because the spec was silent).
- Divide by the squared gap. Halve the lift you want to detect and you need about four times the users. The test `smaller lifts need far more users` pins this.

Reference value (checked against scipy): 10% baseline, 10% relative lift, 95% confidence, 80% power gives 14,751 per arm. `relative` mode and `absolute` mode give the same answer when they describe the same lift.

### 1.5 The MDE shortcut (`minDetectableEffect`)

Flip the question: given the users you actually got, what is the smallest lift you could reliably detect?

```
MDE = (zA + zB) * sqrt( p(1-p) * (1/n1 + 1/n2) )
```

It uses the control rate for the variance and ignores that the variance changes once the lift is added. So it is a shortcut, and slightly off. I measured it against an exact power solve in `scripts/check_stats.py`: 0.009977 from the shortcut against 0.010199 from the exact solve, about 2% apart. The test allows 5%, and decisions.md records the gap as about 2 to 4%. If someone asks "is it exact?", the answer is no, and here is the size of the error.

### 1.6 Sample ratio mismatch (`sampleRatioMismatch`)

Question: did users land in the arms in the planned proportions?

`chi-square = sum( (observed - expected)^2 / expected )` over both arms. Expected is total users times the planned share. Then the p-value from chi-square(1).

**Why 0.001 and not 0.05.** At 0.05, one healthy test in twenty would be flagged. SRM should almost never fire by chance, so the bar is strict. When it does fire, it nearly always means assignment is broken (a bot filter hitting one arm, a redirect that drops users, a bug in bucketing). That makes every other number suspect, so it outranks everything. Status is red if p < 0.001, else green. Example from the tests: 10,000 against 9,000 is red.

### 1.7 The other two checks

- `calledTooEarly`: red if either arm has fewer users than the plan. Why: stopping when the numbers look good inflates false positives. The plan is the stopping rule.
- `underpowered`: amber if the MDE is larger than the lift you said you cared about. Why: "no difference" means little if the test could not have seen your target lift. This check is skipped (shown grey) when no minimum lift is entered.

### 1.8 Business impact

`monthly users * lift * value per conversion`, applied to the lift and to both CI ends, so you get low, likely and high. It needs both monthly users and value, or neither (`parseSetup` enforces that).

### 1.9 The verdict order (`verdict`)

First match wins, and the order is the logic.

1. SRM red: **Fix the data first**. Nothing else can be trusted.
2. Below planned sample: **Keep running**. Even a scary early loss, because peeking inflates false alarms.
3. p below alpha AND CI entirely above zero: **Ship it**.
4. p below alpha AND CI entirely below zero: **Don't ship: it hurt**.
5. Anything else: **No clear winner**.

`alpha` is 1 minus confidence. The early peek demo shows rule 2: p is under 0.05 early on, yet the verdict is Keep running, because the novelty effect fades.

## 2. readout.ts

`parseSetup` turns the form strings into numbers and rejects bad input with a message. `buildReadout` then calls every stats function once and returns one `Readout` object. There is no new maths in it. One decision to note: if you give a relative minimum lift, it is applied to your stated baseline, otherwise to the observed control rate.

## 3. narrative.ts: the written readout

The text is built by rules and templates, so the tool works with no AI at all. The rules that matter:

- `significance()` uses the same test as the verdict: p below alpha and a CI that excludes zero. The word "significant" is printed only when that is true.
- The paragraph is 4 to 6 sentences: what happened, how confident to be, caveats, impact, what to do next, plus a trending-negative warning in one case.
- The impact sentence is skipped when the verdict is Fix the data first. Numbers from a broken split should not get a money figure.
- Caveats are not repeated if the sentence above already covers them.

## 4. The validator (`validate-rewrite.ts`)

The AI rewrite can only reword. The validator is the gate. A rewrite is accepted only if every check passes, else the rule-based text stays. The checks:

1. **Significance:** if the stats do not support it, any word starting "significan" fails, even "not significant". That is stricter than needed, and deliberate: a false reject just keeps the safe text.
2. **Overclaims:** "proves", "guarantee", "definitely" and similar fail.
3. **Verdict:** for each verdict there are forbidden phrases (a Ship it rewrite may not say "keep running") and required ideas (a Keep running rewrite must mention waiting or the planned sample). A "do not ship" or "ship it" stance has to match the verdict.
4. **Numbers:** every number in the rewrite must equal some number in the input rounded to the digits written. "About 4.8%" passes for 4.83. Handles commas and suffixes like 2.5k.
5. Length between 40 and 1,500 characters.

It is a set of heuristics, not proof. It catches the obvious failures.

## 5. Why the rewrite request is gated

Earlier, the browser sent a summary to `/api/rewrite` on every readout, even with the AI off. That contradicted the claim that nothing leaves your browser. Now `rewrite-client.ts` sends nothing unless the build flag `NEXT_PUBLIC_REWRITE_ENABLED` is `"true"`, and it is unset by default. Next.js swaps that flag in at build time, which is why it has to be read as the literal `process.env.NEXT_PUBLIC_REWRITE_ENABLED`.

Separately, the route itself does nothing without `ANTHROPIC_API_KEY`, and the project decision is no paid API. So the layer is built and tested but dormant, and a real rewrite has never been run. The in-memory rate limit in the route is best effort only (each serverless instance has its own counter).

## 6. The tests

Run `npm test`. Files and what they prove:

| File | What it pins down |
|---|---|
| `stats.test.ts` | Textbook values (z = 1.959964, chi-square 3.841459 gives p = 0.05); Wilson interval; comparison numbers checked against scipy; SRM cases; sample size 14,751; MDE within 5% of exact; aggregation; the five verdicts |
| `readout.test.ts` | Demos through the whole path form to CSV to readout; no demo has a perfectly equal split; `parseSetup` rules; each demo's planned sample matches the formula, so a drifted number fails |
| `narrative.test.ts` | 4 to 6 sentences; "significant" never appears unless the stats allow it; payload carries numbers but not the experiment text |
| `validate-rewrite.test.ts` | Good rewrites pass; invented numbers, false significance and flipped verdicts fail |
| `rewrite-client.test.ts` | Zero network requests when the flag is off |
| `csv.test.ts` | Parser |

Independent check: `scripts/check_stats.py` recomputes the same numbers with scipy (run in `scripts/.venv`). The tests and the script share `scripts/fixtures/datasets.json`, which is generated from `src/lib/demos.ts`.

## 6b. Early calls: the sequential band (added in phase 2)

Plain terms. A normal confidence interval is only honest if you look once, at the planned sample. Look every day and you will eventually catch a "win" that is luck: in my simulation of tests with no real difference, 26% were declared winners at some point. A confidence sequence is a wider band built so that it stays honest however often you look. If that band is entirely above zero before the planned sample, the Readout says "Early win (valid sequential call)". Entirely below: "Stop: it's hurting". Otherwise: "Keep running".

Moving parts. N* is the total sample (both arms) where the band is tightest; I set it to twice the planned per-arm sample, so it is tightest where the plan says to decide. The band reuses the standard error the tool already computes. Cost: it is wider than the ordinary interval, so it needs a bigger effect to call early. Early calls also overstate the effect, because you stopped on a lucky high; every early verdict says so.

Honest trade-off. Group sequential tests (fixed looks, alpha spending) keep more power when the sample estimate is good (Spotify: 0.90 to 0.93 against about 0.72). I chose the confidence sequence because it needs no look schedule. Code: `sequentialHalfWidth` in src/lib/stats.ts. Check: `scripts/check_sequential.py`.

## 7. Quiz (10 questions)

1. Why does the lift CI use unpooled variance while the p-value uses pooled?
2. Which of the two standard errors is never smaller, and what does that imply at the 5% edge?
3. Why is the SRM threshold 0.001 rather than 0.05?
4. A test has p = 0.02 but only 60% of the planned sample. What is the verdict and why?
5. Halve the lift you want to detect. Roughly what happens to the sample size?
6. What two hurdles does the sample size formula add together?
7. How accurate is the MDE shortcut, and what did I compare it against?
8. Why is the narrative rule-based first, with AI only as an optional rewrite?
9. A rewrite says "this change is not significant" when p = 0.3. Does the validator accept it? Why?
10. Why does the browser not call `/api/rewrite` by default, and what changes that?
11. A test is at 40% of its planned sample and the ordinary interval excludes zero. Is that an early win? What decides it?
12. Why is the sequential band wider than the ordinary one, and what does that buy?
13. Why does every early call say the effect is probably overstated?
14. When would you pick a group sequential test instead?

## Answers

1. The CI asks "how big is the effect", so the two rates are allowed to differ (unpooled). The p-value tests "no difference", so it assumes one shared rate (pooled).
2. The pooled one. So the p-test is slightly stricter, and a CI can just clear zero while p is a hair above 0.05. That is why Ship it needs both.
3. SRM must almost never fire by chance. At 0.05, one healthy test in twenty would be flagged. A real hit means broken assignment, which poisons everything.
4. Keep running. Below the planned sample, the plan is the stopping rule, because peeking inflates false positives.
5. About four times as many users, because the gap is squared in the denominator.
6. The false positive bar (zA, from confidence) and the false negative bar (zB, from power), added inside the square before dividing by the squared gap.
7. About 2 to 4% off. Compared against an exact power solve in `scripts/check_stats.py` (0.009977 against 0.010199 on the clean win data).
8. So the tool works and stays honest with no AI. Rules guarantee "significant" is only printed when the stats support it. The AI could only change wording, and the validator checks it.
9. No. Any "significan..." is rejected when the stats do not support significance, even negated. Stricter than needed on purpose.
10. A call would send a summary to the server on every readout, contradicting the "nothing leaves your browser" claim. It only fires if the build flag `NEXT_PUBLIC_REWRITE_ENABLED` is `"true"`, and even then the route needs an API key, which the no-paid-API decision rules out.
11. No. Below the plan the ordinary interval is not allowed to decide. Only the sequential band excluding zero makes it an early win.
12. It has to hold at every look, not one. That costs width; it buys a false alarm rate that stays near alpha (1.05% against 26.2% in my simulation).
13. You only stop early when the data has run high, so the stopped estimate is biased upward (Statsig warns of the same).
14. When the looks are fixed and known in advance and the sample size estimate is good: it keeps more power.
