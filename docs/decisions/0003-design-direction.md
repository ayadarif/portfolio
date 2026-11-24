# 0003. Design direction: Instrument Panel with one Karachi signature

Date: 2026-11-24. Default taken because NEEDS_AYAD item 15 was unanswered; change it by answering there.

## Context
Reviewers decide in seconds, and first-impression research favours low complexity and familiar layouts. Claude Code defaults toward template looks (Inter, zinc, glass cards, bento).

## Options
(a) Instrument Panel: light first, Plex Sans and Mono, index table, one accent. (b) Analyst's Notebook: editorial, serif. (c) Karachi Ledger: Swiss grid, Nastaliq name.

## Decision
(a). Accent is ajrak indigo (OKLCH hue 275); neutrals tinted toward it; no gradients; light and dark with an inline pre-paint script and a three-way toggle. The Karachi signature is the footer clock and the colophon line about the accent.

## Consequences
Visual identity rests on typography and real numbers, not decoration. Older pages keep their Tailwind classes; the zinc and sky ramps are redefined in globals.css so they pick up the palette.
