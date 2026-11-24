# Handoff

## Goal
Simple one-page portfolio for Ayad (PM). Sections: intro, 3 case studies, Projects (AI tools), contact. Free on Vercel from GitHub. Ayad wants to understand every file.

## Stack
Next.js 16.4.6, React 19.3, TypeScript, Tailwind 4.3, npm. App Router, src/ dir.
Note: AGENTS.md says this Next.js has breaking changes; read node_modules/next/dist/docs/ before non-trivial Next code.

## Decisions
See decisions.md. Ayad chose the stack; Claude chose the file layout (approved plan).
- No paid API (Ayad, 2026-11-24). AI steps for future projects run offline in Claude Code; the site shows static results. The Readout's dormant /api/rewrite route is the one exception (off, never run against the live API).

## Done
- Scaffolded with create-next-app (run by Ayad).
- Placeholder content in src/data/content.ts; Hero, CaseStudies, CaseStudyCard, Projects, Contact components; page.tsx; layout metadata.
- npm run build passes.
- Public GitHub repo: https://github.com/ayadarif/portfolio (pushed 2026-11-24). Secrets audit clean: only .env.example tracked.
- Deployed on Vercel (Hobby): https://aaportfolio-delta.vercel.app . Live, returns 200, shows placeholder content. Auto-redeploys on push to main.

- Real copy in content.ts (intro, 3 case studies, 3 projects, contact). Results is now a list (string[]); CaseStudyCard renders bullets. Tab title: Ayad Arif | Product Manager.
- Experiment Readout stats module (2026-11-24): src/lib/stats.ts, 36 vitest tests (npm test), scripts/check_stats.py (scipy check, uses scripts/.venv). Run: python3 -m venv scripts/.venv && scripts/.venv/bin/pip install scipy && scripts/.venv/bin/python scripts/check_stats.py

- Experiment Readout UI (2026-11-24) at /experiment-readout: 3 steps (Setup, Results, Readout), 3 demos, verdict banner, 3 checks, stats table, SVG lift chart, placeholder for the written readout. Linked from Projects. 66 tests pass; build passes.
  - Files: src/lib/csv.ts (parser), readout.ts (form to numbers, one buildReadout call), demos.ts (seeded demos), src/components/readout/*. Chart is hand-written SVG (LiftChart.tsx), no chart library.
  - Regenerate fixtures after editing demos: node scripts/write_fixtures.ts (then npm test and the scipy check).
  - NOT checked by eye: no browser was available in the session, so the layout (phone width, dark mode, chart) was only verified through type check, build and server-render tests. Open the live URL on your phone first.

- Experiment Readout finish (2026-11-24): polish fixes (step numbers get list-none; clearer lift toggle with a live example; labels no longer run together; "Smallest lift" marked as needed for the underpowered check); rule-based written readout (src/lib/narrative.ts, shown under the verdict via WrittenReadout.tsx); AI rewrite layer built but OFF (src/app/api/rewrite/route.ts, src/lib/rewrite.ts, src/lib/validate-rewrite.ts; runs only if ANTHROPIC_API_KEY is set); "How this works" section (HowItWorks.tsx). 94 tests pass; build and lint pass. README and decisions.md updated.
  - NOT checked by eye: no browser available again. Check on your phone: step labels, lift toggle hint, label spacing, readout paragraph, How this works.
  - Route checked with curl: no key gives {"enabled":false}; fake key gives ok:false (fallback); junk payload 400; oversize 413. A real rewrite has never been run (no key).
- Review fix batch (2026-11-24): copy fixes in content.ts (intro, GrowthBook, Readout link via optional learnedLink, case study 3 wording, three new project entries); demo planned samples now match sampleSizePerVariant (clean win 12,242 at 11% lift, broken split 8,838 at 13%, early peek 40,286 at 6%; data unchanged, verdicts unchanged; guard test in readout.test.ts); README intro; no-paid-API decision; Open Graph metadata plus generated /opengraph-image (metadataBase is https://aaportfolio-delta.vercel.app, change it if a custom domain arrives). 97 tests pass; lint and build pass.
  - Early peek now also shows an amber "underpowered" check (MDE 0.71 pts vs 0.60 target). Intended; 7% target would remove it.
  - /experiment-readout has no openGraph of its own, so shared links to it show the home page title and image.
- Review fix batch 2 (2026-11-24): the browser now calls /api/rewrite only if build flag NEXT_PUBLIC_REWRITE_ENABLED is "true" (unset by default), so the tool makes zero network requests after load. Logic in src/lib/rewrite-client.ts, test in rewrite-client.test.ts; README and decisions.md updated; "runs in your browser" lines (page.tsx, ResultsStep.tsx, README) are true with the flag off. Copy: intro last sentence changed; Five-Minute Brief removed; "Feedback triage" is now "Feedback triage pipeline", status Planned. 101 tests, lint and build pass.
  - Not verified in a real browser. Check Network tab (see below) after Vercel redeploys.

## Next
0. Look at /experiment-readout on a phone. Before ever setting ANTHROPIC_API_KEY on Vercel: set a spend limit on the key, and read the README note on the rate limit.
1. Proofread copy on the live site; check phone view.
2. After Vercel redeploys, run the link through LinkedIn Post Inspector to check the preview card (LinkedIn caches).

## Open questions
- Real name/headline, site name, domain (skip paid domain for now).

## Preferences
Plain explanations, one concept at a time, short replies, no em dashes, ask before pushing.
