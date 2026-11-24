# 0005. Rule-based readout first; AI rewrite gated and off

Date: 2026-11-24. Ayad's call (no paid API); built by Claude Code.

## Context
Experiment Readout must never claim significance the statistics do not support, and I will not pay for an API.

## Options
1. AI writes the readout. Fluent, but can overclaim and needs a key.
2. Rules and templates write it; AI optional.
3. No prose at all.

## Decision
Option 2. `src/lib/narrative.ts` builds 4 to 6 sentences from the verdict and numbers; the word "significant" appears only when p is below alpha and the interval excludes zero. An optional rewrite route exists but is off: it runs only with an API key and a build flag, sees only computed numbers, and its output is rejected by `validate-rewrite.ts` if it contradicts the verdict or adds numbers. It has never run against the live API.

## Consequences
The tool works fully offline with no AI. The rewrite layer is tested with fakes only, so I do not claim it works with a real model.
