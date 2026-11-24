# Labelling 50 bank app reviews (about one hour)

Thanks for doing this. You are the second human labeller for a small research project that checks how well an AI model sorts app reviews. Your labels are compared with mine and with the model's. There are no right answers to hunt for: label what you honestly think each review says.

## What to do

1. Read the rulebook first: `docs/triage-codebook.md` (11 categories, tie-break rules, severity 1 to 3). Use only that. Please do not look at anything else in the repo, and do not ask anyone or anything (including an AI tool) what to label.
2. Open `data/eval/peer_to_label.csv`. It has 50 reviews: `id` and `text`. The reviews are from Nigerian bank apps on the Google Play Store, so some are in Nigerian English or Pidgin.
3. For each row fill in:
   - `category_1`: the most important category (a slug from the codebook)
   - `category_2`: optional second category, only if truly needed
   - `severity`: 1, 2 or 3 per the codebook
   - `notes`: optional; one line on anything unclear
4. Label what the reviewer wrote, not the cause you suspect. Ignore star ratings (they are hidden anyway).
5. Do the whole sheet in one or two sittings, without looking back at earlier answers.

## Send it back

Save the file under a new name, for example `peer_labelled.csv`, and send it to me. Please also tell me, for the write-up: roughly how comfortable you are with Nigerian English or Pidgin (not at all, somewhat, fluent), and your general background (for example "analyst" or "PM"). No names will be published.

Your labels are scored as they are, before any discussion between us. That agreement number is the point of the exercise.
