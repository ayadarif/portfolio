# Feedback triage: data report

Written 2026-11-24 (sprint task T2). Produced by `scripts/triage/ingest.py` and `scripts/triage/data_report.py`.

## Source
- Dataset: Federal-University-Lokoja/Bank-Review on Hugging Face, https://huggingface.co/datasets/Federal-University-Lokoja/Bank-Review
- Licence: Apache-2.0, as stated in the dataset card metadata (checked 2026-11-24). Not gated; the CSVs download with no login.
- Content: Google Play reviews of 16 Nigerian banks' apps, one CSV per bank, columns `year`, `content`, `score`. The dataset's authors collected the reviews, not us.
- Downloaded 2026-11-24 into `data/raw/` (gitignored). The cleaned sample `data/corpus.csv` is a derived file.

## How the sample was drawn
1. Banks: the three with the most 2023 reviews of 20 or more characters. UBA (15,562 eligible), Access Bank (8,678 eligible), First Bank of Nigeria (3,785 eligible). The spec's default of GTBank, Access and Zenith was not used because GTBank and Zenith rank lower on that count (see decisions.md).
2. Year: 2023. The 2024 rows are a handful per bank (the dataset ends early 2024), so 2023 is the latest full year.
3. Filter: at least 20 characters after trimming whitespace.
4. Sample: 334 + 333 + 333 = 1,000 reviews, `random.Random(20261124)`, same input always gives the same sample.
5. Personal data: emails, @handles, URLs, phone numbers, card numbers, runs of 9 or more digits (account, BVN, NIN) and long mixed letter-digit references are replaced with tags like [PHONE]. Result: 3 substitutions in 1,000 reviews. The pattern list is tested on made-up examples; it is pattern matching, so it can miss things. Public Play Store reviews rarely contain this data, which fits the low count.

## Measured on the sample
```
Reviews: 1000
Years: ['2023']
Length (characters): median 59, mean 94, min 20, max 500

| Bank | Reviews | Share |
|---|---|---|
| Access Bank | 333 | 33.3% |
| First Bank (FBN) | 333 | 33.3% |
| UBA | 334 | 33.4% | 

| Stars | Reviews | Share |
|---|---|---|
| 1 | 383 | 38.3% |
| 2 | 67 | 6.7% |
| 3 | 78 | 7.8% |
| 4 | 105 | 10.5% |
| 5 | 367 | 36.7% | 

| Language (heuristic) | Reviews | Share |
|---|---|---|
| Pidgin or code-mixed | 5 | 0.5% |
| mostly English | 897 | 89.7% |
| short or unclear | 98 | 9.8% |

By bank, share of 1 and 2 star reviews:
- Access Bank: 31.2% of 333
- First Bank (FBN): 67.3% of 333
- UBA: 36.5% of 334
```

## Reading these numbers
- Ratings are polarised: 1 star and 5 star make up about three quarters. Very few middling reviews.
- First Bank's share of 1 and 2 star reviews is about double the others in this sample. That is a fact about these 333 reviews, not a verdict on the bank.
- Language is a rough heuristic (function-word share and a short Pidgin word list), not a detector. "Short or unclear" is mostly short English like "Awesome app for seamless transactions"; a 12-review spot check found no non-English text. Pidgin appears in about 0.5% of reviews. The model prompt should still treat all text as possibly code-mixed.
- Reviews are self-selected app users who chose to write. They are not a random sample of customers.
