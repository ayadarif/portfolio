# Data card: Bank-Review sample

**Source.** Bank-Review, Federal University Lokoja, https://huggingface.co/datasets/Federal-University-Lokoja/Bank-Review. Google Play reviews of Nigerian banks' apps, collected by the dataset's authors.

**Licence.** Apache License 2.0 per the dataset card (checked 2026-11-24). Attribution is in `data/NOTICE.md`.

**What was kept.** UBA, Access Bank and First Bank of Nigeria; year 2023; reviews of 20 or more characters; a random sample of 1,000 (seed 20261124). Stars kept.

**What was changed.** Emails, @handles, URLs, phone numbers, card and account numbers and long reference codes replaced with tags by pattern matching. The matching is not perfect; it misses some grouped 11-digit IDs. Quotes shown on the site are additionally filtered for fraud claims and named individuals.

**Splits.** 100 reviews held out for the accuracy check (labelled by hand, `data/eval/to_label.csv`); 900 used for the ranking. 50 of the 100 are reserved for a second labeller (`data/eval/peer_to_label.csv`).

**Synthetic data.** 15 made-up reviews in `data/eval/injection_set.json` test prompt injection. They are never part of the corpus or any public count except that test.

**Limits.** One year, three banks, one platform. English and Nigerian English; Pidgin appears. Reviews are self-selected, so they over-represent unhappy and very happy users.
