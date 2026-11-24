# Needs Ayad

Claude Code adds items here instead of stopping. Each item says what default was taken. Ayad checks this twice a day; answer by editing this file or telling Claude Code.

## Open (from the planning chat, Nov 24)
1. Is "3-month retention up 18%" (loyalty case study) relative, or percentage points? How did the loyalty program cut CAC? Default: site copy unchanged.
2. When did Free Cancellation launch? Did Free Date Changes and Delay Protection launch before Oct 2022? Default: copy says "still running when I left in 2026, about four years after launch".
3. Five-Minute Brief: make it shareable in claude.ai, or drop it. Default: off the site.
4. PMEX: which contracts you trade (regular or intraday) and which broker; any PMEX FX contracts. Default: gold oz, crude, Tola Gold; KTrade and SCS presets.
5. Confirm this description is accurate: "Claude Code wrote most of the code; my part was the rules, the edge cases and the checks." Default: used in drafts only.
6. Phone check of /experiment-readout: all three demos, the chart, the written readout, dark mode. Then tell Claude Code to remove the "not checked by eye" note from HANDOFF.md.
7. LinkedIn: location Karachi, FP&A role listed, exact Daraz dates. (Outside the repo.)
8. Optional: switch future commits to GitHub's noreply email.

## Added by Claude Code
9. (T2) Bank choice: the spec said choose by review count but named GTBank, Access, Zenith as default. By 2023 count the top three are UBA, Access, FBN, and I used those. GTBank and Zenith are not in the top six. Say if you want the named defaults instead (needs a re-run of ingest and T3; cheap now, costly after T4). Also: the page will name three real banks; reviews are the dataset authors' public Play Store data, Apache-2.0.
10. (T3, BLOCKS T7) Label the 100 eval reviews. Steps: (a) read docs/triage-codebook.md first (5 minutes); (b) open data/eval/to_label.csv in Numbers or Excel; (c) for each row fill my_category_1 (required, use the slug exactly, e.g. login_access), my_category_2 (optional), my_severity (1, 2 or 3) and notes (optional, write doubts here); (d) do not look at model output; (e) export or save as CSV with the same name and columns, then tell Claude Code "labels done". Aim for 60 to 90 minutes. Do it before T4 output exists, ideally; the commit time of your labels is the proof they came first. Default taken: the sprint continues without them; T7 is skipped until they arrive.
