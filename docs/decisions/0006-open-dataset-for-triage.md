# 0006. An openly licensed dataset for the triage pipeline

Date: 2026-11-24. Roadmap hard rule: no data used against a provider's terms, no scraping, no employer data.

## Context
The pipeline needs real feedback text. My own employers' data is off limits; scraping app stores breaks their terms.

## Options
1. Scrape Google Play. Against terms.
2. Invent reviews. Easy, but proves little.
3. An existing open dataset with a clear licence.

## Decision
Option 3: Bank-Review (Federal University Lokoja, Hugging Face), Apache 2.0 per its card, Google Play reviews of Nigerian banks' apps. Subset: UBA, Access Bank, First Bank of Nigeria, 2023, 1,000 sampled with a fixed seed, personal data patterns removed. Attribution in `data/NOTICE.md`; data card in `docs/data-card.md`.

## Consequences
The three banks and the year are a choice, stated on the page. Pidgin and short vague reviews make the task harder, which is useful for an honest test. The collection process is the dataset authors', not mine, and I do not claim more than their card says.
