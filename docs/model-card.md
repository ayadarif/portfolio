# Model card: feedback triage classifier

**What it is.** A fixed prompt plus a codebook (11 categories, tie-break rules, severity 1 to 3) sent to Claude (`claude-sonnet-5-5`) through Claude Code headless mode (`claude -p`, version 2.1.331), 25 reviews per call. It returns JSON that code validates. It is not an agent.

**Intended use.** Sorting app reviews or tickets into themes so a product manager can see what to look at first. A first pass for a person, not a final decision.

**Not for.** Individual customer decisions, anything with legal or financial consequences for a person, languages other than English and Nigerian English or Pidgin (untested).

**Evaluation.** 100 held-out reviews labelled by one person (Ayad) before any model run; five model runs; keyword baseline; batch-size test; 15-item prompt-injection set. Results are on the triage page and in `data/eval/eval_v2.json`. A second human labeller (50 reviews) and a hand-written failure taxonomy are pending.

**Known weaknesses.** Short, vague reviews ("Good beginning better end") are where the model and the labeller disagree most. Severity is less stable than category. The eval set over-represents 2 to 4 star reviews. The labeller is a single person, so agreement measures closeness to him, not to a truth.

**Reproducibility.** Every model response is cached and saved under `data/eval/runs/`. Scores are recomputed from those files; CI fails if a published number changes. The model is never called from CI. Prompt and codebook versions are hashed (`prompt_hash` in each run file).

**Cost.** Claude Code's API-equivalent estimate for the evaluation runs is on the page; actual marginal spend was $0 on a Max subscription.
