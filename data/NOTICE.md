# Data notice

`corpus.csv` is a derived sample of the Bank-Review dataset.

- Dataset: Bank-Review, Federal University Lokoja, https://huggingface.co/datasets/Federal-University-Lokoja/Bank-Review
- Licence: Apache License 2.0, as stated on the dataset card (checked 2026-11-24). Licence text: https://www.apache.org/licenses/LICENSE-2.0
- Content: Google Play reviews of Nigerian banks' apps. The reviews were collected by the dataset's authors, not by this project.
- Changes made here: only UBA, Access Bank and First Bank of Nigeria; only 2023; reviews of 20 or more characters; a random sample of 1,000 (seed 20261124); email addresses, @handles, URLs, phone numbers, card and account numbers and long reference codes replaced with tags by pattern matching; star ratings kept; columns renamed (`content` to `text`, `score` unchanged) with an `id` column added.
- `eval/to_label.csv` is a 100-review subset of the same sample for hand labelling.
