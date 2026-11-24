# Needs Ayad

Claude Code adds items here instead of stopping. Each item says what default was taken. Answer by editing this file or telling Claude Code.

## Open (phase 1)
11. (T8) Real-trade check: still no broker statement. The skipped test stays skipped; the PMEX page shows a visible note that fees have not been checked against a real statement. When you have one (account numbers removed): contract, lots, entry and exit, USD/PKR rate, every charge line. Then say "statement ready".

## Open (phase 2, added Nov 24 from the planning chat)
15. Design direction for the redesign (P3). Options: (a) "Instrument Panel" with one Karachi signature: light-first, IBM Plex Sans and Mono, projects as a data-style index table, ajrak-indigo accent, Karachi time in the footer (recommended); (b) "Analyst's Notebook": editorial, warm paper, serif display, FT-style charts (best if writing is the strongest asset); (c) "Karachi Ledger": Swiss grid, ledger rules, name in Nastaliq. Default: (a).
16. Hero overlap line: which time zones and hours do you want to show? Default: "Karachi, PKT (UTC+5). Works across GMT and CET hours." Say if you'd rather show US overlap.
17. Hero target-role line. Default: "Product manager who builds: growth, experimentation and AI tools, with an analyst's toolkit."
18. Second labeller (P4): someone who will spend about an hour labelling 50 reviews blind using only the codebook (a friend or ex-colleague; ideally comfortable with Nigerian English or Pidgin). Claude Code prepares data/eval/peer_to_label.csv and PEER_INSTRUCTIONS.md. Default: section shows "in progress".
19. Your own error analysis (P4): about 60 to 90 minutes in data/eval/error_analysis.csv once Claude Code prepares it. Must be yours; not delegable. Default: section shows "in progress".
20. A real photo for the site (optional). Default: no photo; never an AI portrait.

## Added in phase 2 (Nov 24), each with the default taken
21. Inconsistency to settle. Your global notes say Daraz was Nov 2022 to Mar 2024 and SastaTicket Apr 2024 to Jul 2026. The site's Free Cancellation case says "Senior Data Analyst, then Product Manager | SastaTicket | 2022 to 2026", and the loyalty and experimentation cases say Apr 2024 to Jul 2026. Default: left the case roles as they were; the hero says only "SastaTicket, Apr 2024 to Jul 2026" and "Before that: Daraz (Alibaba Group)" with no dates. Which is right for the Free Cancellation role line?
22. Hero facts to confirm: "online travel booking platform in Pakistan" as the SastaTicket descriptor; "Nearly six years in product and data roles"; the three hero numbers (+18% retention, labelled relative; kappa 0.84 vs 0.41; 26% to 1% false winners in a simulation). Default: as written. The hero stops at SastaTicket; add your current role if you want it shown (not added: employer content).
23. Second labeller: data/eval/peer_to_label.csv (50 reviews, text only) and data/eval/PEER_INSTRUCTIONS.md are ready. When you have their file, save it as data/eval/peer_labelled.csv (columns as in the sheet) and run `PYTHONPATH=scripts python3 -m triage.eval_v2`, then copy data/eval/eval_v2.json to src/data/eval-v2.json. The page then fills in the human ceiling section by itself. Until then it says "Second labeller in progress".
24. Your error analysis: data/eval/error_analysis.csv has 39 rows (9 run-1 disagreements, 30 random non-eval outputs). Fill the column what_went_wrong_open_code yourself, before looking for patterns; then write the taxonomy (failure mode, count, example, root cause, fix). The page says "in progress" until the column is complete. I did not write any taxonomy.
25. Run docs/a11y-manual-check.md (keyboard and VoiceOver, about 30 minutes). Nothing on the site claims WCAG conformance; it only says the automated checks pass.
26. Before merging: push triggers the first real CI run on GitHub (I ran every step locally, but not on Ubuntu). If a step fails there, the fix is small. Home page Lighthouse SEO is 90 (others 100); I have not chased the last 10 points.
27. The research doc differs from measured numbers in three places: it says 87/100 first-category agreement (87 is the exact-first-category count; the headline is 91 matching either category), 13 disagreements (measured: 9 first-category misses), and its sequential formula has a stray square root of N when read literally (the code uses the standard form, checked against NumPy). The site uses the measured numbers.
28. Time-sensitive: every step that needed `claude -p` is finished (P1). Nothing left in the roadmap needs the Max subscription, so the 7 December end does not block anything.
29. Design direction (item 15), overlap line (16), role line (17): defaults used, as written in the items above. Photo (20): none used. Say if you want any changed.

## Resolved (answered 2026-11-24)
14. Method line "Labels by Ayad; an AI assistant helped draft the notes, not the labels." confirmed accurate by Ayad; it stays on the triage page.
10. Eval labels done and committed (d7591e0). T7 run; results are on the triage page and in decisions.md.
1. Retention 18% is relative; CAC mechanism recorded in docs/case-studies/loyalty-program.md (not in the site bullet).
2. Free Cancellation role and scale-up wording updated on the site and in the content (role line, one sentence on scaling to all flights and routes, "nearly four years after the first version").
3. Five-Minute Brief added to Projects as "Prototype (runs on claude.ai)" with the link and your description.
4. PMEX contract defaults confirmed.
5. Confirmed: "Claude Code wrote most of the code; my part was the rules, the edge cases and the checks." (Not used on the site yet.)
6. Phone check of /experiment-readout done and clean; "not checked by eye" notes removed from HANDOFF.md.
7. LinkedIn items: parked for later (outside the repo).
8. Git author now uses the GitHub noreply email.
9. Banks kept as UBA, Access, FBN; the triage page now says they are the three with the most reviews in the latest full year (2023).
12. Margin and ALT defaults kept, labelled with their dates.
13. README link to GitHub main: fine as is.
